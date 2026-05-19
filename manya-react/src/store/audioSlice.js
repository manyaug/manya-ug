import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  volume: 0.5,
  isMuted: false,
  ambientMode: 'day', // 'day' | 'night' | 'none'
  isRainy: false,
  isNightMode: false, // New: local visual toggle for Spiral/QuestPath
};

export const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    setVolume: (state, action) => {
      state.volume = action.payload;
    },
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },
    setAmbientMode: (state, action) => {
      state.ambientMode = action.payload;
    },
    setRainy: (state, action) => {
      state.isRainy = action.payload;
    },
    setNightMode: (state, action) => {
      state.isNightMode = action.payload;
    },
  }
});

export const { setVolume, toggleMute, setAmbientMode, setRainy, setNightMode } = audioSlice.actions;

// Persistence middleware for audio
export const audioPersistenceMiddleware = store => next => action => {
  const result = next(action);
  if (action.type?.startsWith('audio/')) {
    const state = store.getState().audio;
    localStorage.setItem('manya_audio_settings', JSON.stringify({
      volume: state.volume,
      isMuted: state.isMuted
    }));
  }
  return result;
};

// Selection helper to load initial state
export const getPersistedAudioState = () => {
    const saved = localStorage.getItem('manya_audio_settings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return {
                ...initialState,
                ...parsed
            };
        } catch (e) {}
    }
    return null;
};

export default audioSlice.reducer;
