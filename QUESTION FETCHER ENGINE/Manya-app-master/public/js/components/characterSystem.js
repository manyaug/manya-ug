// public/js/components/characterSystem.js
(function() {
    if (window.__characterSystemLoaded) {
        console.log('👤 Character system already loaded');
        return;
    }
    window.__characterSystemLoaded = true;
    
    const characters = {
        manya: { 
            name: 'Manya', 
            icon: '/multimedia_assets/characters/manya_icon.png',
            masterIcon: '/multimedia_assets/characters/manya_master.png',
            emoji: '🦉',
            color: '#667eea',
            greeting: "Hello! I'm Manya, your wise learning companion! 📚",
            messages: {
                correct: "Excellent! You're making great progress! ✨",
                wrong: "Don't worry! Every mistake is a learning opportunity! 💪",
                streak: "Look at you! ${streak} days in a row! 🔥",
                badge: "Congratulations! You've earned a new achievement! 🏆",
                chest: "A treasure chest! Let's see what's inside! 🎁",
                gemCollect: "You earned ${gems} gems! Keep collecting! 💎"
            }
        },
        kiki: { 
            name: 'Kiki', 
            icon: '/multimedia_assets/characters/kiki_icon.png',
            emoji: '🐱',
            color: '#fbbf24',
            greeting: "Hi there! Ready for an adventure? Let's learn together! 🚀",
            messages: {
                correct: "Whoa! You're a natural at this! 🎉",
                wrong: "Oops! That one was tricky. Keep going! 📚",
                streak: "Wow! ${streak} days! You're on a roll! 🌈",
                badge: "Yay! You got a shiny new badge! ✨",
                chest: "Treasure! Let's open it together! 🗝️",
                gemCollect: "You got ${gems} gems! So shiny! 💎"
            }
        },
        polly: { 
            name: 'Polly', 
            icon: '/multimedia_assets/characters/polly_icon.png',
            emoji: '🐦',
            color: '#48bb78',
            greeting: "Cheep cheep! Ready to learn something new today? 🐦",
            messages: {
                correct: "Cheep! That's the right answer! You're so smart! 🎵",
                wrong: "Cheep... That one was hard. Let's try together! 🤝",
                streak: "Cheep! ${streak} days of learning! Amazing! 🌟",
                badge: "Cheep! A new badge! You're collecting them all! 🏆",
                chest: "Cheep! What's in the treasure box? Open it! 📦",
                gemCollect: "Cheep! ${gems} new gems! They're so sparkly! 💎"
            }
        }
    };
    
    const CharacterSystemInstance = {
        currentCharacter: 'manya',
        messageTimeout: null,
        
        init() {
            const saved = localStorage.getItem('preferred_character');
            if (saved && characters[saved]) this.currentCharacter = saved;
            this.createWidget();
            console.log(`👤 Character: ${this.currentCharacter}`);
            setTimeout(() => this.speak(characters[this.currentCharacter].greeting), 1000);
            return this;
        },
        
        getCharacter() {
            return characters[this.currentCharacter];
        },
        
        createWidget() {
            const existing = document.getElementById('character-widget');
            if (existing) existing.remove();
            
            const char = this.getCharacter();
            
            const widget = document.createElement('div');
            widget.id = 'character-widget';
            widget.innerHTML = `
                <div class="character-avatar" style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg, ${char.color}, ${char.color}cc);border:3px solid white;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:2.5em;box-shadow:0 4px 15px rgba(0,0,0,0.2);">
                    ${char.emoji}
                </div>
                <div class="character-name" style="position:absolute;bottom:-28px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:white;padding:2px 8px;border-radius:20px;font-size:11px;white-space:nowrap;">${char.name}</div>
                <div class="character-message" style="position:absolute;bottom:80px;left:20px;background:white;border-radius:15px;padding:10px 15px;max-width:220px;display:none;box-shadow:0 4px 15px rgba(0,0,0,0.15);font-size:13px;color:#333;"></div>
            `;
            widget.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:10000;cursor:pointer;';
            document.body.appendChild(widget);
            
            widget.onclick = (e) => {
                e.stopPropagation();
                this.showSelector();
            };
            
            // Also try to load the actual image on hover (optional)
            const avatarDiv = widget.querySelector('.character-avatar');
            if (avatarDiv && char.icon) {
                const img = new Image();
                img.onload = () => {
                    avatarDiv.style.background = `url(${char.icon}) center/cover`;
                    avatarDiv.style.fontSize = '0';
                    avatarDiv.innerHTML = '';
                };
                img.src = char.icon;
            }
        },
        
        showSelector() {
            let selector = document.getElementById('character-selector');
            if (selector) { selector.remove(); return; }
            
            selector = document.createElement('div');
            selector.id = 'character-selector';
            selector.innerHTML = `
                <div style="background:white;border-radius:15px;padding:15px;min-width:200px;box-shadow:0 10px 40px rgba(0,0,0,0.2);">
                    <div style="display:flex;justify-content:space-between;margin-bottom:15px;border-bottom:1px solid #e2e8f0;padding-bottom:10px;">
                        <h4 style="margin:0;">Choose Companion</h4>
                        <button id="closeSelector" style="background:none;border:none;font-size:1.2em;cursor:pointer;">✕</button>
                    </div>
                    ${Object.entries(characters).map(([key, char]) => `
                        <div class="char-option" data-char="${key}" style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:10px;cursor:pointer;margin-bottom:5px;${this.currentCharacter === key ? 'background:#f0f4ff;' : ''}">
                            <div style="font-size:2em;width:40px;text-align:center;">${char.emoji}</div>
                            <div style="flex:1;">
                                <div style="font-weight:600;">${char.name}</div>
                                <div style="font-size:0.7em;color:#718096;">${key === 'manya' ? 'Wise Mentor' : key === 'kiki' ? 'Energetic Friend' : 'Curious Bird'}</div>
                            </div>
                            ${this.currentCharacter === key ? '<span style="color:#48bb78;">✓</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            selector.style.cssText = 'position:fixed;bottom:100px;left:20px;z-index:10001;';
            document.body.appendChild(selector);
            
            document.getElementById('closeSelector').onclick = () => selector.remove();
            selector.querySelectorAll('.char-option').forEach(opt => {
                opt.onclick = () => {
                    const char = opt.dataset.char;
                    this.currentCharacter = char;
                    localStorage.setItem('preferred_character', char);
                    this.createWidget();
                    selector.remove();
                    this.speak(characters[char].greeting);
                };
            });
        },
        
        speak(message, duration = 3000) {
            const msgDiv = document.querySelector('.character-message');
            if (!msgDiv) return;
            msgDiv.textContent = message;
            msgDiv.style.display = 'block';
            if (this.messageTimeout) clearTimeout(this.messageTimeout);
            this.messageTimeout = setTimeout(() => {
                msgDiv.style.display = 'none';
            }, duration);
        },
        
        onCorrect() { 
            this.speak(this.getCharacter().messages.correct, 2000);
            if(window.MANYAAudioSystem) window.MANYAAudioSystem.playCorrect();
        },
        
        onWrong() { 
            this.speak(this.getCharacter().messages.wrong, 2000);
            if(window.MANYAAudioSystem) window.MANYAAudioSystem.playWrong();
        },
        
        onStreak(streak) {
            if (streak >= 3 && streak % 3 === 0) {
                const msg = this.getCharacter().messages.streak.replace('${streak}', streak);
                this.speak(msg, 2500);
            }
        },
        
        onBadge() {
            this.speak(this.getCharacter().messages.badge, 3000);
            if(window.MANYAAudioSystem) window.MANYAAudioSystem.playLevelUp();
        },
        
        onChest() {
            this.speak(this.getCharacter().messages.chest, 2500);
            if(window.MANYAAudioSystem) window.MANYAAudioSystem.playChestOpen();
        },
        
        onGemCollect(count) {
            const msg = this.getCharacter().messages.gemCollect.replace('${gems}', count);
            this.speak(msg, 2000);
        }
    };
    
    window.MANYACharacterSystem = CharacterSystemInstance;
    window.CharacterSystem = CharacterSystemInstance;
})();