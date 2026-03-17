import { configureStore } from '@reduxjs/toolkit';
import userReducer, { persistenceMiddleware } from './userSlice';
import toastReducer from './toastSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    toast: toastReducer
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(persistenceMiddleware)
});

export default store;
