import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import { persistenceMiddleware } from './middleware/persistenceMiddleware';
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
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false
    }).concat(persistenceMiddleware, audioPersistenceMiddleware)
});

export default store;
