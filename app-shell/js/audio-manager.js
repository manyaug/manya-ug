export const AudioManager = {
    dayTrack: null,
    nightTrack: null,
    rainTrack: null,
    currentMode: 'day',

    init() {
        this.dayTrack = new Audio('../../assets/audios/day.mp3');
        this.nightTrack = new Audio('../../assets/audios/night.mp3');
        this.rainTrack = new Audio('../../assets/audios/rain.mp3');
        
        [this.dayTrack, this.nightTrack, this.rainTrack].forEach(t => {
            t.loop = true; t.volume = 0;
        });
    },

    playAmbient() {
        this.dayTrack.play().then(() => this.fade(this.dayTrack, 0.15, 2000));
    },

    stopAmbient() {
        [this.dayTrack, this.nightTrack, this.rainTrack].forEach(t => this.fade(t, 0, 1000));
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

    // type: 'rain' or 'wind'
    playWeather(type, active) {
        if (type === 'rain') {
            if (active) {
                this.rainTrack.play().then(() => this.fade(this.rainTrack, 0.25, 3000));
            } else {
                this.fade(this.rainTrack, 0, 3000);
            }
        }
    },

    playSFX(url, vol = 0.2) {
        const sfx = new Audio(url);
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
            audio.volume = Math.max(0, Math.min(1, start + (diff * progress)));
            if (progress < 1) requestAnimationFrame(tick);
            else if (target === 0) audio.pause();
        };
        requestAnimationFrame(tick);
    }
};