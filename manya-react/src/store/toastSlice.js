import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  toasts: [] // array of { id, message, type }
};

export const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    addToast: (state, action) => {
      // payload format: { message: "msg", type: "success|error|info" }
      const newToast = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        message: action.payload.message,
        type: action.payload.type || 'info'
      };
      state.toasts.push(newToast);
    },
    removeToast: (state, action) => {
      // payload: internal ID of the toast
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    }
  }
});

export const { addToast, removeToast } = toastSlice.actions;

export default toastSlice.reducer;
