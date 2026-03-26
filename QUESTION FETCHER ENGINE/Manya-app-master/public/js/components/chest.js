// public/js/components/chest.js
const ChestUI = {
    currentChests: [],
    
    async loadChests() {
        const userId = window.App?.currentUser || 'student-001';
        
        try {
            const response = await fetch(`/api/chests/${userId}`);
            const data = await response.json();
            this.currentChests = data.chests;
            return this.currentChests;
        } catch (err) {
            console.error('Error loading chests:', err);
            return [];
        }
    },
    
    renderChests() {
        if (this.currentChests.length === 0) {
            return `
                <div class="empty-chests">
                    <div class="empty-icon">📦</div>
                    <p>No chests yet! Complete quests to earn rewards.</p>
                </div>
            `;
        }
        
        const chestIcons = {
            wooden: '🪵',
            stone: '🪨',
            silver: '🥈',
            golden: '🥇',
            diamond: '💎'
        };
        
        return `
            <div class="chests-grid">
                ${this.currentChests.map(chest => `
                    <div class="chest-card" data-chest-id="${chest.id}">
                        <div class="chest-card-icon">${chestIcons[chest.chest_type] || '📦'}</div>
                        <div class="chest-card-info">
                            <h4>${chest.chest_type.toUpperCase()} Chest</h4>
                            <p>Unlocked: ${new Date(chest.unlocked_at).toLocaleDateString()}</p>
                        </div>
                        <button class="chest-open-btn" data-chest-id="${chest.id}">OPEN</button>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    async renderSimulations() {
        const userId = window.App?.currentUser || 'student-001';
        
        try {
            const response = await fetch(`/api/chests/simulations/${userId}`);
            const data = await response.json();
            const simulations = data.simulations;
            
            if (simulations.length === 0) {
                return `
                    <div class="empty-simulations">
                        <div class="empty-icon">🎨</div>
                        <p>No simulations unlocked yet. Complete quests to unlock 3D study guides!</p>
                    </div>
                `;
            }
            
            return `
                <div class="simulations-grid">
                    ${simulations.map(sim => `
                        <div class="simulation-card ${sim.viewed ? 'viewed' : 'new'}" data-simulation-id="${sim.simulation_id}">
                            <div class="simulation-badge">${sim.viewed ? '✓ Viewed' : '✨ NEW!'}</div>
                            <div class="simulation-icon">🎨</div>
                            <h4>${sim.simulation_id.replace('SCI-P7-T1-', '')}</h4>
                            <p>Type: ${sim.simulation_type}</p>
                            <button class="view-simulation-btn" data-simulation-id="${sim.simulation_id}">
                                ${sim.viewed ? 'Review' : 'View Study Guide'}
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (err) {
            console.error('Error loading simulations:', err);
            return '<div class="error">Failed to load simulations</div>';
        }
    }
};

window.ChestUI = ChestUI;