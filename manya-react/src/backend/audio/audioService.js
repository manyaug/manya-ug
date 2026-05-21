/**
 * MANYA AUDIO SERVICE  (Backend Layer)
 * ========================================
 * Handles sound effect loading and playback.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  ANDROID DEVELOPER — AUDIO FILES                                            │
 * │                                                                              │
 * │  Audio files are referenced via getSfx(name) which resolves to CDN URLs.   │
 * │  On Android, these should resolve to bundled assets or downloaded files:    │
 * │                                                                              │
 * │  Implement window.ManyaBackend.files.getAssetUrl(path) to return:           │
 * │    file:///android_asset/audio/sfx/{name}.mp3                              │
 * │    or: content://... for internal storage                                   │
 * │                                                                              │
 * │  Audio preference key stored as 'manya_audio_settings' in kv store:        │
 * │    { volume: 0.5, isMuted: false }                                         │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

import { getSfx } from '../../config/assetUrls.js';

class AudioService {
    constructor() {
        this._lastPlayed = {};
        this.cachedSfx = {};
        if (typeof window !== 'undefined') {
            setTimeout(() => this.preloadCoreSFX(), 3000);
        }
    }

    preloadCoreSFX() {
        const core = ['tap', 'click', 'pop', 'whoosh'];
        core.forEach(name => {
            try {
                if (!this.cachedSfx[name]) {
                    const audio = new Audio(getSfx(name));
                    audio.preload = 'auto';
                    this.cachedSfx[name] = audio;
                }
            } catch (e) {}
        });
    }

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

    playSFX(name) {
        if (typeof window === 'undefined') return;
        const prefs = this.getAudioPreferences();
        if (prefs.isMuted) return;

        const isHighPrestige = ['applause','victory','challenge_win','epic'].includes(name);
        const isVoice = name.includes('/') || name.startsWith('correct') || name.startsWith('wrong') || name.startsWith('quest_complete');
        const now = Date.now();
        if (!isHighPrestige && !isVoice && this._lastPlayed[name] && (now - this._lastPlayed[name] < 220)) return;
        this._lastPlayed[name] = now;

        const url = getSfx(name);
        const baseVolume = prefs.volume ?? 0.5;
        const targetVolume = Math.min(1.0, baseVolume * 1.8);

        let sound = this.cachedSfx[name];
        if (!sound) {
            try { sound = new Audio(url); sound.preload = 'auto'; this.cachedSfx[name] = sound; }
            catch (e) { return; }
        }

        try {
            sound.currentTime = 0;
            sound.volume = targetVolume;
            const playPromise = sound.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    try {
                        const freshSound = new Audio(url);
                        freshSound.volume = targetVolume;
                        freshSound.play().catch(() => {});
                        this.cachedSfx[name] = freshSound;
                    } catch (healErr) {}
                    if (name === 'magic_positive') this.playSFX('bonus');
                    else if (name === 'victory') this.playSFX('challenge_win');
                });
            }
        } catch (e) {}
    }

    _playRandomFromFolder(folder, files) {
        this.playSFX(`${folder}/${files[Math.floor(Math.random() * files.length)]}`);
    }

    playCorrectVoice(specificName) {
        const files = ['Amazing','Awesome','Bam','Bravo','Champion','Correct','Epic','Great','Super','Well Done','Wow','You are Sharp'];
        const selected = specificName || files[Math.floor(Math.random() * files.length)];
        this.playSFX(`correct/${selected}`);
        return selected;
    }

    playWrongVoice() {
        this._playRandomFromFolder('wrong', ['Almost There','error-mistake','error-mistake2','Getting Better','Good Try','hehe','Keep Going','One More Try','Try Again']);
    }

    playQuestCompleteVoice() {
        this._playRandomFromFolder('quest_complete', ['Champ','Full Marks','Genius','Nailed It','Proud Of You','Strong Work','Unstoppable']);
    }

    correct() { this.playSFX('correct'); }
    wrong()   { this.playSFX('wrong'); }
    finish()  { this.playSFX('victory'); setTimeout(() => this.playQuestCompleteVoice(), 600); }
    click()   { this.playSFX('tap'); }
    whoosh()  { this.playSFX('whoosh'); }
    pop()     { this.playSFX('pop'); }
    tap()     { this.playSFX('tap'); }
    victory() { this.finish(); }
    error()   { this.wrong(); }
    success() { this.correct(); }
}

export const audioService = new AudioService();
