import { getSfx } from '../../config/assetUrls';

class AudioService {
    constructor() {
        this.lastPlayedTime = 0;
    }

    playSFX(name) {
        if (typeof window === 'undefined') return;

        const url = getSfx(name);
        console.log(`[AudioService] Playing SFX: ${name} -> ${url}`);

        // Prevent duplicate sound spam (except for high-prestige legacy sounds and VOICES)
        const isLegacy = name === 'applause' || name === 'victory' || name === 'challenge_win';
        const isVoice = name.includes('/') || name.startsWith('correct') || name.startsWith('wrong');
        
        const now = Date.now();
        if (!isLegacy && !isVoice && this._lastPlayed && this._lastPlayed[name] && (now - this._lastPlayed[name] < 300)) return;
        
        if (!this._lastPlayed) this._lastPlayed = {};
        this._lastPlayed[name] = now;

        const sound = new Audio(url);
        sound.volume = 0.6;
        sound.play().catch(err => {
            console.warn(`[AudioService] Playback failed for ${name}, trying fallback...`, err);
            // Fallback to a generic sparkle/click if special asset fails
            if (name === 'magic_positive') this.playSFX('bonus');
            else if (name === 'victory') this.playSFX('challenge_win');
        });
    }

    _playRandomFromFolder(folder, files) {
        const randomFile = files[Math.floor(Math.random() * files.length)];
        this.playSFX(`${folder}/${randomFile}`);
    }

    playCorrectVoice() {
        const files = [
            'Amazing', 'Awesome', 'Bam', 'Bravo', 'Champion',
            'Correct', 'Epic', 'Great', 'Super', 'Well Done',
            'Wow', 'You are Sharp'
        ];
        this._playRandomFromFolder('correct', files);
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
        // v9.9: Vocal rewards managed centrally by feedbackService to prevent clashing
    }

    wrong() {
        this.playSFX('wrong');
        // Silenced voiceovers for wrong answers to keep focus 🔇
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
