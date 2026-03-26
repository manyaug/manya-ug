// public/js/components/audioSystem.js
(function() {
    if (window.__audioSystemLoaded) {
        console.log('🎵 Audio system already loaded');
        return;
    }
    window.__audioSystemLoaded = true;
    
    const AudioSystemInstance = {
        enabled: true,
        soundMap: {
            // Correct/Positive sounds
            'correct': 'collect-points.mp3',
            'correct_alt': 'shine.mp3',
            'correct_bonus': 'game-bonus.mp3',
            'magic': 'twin-sparkle.mp3',
            'applause': 'applause.mp3',
            
            // Wrong/Error sounds
            'wrong': 'error-mistake.mp3',
            'wrong_alt': 'whoosh.mp3',
            
            // Rewards
            'chest': 'collect-points.mp3',
            'level_up': 'level-up.mp3',
            'level_up_alt': 'video-game-bonus.mp3',
            'achievement': 'fanfare-trumpets.mp3',
            'badge': 'applause.mp3',
            'points': 'collect-points.mp3',
            
            // UI
            'click': 'ui-click.mp3',
            
            // Background
            'background_day': 'day.mp3',
            'background_night': 'night.mp3',
            'background_rain': 'rain.mp3',
            'background_ambient': 'freesound_community-night-cricket-ambience-22484.mp3'
        },
        
        init() {
            console.log('🎵 Audio system ready');
            return this;
        },
        
        play(soundName, volume = 0.5) {
            if (!this.enabled) return;
            const fileName = this.soundMap[soundName];
            if (!fileName) return;
            
            try {
                const audio = new Audio(`/multimedia_assets/audios/${fileName}`);
                audio.volume = volume;
                audio.play().catch(() => {});
            } catch (err) {}
        },
        
        playCorrect() { this.play('correct', 0.5); },
        playWrong() { this.play('wrong', 0.4); },
        playClick() { this.play('click', 0.3); },
        
        playGemCollect() { 
            this.play('points', 0.5);
            // Random chance for bonus sound
            if (Math.random() < 0.3) {
                setTimeout(() => this.play('correct_bonus', 0.4), 150);
            }
        },
        
        playLevelUp() { 
            this.play('level_up', 0.7);
            setTimeout(() => this.play('achievement', 0.5), 400);
        },
        
        playChestOpen() {
            this.play('chest', 0.6);
            setTimeout(() => this.play('magic', 0.4), 200);
        },
        
        playStreakAchievement(streak) {
            if (streak >= 7) {
                this.play('level_up_alt', 0.7);
                setTimeout(() => this.play('achievement', 0.5), 300);
            } else if (streak >= 3) {
                this.play('correct_bonus', 0.5);
            }
        }
    };
    
    window.MANYAAudioSystem = AudioSystemInstance;
    window.AudioSystem = AudioSystemInstance;
})();