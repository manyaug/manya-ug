/**
 * MANYA AUDIO MANAGER - FINAL UNIFIED VERSION
 * Handles: Day/Night crossfading, Weather layering, and SFX.
 */
export const AudioManager = {
    dayTrack: null,
    nightTrack: null,
    rainTrack: null,
    currentMode: 'day',

    init() {
        // Paths are relative to your audio folder structure
        this.dayTrack = new Audio('../../assets/audios/day.mp3');
        this.nightTrack = new Audio('../../assets/audios/night.mp3');
        this.rainTrack = new Audio('../../assets/audios/rain.mp3');
        
        [this.dayTrack, this.nightTrack, this.rainTrack].forEach(t => {
            t.loop = true; 
            t.volume = 0;
        });
    },

    // Triggered when entering the spiral
    playAmbient() {
        this.dayTrack.play().then(() => {
            this.fade(this.dayTrack, 0.15, 2000);
        }).catch(err => {
            console.log("Audio blocked: Waiting for user interaction.");
            window.addEventListener('click', () => this.playAmbient(), { once: true });
        });
    },

    // Triggered when going back to the Hub
    stopAmbient() {
        [this.dayTrack, this.nightTrack, this.rainTrack].forEach(t => this.fade(t, 0, 1500));
        this.currentMode = 'day';
    },

    transitionTo(mode) {
        if (this.currentMode === mode) return;
        this.currentMode = mode;

        if (mode === 'night') {
            this.fade(this.dayTrack, 0, 3000);
            this.nightTrack.play().then(() => this.fade(this.nightTrack, 0.15, 3000));
        } else {
            this.fade(this.nightTrack, 0, 3000);
            this.dayTrack.play().then(() => this.fade(this.dayTrack, 0.15, 3000));
        }
    },

    playWeather(active) {
        if (active) {
            this.rainTrack.play().then(() => this.fade(this.rainTrack, 0.25, 3000));
        } else {
            this.fade(this.rainTrack, 0, 3000);
        }
    },

    playSFX(url, vol = 0.6) {
        // Default fallback if no URL is provided in the onclick
        const path = url || '../../assets/audios/click.mp3';
        const sfx = new Audio(path);
        sfx.volume = Math.max(0, Math.min(1, vol));
        sfx.play().catch(() => {});
    },

    fade(audio, target, duration) {
        if (!audio) return;
        const start = audio.volume;
        const diff = target - start;
        const startTime = performance.now();
        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Clamp volume to stop IndexSizeError
            audio.volume = Math.max(0, Math.min(1, start + (diff * progress)));
            if (progress < 1) {
                requestAnimationFrame(tick);
            } else if (target === 0) {
                audio.pause();
            }
        };
        requestAnimationFrame(tick);
    }
};