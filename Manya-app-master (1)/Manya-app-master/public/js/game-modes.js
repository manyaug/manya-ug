// game-modes.js - Enhanced with proper timer and notifications
const GameModes = {
    currentMode: null,
    timer: null,
    timeLeft: 0,
    totalTime: 0,
    onTimeUp: null,
    questId: null,
    notificationElement: null,
    
    init(mode, duration, onTimeUp, questId) {
        this.currentMode = mode;
        this.onTimeUp = onTimeUp;
        this.questId = questId;
        this.totalTime = duration;
        this.timeLeft = duration;
        
        // Show notification to user
        this.showModeNotification(mode, duration);
        
        const badge = document.querySelector('.game-mode-badge');
        if (badge) {
            badge.textContent = this.getModeDisplayName(mode);
            badge.className = 'game-mode-badge ' + mode;
        }
        
        if (mode === 'timed') {
            this.setupTimedMode(duration);
        } else if (mode === 'quickfire') {
            this.setupQuickFire();
        } else if (mode === 'marathon') {
            this.setupMarathon();
        }
    },
    
    getModeDisplayName(mode) {
        const names = {
            'quickfire': '⚡ QUICK FIRE',
            'timed': '⏱️ TIMED CHALLENGE',
            'marathon': '🏃 MARATHON',
            'none': '📚 NORMAL'
        };
        return names[mode] || mode.toUpperCase();
    },
    
    showModeNotification(mode, duration) {
        // Remove any existing notification
        if (this.notificationElement) {
            this.notificationElement.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = 'mode-notification';
        
        let message = '';
        let icon = '';
        
        switch(mode) {
            case 'timed':
                icon = '⏱️';
                message = `TIMED CHALLENGE! You have ${duration} seconds for the ENTIRE quest. Answer quickly!`;
                break;
            case 'quickfire':
                icon = '⚡';
                message = `QUICK FIRE MODE! Each question has 15 seconds. Answer fast for bonus points!`;
                break;
            case 'marathon':
                icon = '🏃';
                message = `MARATHON MODE! Endurance challenge. Take your time, but there are more questions!`;
                break;
        }
        
        notification.innerHTML = `
            <div class="mode-notification-content">
                <span class="mode-icon">${icon}</span>
                <div class="mode-message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        this.notificationElement = notification;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (this.notificationElement) {
                this.notificationElement.classList.add('fade-out');
                setTimeout(() => {
                    if (this.notificationElement) {
                        this.notificationElement.remove();
                        this.notificationElement = null;
                    }
                }, 500);
            }
        }, 5000);
    },
    
    setupTimedMode(totalSeconds) {
        this.timeLeft = totalSeconds;
        this.totalTime = totalSeconds;
        
        const timerDisplay = document.querySelector('.timer-display');
        if (timerDisplay) {
            timerDisplay.style.display = 'flex';
            this.updateTimerDisplay();
            
            // Clear any existing timer
            if (this.timer) {
                clearInterval(this.timer);
            }
            
            this.timer = setInterval(() => {
                this.timeLeft--;
                this.updateTimerDisplay();
                
                // Visual warning when time is low
                if (this.timeLeft <= 10) {
                    timerDisplay.classList.add('timer-warning');
                }
                if (this.timeLeft <= 5) {
                    timerDisplay.classList.add('timer-critical');
                }
                
                if (this.timeLeft <= 0) {
                    this.timeUp();
                }
            }, 1000);
        }
    },
    
    setupQuickFire() {
        // Quick fire gives 15 seconds per question
        document.body.classList.add('quickfire-mode');
        
        // Add per-question timer
        this.startQuestionTimer(15);
    },
    
    startQuestionTimer(seconds) {
        // This will be called for each question
        if (this.currentMode === 'quickfire') {
            const timerDisplay = document.querySelector('.timer-display');
            if (timerDisplay) {
                timerDisplay.style.display = 'flex';
                timerDisplay.classList.remove('timer-warning', 'timer-critical');
            }
        }
    },
    
    setupMarathon() {
        // Marathon just means more questions, handled by quest engine
        document.body.classList.add('marathon-mode');
        
        // Show progress differently
        const counter = document.querySelector('.question-counter');
        if (counter) {
            counter.classList.add('marathon-counter');
        }
    },
    
    updateTimerDisplay() {
        const timerSpan = document.querySelector('.timer-display span');
        if (timerSpan) {
            timerSpan.textContent = this.timeLeft.toString().padStart(2, '0');
        }
        
        // Update progress bar if we have one
        const progressBar = document.querySelector('.timer-progress');
        if (progressBar && this.totalTime > 0) {
            const percent = (this.timeLeft / this.totalTime) * 100;
            progressBar.style.width = percent + '%';
        }
    },
    
    timeUp() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        // Show time's up notification
        const notification = document.createElement('div');
        notification.className = 'time-up-notification';
        notification.innerHTML = `
            <div class="time-up-content">
                <span class="time-icon">⏰</span>
                <div class="time-message">TIME'S UP!</div>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
        
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
            
            // Reset timer for next question
            this.startQuestionTimer(15);
        }
    },
    
    reset() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.currentMode = null;
        
        // Remove mode classes
        document.body.classList.remove('quickfire-mode', 'marathon-mode');
        
        // Hide timer display
        const timerDisplay = document.querySelector('.timer-display');
        if (timerDisplay) {
            timerDisplay.style.display = 'none';
            timerDisplay.classList.remove('timer-warning', 'timer-critical');
        }
        
        // Remove notification if present
        if (this.notificationElement) {
            this.notificationElement.remove();
            this.notificationElement = null;
        }
    }
};

window.GameModes = GameModes;