// Quest Progress Component
class QuestProgress {
    static renderQuestCard(quest, challengeId, onSelect) {
        const template = document.getElementById('quest-card').content.cloneNode(true);
        const card = template.querySelector('.quest-card');
        
        card.dataset.questId = quest.id;
        
        // Set status class
        if (quest.unlocked) {
            card.classList.add('unlocked');
        } else {
            card.classList.add('locked');
        }
        if (quest.isCompleted) {
            card.classList.add('completed');
        }
        
        // Set status icon
        const icon = card.querySelector('.quest-status-icon');
        if (quest.isCompleted) {
            icon.textContent = '✅';
        } else if (quest.isCurrent) {
            icon.textContent = '▶️';
        } else if (quest.unlocked) {
            icon.textContent = '🔓';
        } else {
            icon.textContent = '🔒';
        }
        
        // Set quest info
        card.querySelector('.quest-name').textContent = quest.name;
        card.querySelector('.quest-meta').innerHTML = `
            <span>${quest.icon || '📝'}</span>
            <span>Mastery: ${quest.mastery}%</span>
        `;
        
        // Show progress bar for current quest
        if (quest.isCurrent && !quest.isCompleted) {
            const progressBar = card.querySelector('.progress-bar-container');
            progressBar.style.display = 'block';
            // Progress will be set by the game session
        }
        
        // Set action text
        const action = card.querySelector('.quest-action');
        if (quest.isCompleted) {
            action.textContent = 'Review';
        } else if (quest.isCurrent) {
            action.textContent = 'Continue';
        } else if (quest.unlocked) {
            action.textContent = 'Start';
        } else {
            action.textContent = 'Locked';
        }
        
        // Add click handler for unlocked quests
        if (quest.unlocked) {
            card.addEventListener('click', () => onSelect(quest.id));
        }
        
        return card;
    }

    static updateProgress(questId, current, total) {
        const percent = (current / total) * 100;
        const progressBar = document.querySelector(`.quest-card[data-quest-id="${questId}"] .progress-bar-fill`);
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }
    }
}

window.QuestProgress = QuestProgress;