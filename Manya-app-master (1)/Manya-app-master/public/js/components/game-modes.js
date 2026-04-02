// Game Modes Manager
const GameModes = {
    currentMode: null,
    timer: null,
    timeLeft: 0,
    
    init(mode, duration, onTimeUp) {
        this.currentMode = mode;
        this.onTimeUp = onTimeUp;
        
        const badge = document.querySelector('.game-mode-badge');
        if (badge) {
            badge.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
            badge.className = 'game-mode-badge ' + mode;
        }
        
        if (mode === 'quickfire') {
            this.setupQuickFire();
        } else if (mode === 'timed') {
            this.setupTimed(duration);
        } else if (mode === 'marathon') {
            this.setupMarathon();
        }
    },
    
    setupQuickFire() {
        // Quick fire just means fast pace, no timer per question
        document.body.classList.add('quickfire-mode');
    },
    
    setupTimed(duration) {
        this.timeLeft = duration;
        const timerDisplay = document.querySelector('.timer-display');
        if (timerDisplay) {
            timerDisplay.style.display = 'flex';
            this.updateTimerDisplay();
            
            this.timer = setInterval(() => {
                this.timeLeft--;
                this.updateTimerDisplay();
                
                if (this.timeLeft <= 0) {
                    this.timeUp();
                }
            }, 1000);
        }
    },
    
    setupMarathon() {
        // Marathon just means more questions, handled by quest engine
        document.body.classList.add('marathon-mode');
    },
    
    updateTimerDisplay() {
        const timerSpan = document.querySelector('.timer-display span');
        if (timerSpan) {
            timerSpan.textContent = this.timeLeft.toString().padStart(2, '0');
        }
    },
    
    timeUp() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        if (this.onTimeUp) {
            this.onTimeUp();
        }
    },
    
    questionAnswered() {
        if (this.currentMode === 'quickfire') {
            // Quick fire mode might have special effects
            document.body.classList.add('quickfire-answered');
            setTimeout(() => {
                document.body.classList.remove('quickfire-answered');
            }, 200);
        }
    },
    
    reset() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.currentMode = null;
        document.body.classList.remove('quickfire-mode', 'marathon-mode');
        const timerDisplay = document.querySelector('.timer-display');
        if (timerDisplay) {
            timerDisplay.style.display = 'none';
        }
    }
};

window.GameModes = GameModes;