// public/js/quest-tracker.js
const QuestTracker = {
    elements: {
        currentQuestName: document.getElementById('currentQuestName'),
        questProgress: document.getElementById('questProgress'),
        questProgressBar: document.getElementById('questProgressBar'),
        questMastery: document.getElementById('questMastery'),
        questReward: document.getElementById('questReward'),
        questList: document.getElementById('questList')
    },

    currentQuest: { id: 1, progress: 0, total: 8, mastery: 0 },

    async loadQuests() {
        console.log('🎯 Loading quests...');
        
        try {
            const res = await fetch(`/api/quests/${window.currentUser}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            
            const data = await res.json();
            console.log('✅ Quests loaded:', data);
            
            window.questsData = data.quests;
            
            if (data.currentQuest) {
                this.currentQuest = {
                    id: data.currentQuest.questId,
                    progress: data.currentQuest.progress || 0,
                    total: data.currentQuest.total || 8,
                    mastery: 0
                };
                this.updateCurrentQuest();
            }
            
            this.renderQuestList(data.quests);
            
        } catch (err) {
            console.error('❌ Error loading quests:', err);
            if (this.elements.questList) {
                this.elements.questList.innerHTML = '<div style="color: #718096; text-align: center;">Unable to load quests</div>';
            }
        }
    },

    updateCurrentQuest() {
        if (!this.elements.currentQuestName) return;
        
        const percent = (this.currentQuest.progress / this.currentQuest.total) * 100;
        
        if (this.elements.questProgress) {
            this.elements.questProgress.textContent = `${this.currentQuest.progress}/${this.currentQuest.total}`;
        }
        
        if (this.elements.questProgressBar) {
            this.elements.questProgressBar.style.width = percent + '%';
        }
        
        const quest = window.questsData?.find(q => q.questId === this.currentQuest.id);
        if (quest) {
            this.elements.currentQuestName.textContent = `Quest ${quest.questId}: ${quest.name}`;
            if (this.elements.questReward) {
                this.elements.questReward.textContent = `Reward: ${quest.xpReward} XP`;
            }
        }
    },

    renderQuestList(quests) {
        if (!this.elements.questList) return;
        
        if (!quests || quests.length === 0) {
            this.elements.questList.innerHTML = '<div style="color: #718096; text-align: center;">No quests available</div>';
            return;
        }
        
        this.elements.questList.innerHTML = quests.map(q => {
            let statusClass = 'status-locked';
            let statusText = 'Locked';
            
            if (q.status === 'available') {
                statusClass = 'status-available';
                statusText = 'Available';
            } else if (q.status === 'in_progress') {
                statusClass = 'status-in_progress';
                statusText = 'In Progress';
            } else if (q.status === 'completed') {
                statusClass = 'status-completed';
                statusText = 'Completed';
            }
            
            const progressPercent = q.totalQuestions ? (q.progress / q.totalQuestions) * 100 : 0;
            
            return `
                <div class="quest-item" onclick="QuestTracker.selectQuest(${q.questId})">
                    <div class="quest-info">
                        <div class="quest-icon">${q.badgeIcon}</div>
                        <div class="quest-details">
                            <div class="quest-name">Quest ${q.questId}: ${q.name}</div>
                            <div class="quest-mastery">Mastery: ${q.mastery}%</div>
                            ${q.status === 'in_progress' ? `
                                <div class="progress-small">
                                    <div class="progress-small-fill" style="width: ${progressPercent}%"></div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="quest-status ${statusClass}">${statusText}</div>
                </div>
            `;
        }).join('');
    },

    selectQuest(questId) {
        console.log('Selected quest:', questId);
    }
};

window.QuestTracker = QuestTracker;