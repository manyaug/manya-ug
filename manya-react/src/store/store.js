import { configureStore } from '@reduxjs/toolkit';
import userReducer, { persistenceMiddleware } from './userSlice';
import toastReducer from './toastSlice';
import audioReducer, { audioPersistenceMiddleware, getPersistedAudioState } from './audioSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    toast: toastReducer,
    audio: audioReducer
  },
  preloadedState: {
    audio: getPersistedAudioState() || undefined
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(persistenceMiddleware, audioPersistenceMiddleware)
});

export default store;
