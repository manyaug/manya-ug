import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';

/**
 * AudioManager - Central component for all sound and music.
 * It lives at the root of the app and reacts to Redux state changes.
 */
export default function AudioManager() {
  const { volume, isMuted, ambientMode, isRainy } = useSelector((state) => state.audio);
  const theme = useSelector((state) => state.user.data?.theme || 'light');

  // Audio References
  const dayTrack = useRef(new Audio('/assets/shared/audios/day.mp3'));
  const nightTrack = useRef(new Audio('/assets/shared/audios/night.mp3'));
  const rainTrack = useRef(new Audio('/assets/shared/audios/rain.mp3'));

  // Initial Setup
  useEffect(() => {
    const tracks = [dayTrack.current, nightTrack.current, rainTrack.current];
    tracks.forEach(track => {
      track.loop = true;
      track.volume = 0;
    });

    // Expose global SFX trigger for legacy engines and functional components
    window.ManyaAudio = {
      playSFX: (name) => {
        const sound = new Audio(`/assets/shared/audios/${name}.mp3`);
        sound.volume = isMuted ? 0 : volume;
        sound.play().catch(() => {});
      },
      // Convenience aliases
      correct: () => window.ManyaAudio.playSFX('collect-points'),
      wrong:   () => window.ManyaAudio.playSFX('error-mistake'),
      finish:  () => window.ManyaAudio.playSFX('applause'),
      click:   () => window.ManyaAudio.playSFX('ui-click'),
      whoosh:  () => window.ManyaAudio.playSFX('whoosh'),
    };

    return () => {
      tracks.forEach(t => t.pause());
      delete window.ManyaAudio;
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
