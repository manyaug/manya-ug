import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  hideBottomNav: false,
  hideGlobalHUD: false
};

export const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    setHideBottomNav: (state, action) => {
      state.hideBottomNav = action.payload;
    },
    setHideGlobalHUD: (state, action) => {
      state.hideGlobalHUD = action.payload;
    },
    resetLayout: (state) => {
      state.hideBottomNav = false;
      state.hideGlobalHUD = false;
    }
  }
});

export const { setHideBottomNav, setHideGlobalHUD, resetLayout } = layoutSlice.actions;

export default layoutSlice.reducer;
