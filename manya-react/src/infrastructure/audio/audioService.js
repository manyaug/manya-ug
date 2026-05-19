import { getSfx } from '../../config/assetUrls';

class AudioService {
    constructor() {
        this._lastPlayed = {};
        this.cachedSfx = {};
        
        // PROGRESSIVE PRELOADING: 
        // To avoid competing with background ambient soundtrack buffers and visual assets 
        // at application startup, we wait 3 seconds before preloading the core UI click sounds.
        if (typeof window !== 'undefined') {
            setTimeout(() => {
                this.preloadCoreSFX();
            }, 3000);
        }
    }

    /**
     * Preloads core interface feedback sounds progressively.
     */
    preloadCoreSFX() {
        const core = ['tap', 'click', 'pop', 'whoosh'];
        core.forEach(name => {
            try {
                if (!this.cachedSfx[name]) {
                    const url = getSfx(name);
                    const audio = new Audio(url);
                    audio.preload = 'auto';
                    this.cachedSfx[name] = audio;
                }
            } catch (e) {}
        });
    }

    /**
     * Safely reads the user's active audio preferences from localStorage.
     */
    getAudioPreferences() {
        if (typeof window === 'undefined') return { volume: 0.5, isMuted: false };
        try {
            const saved = localStorage.getItem('manya_audio_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    volume: typeof parsed.volume === 'number' ? parsed.volume : 0.5,
                    isMuted: !!parsed.isMuted
                };
            }
        } catch (e) {}
        return { volume: 0.5, isMuted: false };
    }

    /**
     * Core sound play engine.
     * Respects master volume levels, ignores playback if muted, and utilizes lazy-cached elements.
     */
    playSFX(name) {
        if (typeof window === 'undefined') return;

        // 1. Fetch user sound configuration (Mute & Volume Calibration)
        const prefs = this.getAudioPreferences();
        if (prefs.isMuted) return; // Silent execution 🔇

        // 2. Prevent fast duplicate sound spams
        const isHighPrestige = name === 'applause' || name === 'victory' || name === 'challenge_win' || name === 'epic';
        const isVoice = name.includes('/') || name.startsWith('correct') || name.startsWith('wrong') || name.startsWith('quest_complete');
        
        const now = Date.now();
        if (!isHighPrestige && !isVoice && this._lastPlayed[name] && (now - this._lastPlayed[name] < 220)) {
            return; // Throttle sound spam
        }
        this._lastPlayed[name] = now;

        const url = getSfx(name);
        console.log(`[AudioService] Playing SFX: ${name} -> ${url}`);

        // 3. Dynamic Volume Amplification:
        // SFX need to be punchy and clear. Scale the volume setting to give it optimal presence, 
        // while strictly honoring the slider adjustments and muting!
        const baseVolume = prefs.volume ?? 0.5;
        const targetVolume = Math.min(1.0, baseVolume * 1.8);

        // 4. Retrieve or dynamically allocate/cache Audio object lazily
        let sound = this.cachedSfx[name];
        if (!sound) {
            try {
                sound = new Audio(url);
                sound.preload = 'auto';
                this.cachedSfx[name] = sound; // Cache for subsequent plays
            } catch (e) {
                console.error(`[AudioService] Failed to create Audio instance:`, e.message);
                return;
            }
        }

        // 5. Reset playhead and trigger playback cleanly
        try {
            sound.currentTime = 0;
            sound.volume = targetVolume;
            
            const playPromise = sound.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.debug(`[AudioService] Playback deferred or interrupted for '${name}':`, err.message);
                    // Fallback trees
                    if (name === 'magic_positive') this.playSFX('bonus');
                    else if (name === 'victory') this.playSFX('challenge_win');
                });
            }
        } catch (e) {
            console.warn(`[AudioService] Playback failed for '${name}':`, e.message);
        }
    }

    _playRandomFromFolder(folder, files) {
        const randomFile = files[Math.floor(Math.random() * files.length)];
        this.playSFX(`${folder}/${randomFile}`);
    }

    playCorrectVoice(specificName) {
        const files = [
            'Amazing', 'Awesome', 'Bam', 'Bravo', 'Champion',
            'Correct', 'Epic', 'Great', 'Super', 'Well Done',
            'Wow', 'You are Sharp'
        ];
        const selected = specificName || files[Math.floor(Math.random() * files.length)];
        this.playSFX(`correct/${selected}`);
        return selected;
    }

    playWrongVoice() {
        const files = [
            'Almost There', 'error-mistake', 'error-mistake2',
            'Getting Better', 'Good Try', 'hehe', 'Keep Going',
            'One More Try', 'Try Again'
        ];
        this._playRandomFromFolder('wrong', files);
    }

    playQuestCompleteVoice() {
        const files = [
            'Champ', 'Full Marks', 'Genius', 'Nailed It',
            'Proud Of You', 'Strong Work', 'Unstoppable'
        ];
        this._playRandomFromFolder('quest_complete', files);
    }

    correct() {
        this.playSFX('correct');
    }

    wrong() {
        this.playSFX('wrong');
    }

    finish() {
        this.playSFX('victory');
        setTimeout(() => this.playQuestCompleteVoice(), 600);
    }

    click() { this.playSFX('tap'); }
    whoosh() { this.playSFX('whoosh'); }
    pop() { this.playSFX('pop'); }
    tap() { this.playSFX('tap'); }
    victory() { this.finish(); }
    error() { this.wrong(); }
    success() { this.correct(); }
}

export const audioService = new AudioService();
