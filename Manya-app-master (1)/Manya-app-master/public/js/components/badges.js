// public/js/components/badges.js
const BadgeUI = {
    userBadges: [],
    allBadges: [],
    
    async loadUserBadges() {
        const userId = window.App?.currentUser || 'student-001';
        
        try {
            const response = await fetch(`/api/badges/${userId}`);
            const data = await response.json();
            this.userBadges = data.badges;
            return this.userBadges;
        } catch (err) {
            console.error('Error loading badges:', err);
            return [];
        }
    },
    
    async loadAllBadges() {
        try {
            const response = await fetch('/api/badges/available/all');
            const data = await response.json();
            this.allBadges = data.badges;
            return this.allBadges;
        } catch (err) {
            console.error('Error loading all badges:', err);
            return [];
        }
    },
    
    renderBadges() {
        if (this.userBadges.length === 0) {
            return `
                <div class="empty-badges">
                    <div class="empty-icon">🏆</div>
                    <p>No badges earned yet! Complete quests to unlock achievements.</p>
                    <p class="badge-hint">💡 Tip: Start with your first correct answer!</p>
                </div>
            `;
        }
        
        const rarityIcons = {
            common: '⭐',
            rare: '✨',
            epic: '💎',
            legendary: '👑'
        };
        
        return `
            <div class="badges-grid">
                ${this.userBadges.map(badge => `
                    <div class="badge-card ${badge.rarity}">
                        <div class="badge-card-icon">${badge.icon}</div>
                        <div class="badge-card-info">
                            <h4>${badge.name}</h4>
                            <p>${badge.description}</p>
                            <div class="badge-meta">
                                <span class="badge-rarity-badge ${badge.rarity}">
                                    ${rarityIcons[badge.rarity]} ${badge.rarity.toUpperCase()}
                                </span>
                                <span class="badge-date">
                                    ${new Date(badge.earnedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    renderAllBadges() {
        const userBadgeTypes = new Set(this.userBadges.map(b => b.type));
        
        const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };
        const sortedBadges = [...this.allBadges].sort((a, b) => {
            if (userBadgeTypes.has(a.type) !== userBadgeTypes.has(b.type)) {
                return userBadgeTypes.has(b.type) ? 1 : -1;
            }
            return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
        });
        
        return `
            <div class="all-badges-grid">
                ${sortedBadges.map(badge => {
                    const isEarned = userBadgeTypes.has(badge.type);
                    return `
                        <div class="badge-collect-card ${isEarned ? 'earned' : 'locked'}">
                            <div class="badge-collect-icon">${isEarned ? badge.icon : '❓'}</div>
                            <div class="badge-collect-info">
                                <h4>${badge.name}</h4>
                                <p>${badge.description}</p>
                                <div class="badge-collect-meta">
                                    <span class="badge-rarity ${badge.rarity}">
                                        ${badge.rarity.toUpperCase()}
                                    </span>
                                    ${isEarned ? '<span class="earned-badge">✓ EARNED</span>' : '<span class="locked-badge">🔒 LOCKED</span>'}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },
    
    renderStats() {
        const totalEarned = this.userBadges.length;
        const totalAvailable = this.allBadges.length;
        const percentage = Math.round((totalEarned / totalAvailable) * 100);
        
        const rarityCounts = {
            common: this.userBadges.filter(b => b.rarity === 'common').length,
            rare: this.userBadges.filter(b => b.rarity === 'rare').length,
            epic: this.userBadges.filter(b => b.rarity === 'epic').length,
            legendary: this.userBadges.filter(b => b.rarity === 'legendary').length
        };
        
        return `
            <div class="badge-stats">
                <div class="stat-card">
                    <div class="stat-value">${totalEarned}</div>
                    <div class="stat-label">Badges Earned</div>
                    <div class="stat-progress">
                        <div class="stat-progress-bar" style="width: ${percentage}%"></div>
                    </div>
                    <div class="stat-sub">${totalAvailable} total available</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${percentage}%</div>
                    <div class="stat-label">Completion</div>
                    <div class="badge-rarity-stats">
                        <div class="rarity-stat">⭐ ${rarityCounts.common} Common</div>
                        <div class="rarity-stat">✨ ${rarityCounts.rare} Rare</div>
                        <div class="rarity-stat">💎 ${rarityCounts.epic} Epic</div>
                        <div class="rarity-stat">👑 ${rarityCounts.legendary} Legendary</div>
                    </div>
                </div>
            </div>
        `;
    }
};

window.BadgeUI = BadgeUI;