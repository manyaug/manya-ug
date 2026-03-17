import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ManyaDB } from '../utils/manyaDB';

// Async thunk to boot user from IndexedDB
export const initializeUser = createAsyncThunk(
  'user/initialize',
  async () => {
    let user = await ManyaDB.getCurrentUser();
    if (!user) {
      user = ManyaDB.createDefaultRecord();
    }
    return user;
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

export const { addDiamonds, addXP, updateProfile, completeOnboarding } = userSlice.actions;

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
