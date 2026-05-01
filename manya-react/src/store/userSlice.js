import { createSlice } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ManyaDB } from '../infrastructure/db/manyaDB.js';
import { syncService } from '../infrastructure/sync/syncService.js';
import { BADGES } from '../config/badges';

// Async thunk to boot user from IndexedDB
export const initializeUser = createAsyncThunk(
  'user/initialize',
  async () => {
    // 1. Try Cloud Pull first
    const cloudProfile = await syncService.pullProfile();
    
    // 2. Fetch local as fallback/merge
    let localUser = await ManyaDB.getCurrentUser();
    
    if (cloudProfile) {
        console.log("☁️ [Sync] Profile restored from Supabase.");
        const merged = {
            ...(localUser || ManyaDB.createDefaultRecord()),
            nickname: cloudProfile.full_name,
            diamonds: cloudProfile.gems_overall || 0,
            math_correct: Math.max(localUser?.math_correct || 0, cloudProfile.math_correct || 0),
            science_correct: Math.max(localUser?.science_correct || 0, cloudProfile.science_correct || 0),
            english_correct: Math.max(localUser?.english_correct || 0, cloudProfile.english_correct || 0),
            sst_correct: Math.max(localUser?.sst_correct || 0, cloudProfile.sst_correct || 0),
            is_pro: cloudProfile.is_pro || false,
            learning_type: cloudProfile.learning_type || 'ADAPTIVE',
            unlockedBadges: Array.from(new Set([
                ...(localUser?.unlockedBadges || []), 
                ...(cloudProfile.unlocked_badges || [])
            ])),
            vaultArtifacts: Array.from(new Set([
                ...(localUser?.vaultArtifacts || []),
                ...(cloudProfile.vault_artifacts || [])
            ])),
            onboarded: true 
        };

        // 🏺 SILENT ACHIEVEMENT CATCH-UP
        // This prevents "Badge Floods" where the user logs in and gets 50 modals at once.
        // We calculate what they SHOULD have unlocked based on restored stats.
        const allUnlocked = new Set(merged.unlockedBadges);
        BADGES.forEach(badge => {
            try {
                if (badge.check && badge.check(merged)) {
                    allUnlocked.add(badge.id);
                }
            } catch(e) {}
        });
        merged.unlockedBadges = Array.from(allUnlocked);

        // Update local cache
        await ManyaDB.saveUser(merged);
        return merged;
    }

    if (!localUser) {
      localUser = ManyaDB.createDefaultRecord();
      await ManyaDB.saveUser(localUser);
    }
    return localUser;
  }
);

// Async thunk to push state to persistence layers
export const syncUserData = createAsyncThunk(
  'user/sync',
  async (_, { getState }) => {
    const profileData = getState().user.data;
    // Save to LocalDB (IndexedDB)
    await ManyaDB.saveUser(profileData);
    // Push to Cloud (Supabase)
    await syncService.uploadProfile(profileData);
    return profileData;
  }
);



// New: Check and sync achievements (Async Thunk for guaranteed sequence)
export const checkAchievementsThunk = createAsyncThunk(
    'user/checkAchievements',
    async (_, { getState, dispatch }) => {
        const state = getState().user.data;
        const newlyUnlocked = [];

        BADGES.forEach(badge => {
            if (!state.unlockedBadges?.includes(badge.id)) {
                try {
                    if (badge.check && badge.check(state)) {
                        newlyUnlocked.push(badge);
                    }
                } catch (e) {}
            }
        });

        for (const badge of newlyUnlocked) {
            // 1. Sync to Cloud
            await syncService.pushBadge({
                id: badge.id,
                name: badge.name,
                earnedAt: new Date().toISOString()
            });
            // 2. Unlock in Redux
            dispatch(userSlice.actions.unlockBadge(badge.id));
            console.log(`🏅 [Badge] UNLOCKED & SYNCED: ${badge.name}`);
        }
    }
);

const initialState = {
  data: ManyaDB.createDefaultRecord(),
  session: {
    startedAt: null,
    frustrationLevel: 0,
    confidenceLevel: 70,
    consecutiveWrong: 0,
    consecutiveCorrect: 0,
    questionsAnswered: 0,
    hintCount: 0,
    answerChangeCount: 0,
  },
  isLoading: true,
  isError: false,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    addDiamonds: (state, action) => {
      state.data.diamonds += action.payload;
    },
    updateProfile: (state, action) => {
      state.data = { ...state.data, ...action.payload };
    },
    completeOnboarding: (state) => {
      state.data.onboarded = true;
    },
    resetUser: (state) => {
        state.data = ManyaDB.createDefaultRecord();
        state.data.onboarded = false;
    },
    // ── KNOWLEDGE VAULT ───────────────────────────────────────────────────
    discoverArtifact: (state, action) => {
      const art = action.payload; // { id, type, title, subject, data }
      if (!state.data.vaultArtifacts) state.data.vaultArtifacts = [];
      
      const exists = state.data.vaultArtifacts.some(a => a.id === art.id);
      if (!exists) {
        state.data.vaultArtifacts.push({
          ...art,
          discoveredAt: new Date().toISOString()
        });
      }
    },
    // ── ECONOMY ─────────────────────────────────────────────────────────────
    awardGems: (state, action) => {
      const { subject, amount } = action.payload;
      const gemKey = `${subject}Gems`;
      if (state.data[gemKey] !== undefined) {
        state.data[gemKey] += amount;
      }
      state.data.diamonds += Math.floor(amount / 2); // Bonus diamonds
    },
    // Award coins (Manya soft currency)
    awardCoins: (state, action) => {
      state.data.coins = (state.data.coins || 0) + action.payload;
    },
    // Deduct coins (quest skip, store purchase)
    deductCoins: (state, action) => {
      state.data.coins = Math.max(0, (state.data.coins || 0) - action.payload);
    },
    // ── BADGE SYSTEM ──────────────────────────────────────────────────────
    unlockBadge: (state, action) => {
        const badgeId = action.payload;
        if (!state.data.unlockedBadges) state.data.unlockedBadges = [];
        if (!state.data.unlockedBadges.includes(badgeId)) {
            state.data.unlockedBadges.push(badgeId);
            if (!state.data.pendingBadgeCelebrations) state.data.pendingBadgeCelebrations = [];
            state.data.pendingBadgeCelebrations.push(badgeId);
        }
    },
    dismissBadgeCelebration: (state) => {
        if (state.data.pendingBadgeCelebrations?.length > 0) {
            state.data.pendingBadgeCelebrations.shift();
        }
    },
    // ── CHEST SYSTEM ──────────────────────────────────────────────────────
    dropChest: (state, action) => {
        if (!state.data.pendingChests) state.data.pendingChests = [];
        // Prevent exact duplicate chests for the same reason within the same session
        const exists = state.data.pendingChests.some(c => c.reason === action.payload.reason && c.chestType === action.payload.chestType);
        if (!exists) {
            state.data.pendingChests.push(action.payload); // { chestType, rewards, reason }
        }
    },
    dismissChest: (state) => {
        if (state.data.pendingChests?.length > 0) {
            state.data.pendingChests.shift();
        }
    },
    // ── STREAK ──────────────────────────────────────────────────────────────
    updateStreak: (state) => {
        const today = new Date().toDateString();
        const lastStr = state.data.last_active_at ? new Date(state.data.last_active_at).toDateString() : null;
        if (lastStr === today) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (lastStr === yesterdayStr) {
            state.data.current_streak = (state.data.current_streak || 0) + 1;
        } else {
            state.data.current_streak = 1;
        }

        state.data.longest_streak = Math.max(state.data.longest_streak || 0, state.data.current_streak);
        state.data.last_active_at = new Date().toISOString();
    },
    // ── SESSION ─────────────────────────────────────────────────────────────
    resetSession: (state) => {
      state.session = {
        ...initialState.session,
        startedAt: new Date().toISOString()
      };
    },
    updateSessionAfterAnswer: (state, action) => {
      const { subject, isCorrect, hintUsed, answerChanged, timeSpentMs } = action.payload;
      const s = state.session;
      const d = state.data;

      s.questionsAnswered += 1;
      if (hintUsed) {
          s.hintCount += 1;
          d.stats_hints_used = (d.stats_hints_used || 0) + 1;
      }
      if (answerChanged) s.answerChangeCount += 1;

      if (isCorrect) {
        s.consecutiveWrong = 0;
        s.consecutiveCorrect += 1;
        s.frustrationLevel = Math.max(0, s.frustrationLevel - 5);
        
        // --- 🎯 BADGE TRACKING ---
        if (subject) {
            const key = `${subject.toLowerCase()}_correct`;
            d[key] = (d[key] || 0) + 1;
        }
        if (!hintUsed && !answerChanged) {
            d.stats_perfect_answers = (d.stats_perfect_answers || 0) + 1;
        }
      } else {
        s.consecutiveCorrect = 0;
        s.consecutiveWrong += 1;
        s.frustrationLevel = Math.min(100, s.frustrationLevel + 15);
        d.stats_explanations_viewed = (d.stats_explanations_viewed || 0) + 1;
      }

      if (timeSpentMs > 30000) s.frustrationLevel = Math.min(100, s.frustrationLevel + 10);

      // Track matrix daily engagement
      if (timeSpentMs) {
          const today = new Date().toISOString().split('T')[0];
          if (!d.engagement_stats) d.engagement_stats = {};
          d.engagement_stats[today] = (d.engagement_stats[today] || 0) + timeSpentMs;
      }
    }
  },
  extraReducers: (builder) => {

    builder
      .addCase(initializeUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
      })
      .addCase(initializeUser.rejected, (state) => {
        state.isLoading = false;
        state.isError = true;
      });
  }
});

export const { 
    addDiamonds, 
    updateProfile, 
    completeOnboarding, 
    resetUser,
    awardGems,
    awardCoins,
    deductCoins,
    unlockBadge,
    dismissBadgeCelebration,
    dropChest,
    dismissChest,
    updateStreak,
    resetSession,
    updateSessionAfterAnswer,
    discoverArtifact
} = userSlice.actions;

// Re-export thunk as the main achievement checker
export const checkAchievements = checkAchievementsThunk;

export default userSlice.reducer;
