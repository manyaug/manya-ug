import { createSlice } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ManyaDB } from '../infrastructure/db/manyaDB.js';
import { syncService } from '../infrastructure/sync/syncService.js';
import { restoreCloudProgress } from '../domain/progress/questProgressService.js';
import { conceptMasteryService } from '../domain/mastery/conceptMasteryService.js';
import { BADGES } from '../config/badges';
import { rewardService } from '../infrastructure/services/rewardService.js';
import { challengeService } from '../domain/gamification/challengeService.js';

// Async thunk to boot user from IndexedDB
export const initializeUser = createAsyncThunk(
  'user/initialize',
  async () => {
    // 1. Try Cloud Pull first
    const cloudProfile = await syncService.pullProfile();
    const cloudProgress = await syncService.pullProgress();
    const cloudVault = await syncService.pullVault();
    const cloudBalance = await syncService.fetchUserBalance();
    
    if (cloudProgress) {
        restoreCloudProgress(cloudProgress);
        console.log("☁️ [Sync] Progress restored from Supabase.");
        
        // 🧠 Also pull granular concept mastery for all subjects
        const subjects = ['science', 'math', 'sst', 'english'];
        for (const sub of subjects) {
            conceptMasteryService.pullFromCloud(sub).catch(e => 
                console.warn(`[Sync] Failed to pull ${sub} mastery:`, e.message)
            );
        }
    }
    
    // 2. Fetch local as fallback/merge
    let localUser = await ManyaDB.getCurrentUser();
    
    // 3. Robust Session Check: If no cloud profile, ensure we at least have the UID from Auth
    const activeUid = await syncService.getUserId();

    if (cloudProfile) {
        console.log("☁️ [Sync] Profile restored from Supabase.");
        const merged = {
            ...(localUser || ManyaDB.createDefaultRecord()),
            uid: activeUid, 
            id: cloudProfile.id, // Primary key for Supabase relational tables
            nickname: cloudProfile.full_name,
            // START FRESH: Ignore old engagement_stats, use new user_balances
            diamonds: cloudBalance?.gem_overall || 0,
            coins: cloudBalance?.coins || 0,
            mathGems: cloudBalance?.gem_math || 0,
            scienceGems: cloudBalance?.gem_science || 0,
            englishGems: cloudBalance?.gem_english || 0,
            sstGems: cloudBalance?.gem_sst || 0,
            
            stats_quests_completed: localUser?.stats_quests_completed || 0,
            math_correct: Math.max(localUser?.math_correct || 0, cloudProfile.math_correct || 0),
            science_correct: Math.max(localUser?.science_correct || 0, cloudProfile.science_correct || 0),
            english_correct: Math.max(localUser?.english_correct || 0, cloudProfile.english_correct || 0),
            sst_correct: Math.max(localUser?.sst_correct || 0, cloudProfile.sst_correct || 0),
            is_pro: cloudProfile.is_pro || false,
            learning_type: cloudProfile.learning_type || 'ADAPTIVE',
            parent_name: cloudProfile.parent_name || '',
            parent_whatsapp: cloudProfile.parent_whatsapp || '',
            parent_pin_hash: cloudProfile.parent_pin_hash || '',
            report_enabled: cloudProfile.report_enabled !== undefined ? cloudProfile.report_enabled : true,
            unlockedBadges: Array.from(new Set([
                ...(localUser?.unlockedBadges || []), 
                ...(cloudProfile.unlocked_badges || [])
            ])),
            vaultArtifacts: Array.from(new Set([
                ...(localUser?.vaultArtifacts || []),
                ...(cloudVault || [])
            ])),
            pendingChests: await rewardService.fetchPendingChests(cloudProfile.id),
            onboarded: cloudProfile.onboarded || false
        };

        // 🏺 SILENT ACHIEVEMENT CATCH-UP
        const allUnlocked = new Set(merged.unlockedBadges);
        BADGES.forEach(badge => {
            try {
                if (badge.check && badge.check(merged)) {
                    allUnlocked.add(badge.id);
                }
            } catch(e) {}
        });
        merged.unlockedBadges = Array.from(allUnlocked);

        await ManyaDB.saveUser(merged);
        return merged;
    }

    if (!localUser) {
      localUser = ManyaDB.createDefaultRecord();
      localUser.uid = activeUid; // Bind the auth session
      await ManyaDB.saveUser(localUser);
    } else if (activeUid && !localUser.uid) {
        localUser.uid = activeUid;
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
    // Save to LocalDB (IndexedDB) — this MUST succeed
    await ManyaDB.saveUser(profileData);
    // Push to Cloud (Supabase) — fire-and-forget, never crash the UI
    try {
      await syncService.uploadProfile(profileData);
    } catch (e) {
      console.warn('☁️ [Sync] Cloud push failed (non-fatal):', e.message);
    }
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

/**
 * TRANSACTIONAL ECONOMY THUNK (Phase 1 🏦)
 * Handles dual-write to Local Redux + Cloud Ledger
 */
export const updateBalanceThunk = createAsyncThunk(
    'user/updateBalance',
    async ({ currency, amount, type, contextId }, { dispatch }) => {
        // 1. Instant UI update via reducer
        if (currency === 'coins') {
            if (amount >= 0) {
                dispatch(userSlice.actions.awardCoins(amount));
            } else {
                dispatch(userSlice.actions.deductCoins(Math.abs(amount)));
            }
        } else if (currency.includes('gem')) {
            const subject = currency.replace('gem_', '');
            dispatch(userSlice.actions.awardGems({ subject, amount }));
        }

        // 2. Persistent Cloud Ledger update
        try {
            await syncService.updateBalance(currency, amount, type, contextId);
        } catch (e) {
            console.error('💰 [Economy] Cloud sync failed:', e.message);
        }
    }
);

/**
 * LOOT SYSTEM THUNK (Phase 2 🎁)
 * Opens a chest and updates the ledger.
 */
export const openChestThunk = createAsyncThunk(
    'user/openChest',
    async ({ chestId }, { dispatch }) => {
        try {
            const { rewards } = await rewardService.openChest(chestId);
            
            // Apply rewards to local state
            for (const r of rewards) {
                if (r.type === 'coins') {
                    dispatch(userSlice.actions.awardCoins(r.amount));
                } else if (r.type === 'gems') {
                    dispatch(userSlice.actions.awardGems({ subject: r.subject || 'master', amount: r.amount }));
                }
            }
            
            return { chestId, rewards };
        } catch (e) {
            console.error('❌ [Loot] Failed to open chest:', e.message);
            throw e;
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
    question_history: [],
  },
  isLoading: true,
  isError: false,
};

/**
 * VAULT DISCOVERY THUNK (Phase 4 🏺)
 * Syncs discovered artifacts to the cloud vault table.
 */
export const discoverArtifactThunk = createAsyncThunk(
    'user/discoverArtifact',
    async (artifact, { getState, dispatch }) => {
        const state = getState().user.data;
        
        // 🛡️ VALIDATION: Only allow STUDY/SIMULATION types in the vault
        // No MCQs, Quizzes, or interactive questions should be vaulted.
        const allowedTypes = ['note', 'recap', 'study_sim', 'simulation', 'artifact'];
        if (!allowedTypes.includes(artifact.type)) {
            console.log(`🚫 [Vault] Skipping non-study artifact type: ${artifact.type}`);
            return;
        }

        // 🛡️ DE-DUPLICATION: Don't record if already discovered
        const exists = state.vaultArtifacts?.some(a => a.id === artifact.id);
        if (exists) {
            console.debug(`🏺 [Vault] Artifact already exists: ${artifact.id}`);
            return;
        }

        // 1. Sync to Cloud
        try {
            await syncService.pushVault(artifact.id, artifact.subject || 'overall');
        } catch (e) {
            console.warn('🏺 [Vault] Cloud sync failed:', e.message);
        }
        
        // 2. Update Redux (Local State)
        dispatch(userSlice.actions.discoverArtifact(artifact));
    }
);

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    addDiamonds: (state, action) => {
      state.data.diamonds = (state.data.diamonds || 0) + action.payload;
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
      const s = subject?.toLowerCase();
      
      // Map 'general', 'master', or null to the global 'diamonds' balance
      if (!s || s === 'general' || s === 'master' || s === 'overall') {
          state.data.diamonds = (state.data.diamonds || 0) + amount;
      } else {
          const gemKey = `${s}Gems`;
          if (state.data[gemKey] !== undefined) {
            state.data[gemKey] += amount;
          } else {
            // Fallback to diamonds if subject key is missing
            state.data.diamonds = (state.data.diamonds || 0) + amount;
          }
      }
    },
    // Award coins (Manya soft currency)
    awardCoins: (state, action) => {
      state.data.coins = (state.data.coins || 0) + action.payload;
    },
    // Increment quest count
    incrementQuestCount: (state) => {
        state.data.stats_quests_completed = (state.data.stats_quests_completed || 0) + 1;
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

        // 🏆 Challenge: Check streak milestones moved to thunk or engine
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
      
      // 📝 Track Question History for Session Sync
      s.question_history.push({
          questionId: action.payload.questionId,
          subject: subject,
          isCorrect: isCorrect,
          timeSpentMs: timeSpentMs,
          timestamp: new Date().toISOString()
      });

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

        // 🧪 REMEDIATION: Track errors in specialized table
        if (subject && action.payload.questionId) {
            syncService.trackConceptError(`${subject}::${action.payload.topic || 'general'}`, action.payload.questionId);
        }
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
    incrementQuestCount,
    deductCoins,
    unlockBadge,
    dismissBadgeCelebration,
    dropChest,
    dismissChest,
    updateStreak,
    resetSession,
    updateSessionAfterAnswer,
    discoverArtifact: discoverArtifactLocal
} = userSlice.actions;

// Re-export thunks as primary actions
export const checkAchievements = checkAchievementsThunk;
export const discoverArtifact = discoverArtifactThunk;

export default userSlice.reducer;
