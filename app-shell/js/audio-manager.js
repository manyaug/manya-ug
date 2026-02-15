/**
 * MANYA AUDIO MANAGER
 * Handles ambient forest loops and tactile UI sound effects.
 */

export const AudioManager = {
    ambientTrack: null,
    isPlaying: false,

    // GLOBAL CONFIGURATION
    config: {
        ambientVolume: 0.15,      // 15% - Perfect for background
        sfxVolume: 0.4,          // 40% - Clear but not piercing
        fadeDuration: 2000,      // 2 seconds for smooth transitions
        ambientPath: '../../assets/audios/wind-with-birds-and-forest.mp3',
        clickPath: '../../assets/audios/ui-click.mp3'
    },

    /**
     * Initialize Audio Objects
     */
    init() {
        // 1. Setup Ambient Loop
        this.ambientTrack = new Audio(this.config.ambientPath);
        this.ambientTrack.loop = true;
        this.ambientTrack.volume = 0; // Always start at 0 for fade-in
    },

    /**
     * Smoothly swell the forest sounds
     */
    playAmbient() {
        if (this.isPlaying) return;

        this.ambientTrack.play().then(() => {
            this.isPlaying = true;
            this.fade(this.ambientTrack, this.config.ambientVolume, this.config.fadeDuration);
        }).catch(err => {
            console.warn("Manya Audio: Waiting for user interaction to start sound.");
            // Browser policy: Sound will wait until the user clicks anywhere
            const startOnInteraction = () => {
                this.playAmbient();
                window.removeEventListener('click', startOnInteraction);
            };
            window.addEventListener('click', startOnInteraction);
        });
    },

    /**
     * Gently fade out the forest sounds
     */
    stopAmbient() {
        if (!this.isPlaying) return;
        
        this.fade(this.ambientTrack, 0, 1000, () => {
            this.ambientTrack.pause();
            this.isPlaying = false;
        });
    },

    /**
     * Tactile UI Feedback (Button Clicks)
     * Call this whenever a student clicks a node or nav item.
     */
    playSFX(type = 'click') {
        const sfx = new Audio(this.config.clickPath);
        sfx.volume = this.config.sfxVolume;
        sfx.play().catch(() => {}); // Ignore errors if triggered too fast
    },

    /**
     * THE FADE ENGINE
     * Linearly interpolates volume over a set duration.
     */
    fade(audio, targetVolume, duration, callback) {
        if (!audio) return;
        const startVolume = audio.volume;
        const diff = targetVolume - startVolume;
        const steps = 25; // More steps for smoother transition
        const stepTime = duration / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            // FIXED: Clamp volume between 0.0 and 1.0 to prevent IndexSizeError
            const nextVol = startVolume + (diff * (currentStep / steps));
            audio.volume = Math.max(0, Math.min(1, nextVol)); 

            if (currentStep >= steps) {
                clearInterval(interval);
                audio.volume = Math.max(0, Math.min(1, targetVolume));
                if (callback) callback();
            }
        }, stepTime);
    }
};