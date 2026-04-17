import { getSfx } from '../../config/assetUrls';

class AudioService {
    playSFX(name) {
        if (typeof window === 'undefined') return;
        const sound = new Audio(getSfx(name));
        
        // Retrieve volume settings from localStorage or store as a fallback
        // The AudioManager still manages global sliders, this is purely for one-shot SFX
        // Since Redux state isn't synchronous here, relying on the old window behavior
        // But we handle it safely.
        sound.play().catch(() => {});
    }

    correct() { this.playSFX('collect-points'); }
    wrong()   { this.playSFX('error-mistake'); }
    finish()  { this.playSFX('applause'); }
    click()   { this.playSFX('ui-click'); }
    whoosh()  { this.playSFX('whoosh'); }
    pop()     { this.playSFX('pop'); }
    tap()     { this.playSFX('tap'); }
    victory() { this.playSFX('victory'); }
    error()   { this.playSFX('error'); }
}

export const audioService = new AudioService();
