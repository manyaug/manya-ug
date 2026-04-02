// public/js/components/audioSystem.js
(function() {
    if (window.__audioSystemLoaded) {
        console.log('🎵 Audio system already loaded');
        return;
    }
    window.__audioSystemLoaded = true;
    
    const AudioSystemInstance = {
        enabled: true,
        audioLists: {
            correct: [],
            wrong: [],
            quest_complete: []
        },
        loaded: {
            correct: false,
            wrong: false,
            quest_complete: false
        },
        
        async init() {
            console.log('🎵 Audio system initializing...');
            await this.loadAllAudios();
            console.log('🎵 Audio system ready');
            return this;
        },
        
        async loadAllAudios() {
            const folders = ['correct', 'wrong', 'quest_complete'];
            for (const folder of folders) {
                await this.loadAudios(folder);
            }
        },
        
        async loadAudios(folder) {
            try {
                const response = await fetch(`/api/audio/${folder}/list`);
                if (response.ok) {
                    const data = await response.json();
                    this.audioLists[folder] = data.files;
                    if (data.files.length === 0) {
                        console.log(`⚠️ No audio files found in ${folder} folder`);
                    } else {
                        console.log(`🎵 Loaded ${this.audioLists[folder].length} audio files from ${folder}:`, this.audioLists[folder]);
                    }
                } else {
                    throw new Error('Server returned error');
                }
            } catch (err) {
                console.warn(`Could not load ${folder} audio list:`, err);
                this.audioLists[folder] = [];
            }
            this.loaded[folder] = true;
        },
        
        // Play random sound from specified folder
        async playRandom(folder, volume = 0.6) {
            if (!this.enabled) return null;
            
            if (!this.loaded[folder]) {
                await this.loadAudios(folder);
            }
            
            const audioList = this.audioLists[folder];
            if (!audioList || audioList.length === 0) {
                console.log(`⚠️ No audio files in ${folder} folder`);
                return null;
            }
            
            const randomIndex = Math.floor(Math.random() * audioList.length);
            const fileName = audioList[randomIndex];
            const word = fileName.replace('.mp3', '');
            
            console.log(`🎵 Playing: ${folder}/${fileName} (${word})`);
            
            try {
                const audio = new Audio(`/multimedia_assets/audios/${folder}/${fileName}`);
                audio.volume = volume;
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => {
                        console.warn(`Failed to play ${folder}/${fileName}:`, err);
                    });
                }
                return word;
            } catch (err) {
                console.warn(`Error creating audio for ${folder}/${fileName}:`, err);
                return null;
            }
        },
        
        // Specific methods for each scenario
        async playCorrect() {
            return this.playRandom('correct', 0.7);
        },
        
        async playWrong() {
            return this.playRandom('wrong', 0.5);
        },
        
        async playQuestComplete() {
            return this.playRandom('quest_complete', 0.8);
        },
        
        // UI Sounds
        playClick() {
            try {
                const audio = new Audio(`/multimedia_assets/audios/ui-click.mp3`);
                audio.volume = 0.3;
                audio.play().catch(() => {});
            } catch (err) {}
        },
        
        playCoinCollect() {
            try {
                const audio = new Audio(`/multimedia_assets/audios/collect-points.mp3`);
                audio.volume = 0.5;
                audio.play().catch(() => {});
            } catch (err) {}
        },
        
        playCoinDeduct() {
            try {
                const audio = new Audio(`/multimedia_assets/audios/whoosh.mp3`);
                audio.volume = 0.4;
                audio.play().catch(() => {});
            } catch (err) {}
        },
        
        playGemCollect() {
            try {
                const audio = new Audio(`/multimedia_assets/audios/collect-points.mp3`);
                audio.volume = 0.5;
                audio.play().catch(() => {});
            } catch (err) {}
        },
        
        playLevelUp() {
            try {
                const audio = new Audio(`/multimedia_assets/audios/level-up.mp3`);
                audio.volume = 0.7;
                audio.play().catch(() => {});
            } catch (err) {}
        },
        
        playChestOpen() {
            try {
                const audio = new Audio(`/multimedia_assets/audios/chest.mp3`);
                audio.volume = 0.6;
                audio.play().catch(() => {});
            } catch (err) {}
        }
    };
    
    window.MANYAAudioSystem = AudioSystemInstance;
    window.AudioSystem = AudioSystemInstance;
})();