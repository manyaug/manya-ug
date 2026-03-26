// challenges.js - Complete Fixed Version with Debug
console.log('📦 challenges.js loading started...');
console.log('   QuestScreen available at start?', typeof QuestScreen !== 'undefined' ? '✅' : '❌');

if (typeof QuestScreen === 'undefined') {
    console.error('❌ CRITICAL: QuestScreen not loaded yet! Script order problem.');
    console.log('   Current script order - quest.js must load BEFORE challenges.js');
}

const ChallengesScreen = {
    currentTopic: null,
    challenges: [],
    
    async loadTopic(topicName) {
        console.log('📚 ChallengesScreen.loadTopic called with:', topicName);
        showLoading();
        
        try {
            const userId = window.App?.currentUser || 'student-001';
            const response = await fetch(`/api/challenges/${encodeURIComponent(topicName)}?userId=${userId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Challenges data received:', data);
            
            this.currentTopic = data;
            this.challenges = data.challenges || [];
            
            this.render();
        } catch (err) {
            console.error('❌ Error loading challenges:', err);
            alert('Failed to load challenges. Please try again.');
        } finally {
            hideLoading();
        }
    },
    
    render() {
        console.log('🎨 Rendering challenges screen');
        const template = document.getElementById('topics-view').content.cloneNode(true);
        const container = template.querySelector('.topics-grid');
        container.innerHTML = ''; // Clear any existing content
        
        this.challenges.forEach(challenge => {
            try {
                const card = new ChallengeCard(challenge, (challengeData) => {
                    this.showChallengeDetail(challengeData);
                });
                card.render(container);
            } catch (err) {
                console.error('Error rendering challenge card:', err, challenge);
            }
        });
        
        const contentArea = document.getElementById('content-area');
        if (!contentArea) {
            console.error('❌ Content area not found!');
            return;
        }
        
        contentArea.innerHTML = '';
        contentArea.appendChild(template);
    },
    
    async showChallengeDetail(challenge) {
        console.log('🔍 Showing challenge detail:', challenge);
        
        // Check if this is first time seeing this challenge
        const isNew = !challenge.progress || challenge.progress.quest1Mastery === 0;
        
        if (isNew) {
            try {
                await this.showSubtopicTeaser(challenge);
            } catch (err) {
                console.log('Teaser not available:', err);
            }
        }
        
        const template = document.getElementById('quest-detail-view').content.cloneNode(true);
        
        // Set challenge info
        const iconEl = template.querySelector('.challenge-icon-large');
        if (iconEl) iconEl.textContent = challenge.icon || '📘';
        
        const nameEl = template.getElementById('challenge-name');
        if (nameEl) nameEl.textContent = challenge.name;
        
        const descEl = template.getElementById('challenge-description');
        if (descEl) descEl.textContent = challenge.description || `Master ${challenge.name.toLowerCase()}`;
        
        // Back button
        const backBtn = template.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.loadTopic(this.currentTopic.name);
            });
        }
        
        // Render quests
        const questsGrid = template.querySelector('#quests-grid');
        if (!questsGrid) {
            console.error('❌ Quests grid not found!');
            return;
        }
        
        if (!challenge.questsList || !Array.isArray(challenge.questsList)) {
            console.error('❌ No questsList in challenge:', challenge);
            questsGrid.innerHTML = '<div class="error">No quests available</div>';
        } else {
            challenge.questsList.forEach(quest => {
                try {
                    if (typeof QuestProgress === 'undefined') {
                        console.error('❌ QuestProgress not defined!');
                        return;
                    }
                    
                    const questCard = QuestProgress.renderQuestCard(
                        quest, 
                        challenge.id, 
                        (questId) => this.startQuest(challenge, questId)
                    );
                    questsGrid.appendChild(questCard);
                } catch (err) {
                    console.error('Error rendering quest card:', err, quest);
                }
            });
        }
        
        const contentArea = document.getElementById('content-area');
        if (!contentArea) {
            console.error('❌ Content area not found!');
            return;
        }
        
        contentArea.innerHTML = '';
        contentArea.appendChild(template);
    },
    
    async startQuest(challenge, questId) {
        console.log('🎯 startQuest called with:', { challenge, questId });
        console.log('   Checking QuestScreen...', typeof QuestScreen !== 'undefined' ? '✅' : '❌');
        
        // If QuestScreen isn't ready, wait a bit
        if (typeof QuestScreen === 'undefined') {
            console.log('⏳ QuestScreen not ready, waiting 200ms...');
            await new Promise(resolve => setTimeout(resolve, 200));
            
            if (typeof QuestScreen === 'undefined') {
                console.error('❌ QuestScreen still not available after waiting');
                alert('Error loading game engine. Please refresh the page.');
                return;
            }
            console.log('✅ QuestScreen became available after waiting');
        }
        
        showLoading();
        
        try {
            const userId = window.App?.currentUser || 'student-001';
            const topicName = this.currentTopic?.name;
            
            if (!topicName) {
                throw new Error('No topic name available');
            }
            
            console.log('🎯 Starting quest details:', {
                topic: topicName,
                challengeId: challenge.id,
                questId: questId,
                userId: userId
            });
            
            const url = `/api/quests/${encodeURIComponent(topicName)}/${challenge.id}/${questId}?userId=${userId}`;
            console.log('📡 Fetching:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const questData = await response.json();
            console.log('✅ Quest data received:', questData);
            
            // Double check QuestScreen before using it
            if (typeof QuestScreen === 'undefined') {
                throw new Error('QuestScreen disappeared!');
            }
            
            QuestScreen.init(questData, challenge, () => {
                console.log('🏁 Quest completed, returning to challenge detail');
                this.showChallengeDetail(challenge);
            });
            
        } catch (err) {
            console.error('❌ Error starting quest:', err);
            alert(`Failed to start quest: ${err.message}`);
        } finally {
            hideLoading();
        }
    },
    
    async showSubtopicTeaser(challenge) {
        console.log('🎬 Showing teaser for:', challenge.name);
        
        // Find a default GLB for this subtopic
        // This is a simplified example - adjust path based on your actual structure
        const glbPath = `/assets/science/musklo-skeletal-system/quest_${challenge.id}_human_skeleton/female_skeleton.glb`;
        
        try {
            // Load simulation loader if needed
            if (!window.SimulationLoader) {
                console.log('📦 SimulationLoader not found, loading...');
                await this.loadScript('js/simulation-loader.js');
                if (!window.SimulationLoader) {
                    throw new Error('Failed to load SimulationLoader');
                }
                await SimulationLoader.init();
            }
            
            // Show teaser
            await SimulationLoader.showTeaser(challenge.name, glbPath);
            console.log('✅ Teaser shown');
        } catch (err) {
            console.log('⚠️ Teaser not available:', err.message);
            // Continue without teaser
        }
    },
    
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`✅ Script loaded: ${src}`);
                resolve();
            };
            script.onerror = (err) => {
                console.error(`❌ Failed to load script: ${src}`, err);
                reject(err);
            };
            document.head.appendChild(script);
        });
    }
};

// Make sure ChallengesScreen is globally available
window.ChallengesScreen = ChallengesScreen;
console.log('✅ ChallengesScreen registered globally');

// Add DOMContentLoaded check
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM fully loaded, challenges.js ready');
    console.log('   Final QuestScreen check:', typeof QuestScreen !== 'undefined' ? '✅' : '❌');
});

// Export for module systems if needed (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChallengesScreen;
}