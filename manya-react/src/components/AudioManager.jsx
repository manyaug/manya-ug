import { useEffect, useRef, useCallback } from 'react';
import { audioService } from '../infrastructure/audio/audioService.js';
import { useSelector } from 'react-redux';
import { AUDIO, getSfx } from '../config/assetUrls';

/**
 * AudioManager - Central component for all sound and music.
 * It lives at the root of the app and reacts to Redux state changes.
 */
export default function AudioManager() {
  const { volume, isMuted, ambientMode, isRainy } = useSelector((state) => state.audio);
  const theme = useSelector((state) => state.user.data?.theme || 'light');

  // Audio References (backed by Supabase Storage CDN)
  const dayTrack = useRef(new Audio(AUDIO.day));
  const nightTrack = useRef(new Audio(AUDIO.night));
  const rainTrack = useRef(new Audio(AUDIO.rain));

  // Initial Setup
  useEffect(() => {
    const tracks = [dayTrack.current, nightTrack.current, rainTrack.current];
    tracks.forEach(track => {
      track.loop = true;
      track.volume = 0;
      
      // ─── ERROR SUPPRESSION (v3.8) ───
      // Suppress ERR_QUIC_PROTOCOL_ERROR logs which appear as red 'X' in console.
      // These are often transient or related to Supabase storage behavior.
      track.onerror = (e) => {
          // Log as warning instead of allowing it to become a fatal browser error
          console.warn(`🎧 [AudioManager] Ambient track throttled or load failed (handled):`, track.src);
      };
    });

    return () => {
      tracks.forEach(t => t.pause());
    };
  }, []); // Run once on mount

  // Handle Global Volume / Mute
  useEffect(() => {
    const effectiveVolume = isMuted ? 0 : volume;
    
    // Day Track
    if (dayTrack.current) {
        const targetDay = (ambientMode === 'day' || (ambientMode !== 'night' && theme !== 'dark')) ? effectiveVolume * 0.3 : 0;
        fadeVolume(dayTrack.current, targetDay);
    }

    // Night Track
    if (nightTrack.current) {
        const targetNight = (ambientMode === 'night' || (ambientMode !== 'day' && theme === 'dark')) ? effectiveVolume * 0.3 : 0;
        fadeVolume(nightTrack.current, targetNight);
    }

    // Rain Track
    if (rainTrack.current) {
        const targetRain = isRainy ? effectiveVolume * 0.4 : 0;
        fadeVolume(rainTrack.current, targetRain);
    }
  }, [volume, isMuted, ambientMode, isRainy, theme]);

  // Self-Correction: Audio playback must start after user interaction
  useEffect(() => {
    const startAudio = () => {
        dayTrack.current.play().catch(() => {});
        nightTrack.current.play().catch(() => {});
        rainTrack.current.play().catch(() => {});
        window.removeEventListener('click', startAudio);
        window.removeEventListener('keydown', startAudio);
    };

    window.addEventListener('click', startAudio);
    window.addEventListener('keydown', startAudio);
    return () => {
        window.removeEventListener('click', startAudio);
        window.removeEventListener('keydown', startAudio);
    };
  }, []);

  return null; // Side-effect only component
}

/**
 * Smoothly crossfades volume using requestAnimationFrame
 */
function fadeVolume(audio, target, duration = 1000) {
  if (!audio) return;
  const start = audio.volume;
  const diff = target - start;
  if (Math.abs(diff) < 0.01) {
      audio.volume = target;
      return;
  }
  
  const startTime = performance.now();
  const tick = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const nextVol = start + (diff * progress);
    audio.volume = Math.max(0, Math.min(1, nextVol));

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}
