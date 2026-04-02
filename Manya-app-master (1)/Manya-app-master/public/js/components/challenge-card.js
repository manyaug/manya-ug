// Challenge Card Component
class ChallengeCard {
    constructor(challengeData, onSelect) {
        this.data = challengeData;
        this.onSelect = onSelect;
        this.element = this.create();
    }

    create() {
        const template = document.getElementById('challenge-card').content.cloneNode(true);
        const card = template.querySelector('.challenge-card');
        
        // Set data attributes
        card.dataset.challengeId = this.data.id;
        
        // Set icon
        card.querySelector('.challenge-icon').textContent = this.data.icon || '📘';
        
        // Set name
        card.querySelector('.challenge-name').textContent = this.data.name;
        
        // Create quest dots
        const dotsContainer = card.querySelector('.quest-dots');
        const quests = this.data.questsList || [1,2,3,4,5];
        
        quests.forEach((quest, index) => {
            const dot = document.createElement('span');
            dot.className = 'quest-dot';
            
            if (this.data.progress) {
                const questMastery = this.data.progress[`quest${index + 1}Mastery`];
                if (questMastery >= 75) {
                    dot.classList.add('completed');
                } else if (index + 1 === this.data.progress.currentQuest) {
                    dot.classList.add('active');
                } else if (this.data.unlockedQuests?.includes(index + 1)) {
                    dot.classList.add('unlocked');
                } else {
                    dot.classList.add('locked');
                }
            } else if (index === 0) {
                dot.classList.add('unlocked');
            } else {
                dot.classList.add('locked');
            }
            
            dotsContainer.appendChild(dot);
        });
        
        // Set progress text
        const completedCount = this.data.progress ? 
            [1,2,3,4,5].filter(q => this.data.progress[`quest${q}Mastery`] >= 75).length : 0;
        card.querySelector('.progress-text').textContent = 
            `${completedCount}/5 quests • ${this.data.progress?.currentQuest ? 'In progress' : 'Not started'}`;
        
        // Add click handler
        card.addEventListener('click', () => this.onSelect(this.data));
        
        return card;
    }

    render(container) {
        container.appendChild(this.element);
    }
}

window.ChallengeCard = ChallengeCard;