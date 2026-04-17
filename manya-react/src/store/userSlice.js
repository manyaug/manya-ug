import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ManyaDB } from '../infrastructure/db/manyaDB.js';
import { syncService } from '../infrastructure/sync/syncService.js';

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
        // Merge cloud data into local structure
        const merged = {
            ...(localUser || ManyaDB.createDefaultRecord()),
            nickname: cloudProfile.full_name,
            xp: cloudProfile.xp,
            diamonds: cloudProfile.gems_overall,
            sstGems: cloudProfile.gems_sst,
            mathGems: cloudProfile.gems_math,
            englishGems: cloudProfile.gems_english,
            scienceGems: cloudProfile.gems_science,
            currentStreak: cloudProfile.streak_current,
            longestStreak: cloudProfile.streak_longest,
            onboarded: true // If they have a profile, they are onboarded
        };
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
    addXP: (state, action) => {
      state.data.xp += action.payload;
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
    // ── ECONOMY ─────────────────────────────────────────────────────────────
    awardGems: (state, action) => {
      const { subject, amount, xp } = action.payload;
      const gemKey = `${subject}Gems`;
      if (state.data[gemKey] !== undefined) {
        state.data[gemKey] += amount;
      }
      state.data.diamonds += Math.floor(amount / 2); // Bonus diamonds
      state.data.xp += xp;
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
      const { isCorrect, hintUsed, answerChanged, timeSpentMs } = action.payload;
      const s = state.session;

      s.questionsAnswered += 1;
      if (hintUsed) s.hintCount += 1;
      if (answerChanged) s.answerChangeCount += 1;

      if (isCorrect) {
        s.consecutiveWrong = 0;
        s.consecutiveCorrect += 1;
        s.frustrationLevel = Math.max(0, s.frustrationLevel - 5);
      } else {
        s.consecutiveCorrect = 0;
        s.consecutiveWrong += 1;
        s.frustrationLevel = Math.min(100, s.frustrationLevel + 15);
      }

      if (timeSpentMs > 30000) s.frustrationLevel = Math.min(100, s.frustrationLevel + 10);

      // Track matrix daily engagement
      if (timeSpentMs) {
          const today = new Date().toISOString().split('T')[0];
          if (!state.data.engagement_stats) state.data.engagement_stats = {};
          state.data.engagement_stats[today] = (state.data.engagement_stats[today] || 0) + timeSpentMs;
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
    addXP, 
    updateProfile, 
    completeOnboarding, 
    resetUser,
    awardGems,
    updateStreak,
    resetSession,
    updateSessionAfterAnswer
} = userSlice.actions;

export default userSlice.reducer;
