// At the very top of app.js
console.log('🔍 Checking global objects:', {
    QuestScreen: typeof QuestScreen !== 'undefined' ? '✅' : '❌',
    ChallengesScreen: typeof ChallengesScreen !== 'undefined' ? '✅' : '❌',
    GameModes: typeof GameModes !== 'undefined' ? '✅' : '❌'
});

// If QuestScreen is missing, show error
if (typeof QuestScreen === 'undefined') {
    console.error('❌ CRITICAL: QuestScreen not loaded! Check script order.');
}
// Main Application Controller
// app.js - Fixed Version
const App = {
    currentUser: 'student-001',
    currentView: 'topics',
    
async init() {
    console.log('🚀 Initializing MANYA app...');
    
    // Initialize audio system
    if (window.MANYAAudioSystem && window.MANYAAudioSystem.init) {
        window.MANYAAudioSystem.init();
    }
    
    // Initialize character system
    if (window.MANYACharacterSystem && window.MANYACharacterSystem.init) {
        window.MANYACharacterSystem.init();
    }
    
    // Load user data
    await this.loadUserData();
    
    if (window.GemDisplay && window.GemDisplay.loadGems) {
        await window.GemDisplay.loadGems(this.currentUser);
    }
    
    this.setupNavigation();
    this.loadView('topics');
    
    // Activate audio on first click
    const activateAudio = () => {
        if (window.MANYAAudioSystem && window.MANYAAudioSystem.playClick) {
            window.MANYAAudioSystem.playClick();
        }
        document.removeEventListener('click', activateAudio);
        document.removeEventListener('touchstart', activateAudio);
    };
    document.addEventListener('click', activateAudio);
    document.addEventListener('touchstart', activateAudio);
},
    
   // In app.js - update loadUserData method
async loadUserData() {
    try {
        // Change this line from '/api/user-stats/student-001' to '/api/stats/user-stats/student-001'
        const response = await fetch(`/api/stats/user-stats/${this.currentUser}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 User stats loaded:', data);
        
        // Update UI with the stats from the summary object
        document.getElementById('streakCount').textContent = data.summary?.currentStreak || 0;
        document.getElementById('pointsTotal').textContent = data.summary?.totalPoints || 0;
        
        // Also update psychological params if available
        if (window.QuestScreen) {
            window.QuestScreen.params.accuracy = data.summary?.overallAccuracy || 0;
            window.QuestScreen.updateParameterDisplays();
        }
        
    } catch (err) {
        console.error('Error loading user data:', err);
        // Set default values on error
        document.getElementById('streakCount').textContent = '0';
        document.getElementById('pointsTotal').textContent = '0';
    }
},
    
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.loadView(view);
                
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        document.getElementById('userSelect').addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'new-user') {
                this.createNewUser();
            } else {
                this.currentUser = value;
                this.loadUserData();
                this.loadView(this.currentView);
            }
        });
    },
    
    async loadView(view) {
        this.currentView = view;
        
        try {
            switch(view) {
                case 'topics':
                    if (typeof ChallengesScreen === 'undefined') {
                        console.error('❌ ChallengesScreen not loaded!');
                        document.getElementById('content-area').innerHTML = 
                            '<div class="error">Failed to load challenges. Please refresh.</div>';
                        return;
                    }
                    await ChallengesScreen.loadTopic('Musculo-Skeletal System');
                    break;
                    
                case 'profile':
                    this.loadProfile();
                    break;
                    
                case 'achievements':
                    this.loadAchievements();
                    break;
            }
        } catch (err) {
            console.error('Error loading view:', err);
        }
    },
    
    async createNewUser() {
        const name = prompt('Enter your name:');
        if (!name) return;
        
        try {
            const response = await fetch('/api/register-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: name })
            });
            
            const data = await response.json();
            
            if (data.userId) {
                this.currentUser = data.userId;
                
                const select = document.getElementById('userSelect');
                const option = new Option(`👤 ${name}`, data.userId);
                select.insertBefore(option, select.lastElementChild);
                select.value = data.userId;
                
                this.loadUserData();
                this.loadView(this.currentView);
            }
            
        } catch (err) {
            console.error('Error creating user:', err);
            alert('Failed to create user');
        }
    },
    
    async loadProfile() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = '<div class="loading">Loading profile...</div>';
        
        try {
            const response = await fetch(`/api/profile/${this.currentUser}`);
            const profile = await response.json();
            
            // TODO: Render profile view
            contentArea.innerHTML = '<div class="coming-soon">Profile view coming soon!</div>';
            
        } catch (err) {
            console.error('Error loading profile:', err);
            contentArea.innerHTML = '<div class="error">Failed to load profile</div>';
        }
    },
    
    async loadAchievements() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = '<div class="loading">Loading achievements...</div>';
        
        try {
            const response = await fetch(`/api/quests/rewards/${this.currentUser}`);
            const achievements = await response.json();
            
            if (achievements.length === 0) {
                contentArea.innerHTML = '<div class="empty-state">No achievements yet. Complete quests to earn badges!</div>';
                return;
            }
            
            let html = '<div class="achievements-grid">';
            achievements.forEach(ach => {
                html += `
                    <div class="achievement-card">
                        <div class="achievement-icon">${ach.badgeEarned || '🏆'}</div>
                        <div class="achievement-name">Quest ${ach.questId}</div>
                        <div class="achievement-date">${new Date(ach.claimedAt).toLocaleDateString()}</div>
                    </div>
                `;
            });
            html += '</div>';
            
            contentArea.innerHTML = html;
            
        } catch (err) {
            console.error('Error loading achievements:', err);
            contentArea.innerHTML = '<div class="error">Failed to load achievements</div>';
        }
    }
};

// Loading overlay helpers
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

window.App = App;