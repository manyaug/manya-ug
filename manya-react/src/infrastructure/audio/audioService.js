import { getSfx } from '../../config/assetUrls';

class AudioService {
    constructor() {
        this.lastPlayedTime = 0;
    }

    playSFX(name) {
        if (typeof window === 'undefined') return;
        
        // Prevent duplicate sound spam
        const now = Date.now();
        if (now - this.lastPlayedTime < 300) return;
        this.lastPlayedTime = now;

        const sound = new Audio(getSfx(name));
        sound.volume = 0.5;
        sound.play().catch(() => {});
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
            'Almost There', 'Getting Better', 'Good Try', 
            'Keep Going', 'One More Try', 'Try Again', 
            'error-mistake', 'hehe'
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
        setTimeout(() => this.playCorrectVoice(), 400); 
    }

    wrong() { 
        this.playSFX('mistake'); 
        setTimeout(() => this.playWrongVoice(), 400);
    }

    finish() { 
        this.playSFX('victory'); 
        setTimeout(() => this.playQuestCompleteVoice(), 600);
    }

    click()   { this.playSFX('tap'); }
    whoosh()  { this.playSFX('whoosh'); }
    pop()     { this.playSFX('pop'); }
    tap()     { this.playSFX('tap'); }
    victory() { this.finish(); }
    error()   { this.wrong(); }
    success() { this.correct(); }
}

export const audioService = new AudioService();
