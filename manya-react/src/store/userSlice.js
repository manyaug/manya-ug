import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ManyaDB } from '../utils/manyaDB';
import { syncService } from '../services/syncService';

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
      ManyaDB.saveUser(state.data);
    },
    resetUser: (state) => {
        state.data = ManyaDB.createDefaultRecord();
        state.data.onboarded = false;
        ManyaDB.saveUser(state.data);
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

export const { addDiamonds, addXP, updateProfile, completeOnboarding, resetUser } = userSlice.actions;

// Create a middleware to sync changes to ManyaDB automatically
export const persistenceMiddleware = store => next => action => {
  const result = next(action);
  
  // if the action is modifying the user...
  if (action.type?.startsWith('user/') && action.type !== 'user/initialize/pending') {
      const state = store.getState();
      if (!state.user.isLoading && state.user.data) {
          // Fire and forget save to IndexedDB
          ManyaDB.saveUser(state.user.data).catch(console.error);
      }
  }
  return result;
};

export default userSlice.reducer;
