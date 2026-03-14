import { ManyaDB } from '../manya-db.js';

export const renderAchievements = async (mount) => {
    const user = await ManyaDB.getCurrentUser();
    if (!user) return;

const subjectGems = [
        { name: 'Math', val: user.mathGems || 0, icon: '💎', color: '#6366F1', glow: 'rgba(99, 102, 241, 0.5)' },
        { name: 'Science', val: user.scienceGems || 0, icon: '💎', color: '#10B981', glow: 'rgba(16, 185, 129, 0.5)' },
        { name: 'SST', val: user.sstGems || 0, icon: '💎', color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.5)' },
        { name: 'English', val: user.englishGems || 0, icon: '💎', color: '#DB2777', glow: 'rgba(219, 39, 119, 0.5)' }
    ];
    


    const badgeGroups = [
        {
            title: "Heroic Discovery",
            badges: [
                { name: "Waddler", icon: "🐣", unlocked: true, tier: 'bronze' },
                { name: "Night Owl", icon: "🦉", unlocked: user.theme === 'dark', tier: 'silver' },
                { name: "Agg 4 Goal", icon: "🎯", unlocked: user.goal?.includes('4'), tier: 'gold' },
                { name: "Elite Hero", icon: "👑", unlocked: user.status === 'Elite Hero', tier: 'diamond' },
                { name: "Rich Kid", icon: "💰", unlocked: user.diamonds > 500, tier: 'gold' },
                { name: "Socialite", icon: "📣", unlocked: false, tier: 'silver' }
            ]
        },
        {
            title: "Math Ninja",
            badges: [
                { name: "Set Pro", icon: "⭕", unlocked: true, tier: 'bronze', cat: 'cat-math' },
                { name: "Number God", icon: "🔢", unlocked: true, tier: 'silver', cat: 'cat-math' },
                { name: "X-Finder", icon: "✖️", unlocked: false, tier: 'gold', cat: 'cat-math' },
                { name: "Geometry", icon: "📐", unlocked: false, tier: 'silver', cat: 'cat-math' },
                { name: "Math Legend", icon: "🔮", unlocked: false, tier: 'diamond', cat: 'cat-math' }
            ]
        },
        {
            title: "Science Lab",
            badges: [
                { name: "Biology", icon: "🦴", unlocked: true, tier: 'bronze', cat: 'cat-science' },
                { name: "Leaf King", icon: "🌱", unlocked: true, tier: 'silver', cat: 'cat-science' },
                { name: "Energy Whiz", icon: "💡", unlocked: false, tier: 'gold', cat: 'cat-science' },
                { name: "Weather Pro", icon: "☁️", unlocked: false, tier: 'silver', cat: 'cat-science' },
                { name: "Scientist", icon: "🧪", unlocked: false, tier: 'diamond', cat: 'cat-science' }
            ]
        },
        {
            title: "SST Explorer",
            badges: [
                { name: "Map Master", icon: "🗺️", unlocked: true, tier: 'bronze', cat: 'cat-sst' },
                { name: "Village Boy", icon: "🛖", unlocked: true, tier: 'silver', cat: 'cat-sst' },
                { name: "Civics", icon: "⚖️", unlocked: false, tier: 'gold', cat: 'cat-sst' },
                { name: "Globe Kid", icon: "🌍", unlocked: false, tier: 'silver', cat: 'cat-sst' },
                { name: "Africa Giant", icon: "🐘", unlocked: false, tier: 'diamond', cat: 'cat-sst' }
            ]
        },
        {
            title: "English Master",
            badges: [
                { name: "Verb Star", icon: "🏃", unlocked: true, tier: 'bronze', cat: 'cat-english' },
                { name: "Poet", icon: "✍️", unlocked: true, tier: 'silver', cat: 'cat-english' },
                { name: "Speller", icon: "🐝", unlocked: false, tier: 'gold', cat: 'cat-english' },
                { name: "Story Teller", icon: "📚", unlocked: false, tier: 'silver', cat: 'cat-english' },
                { name: "Dictionary", icon: "📖", unlocked: false, tier: 'diamond', cat: 'cat-english' }
            ]
        }
    ];

    const totalBadges = 31; // Adjusted for full list
    const unlockedCount = badgeGroups.flatMap(g => g.badges).filter(b => b.unlocked).length;
    const pct = (unlockedCount / totalBadges) * 100;

    mount.innerHTML = `
    <div class="achievements-page animate-in">
       <div class="view-header-back">
            <button class="manya-back-btn" onclick="ViewManager.show('profile')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h2 style="font-weight:900; margin:0; color:var(--text-main);">Badge Vault</h2>
        </div>

        <!-- NEW: GEM TREASURY -->
        <div class="gem-treasury-card">
            <span class="vault-label" style="color: rgba(255,255,255,0.6)">Subject Gem Bank</span>
            <div class="gem-grid">
                ${subjectGems.map(gem => `
                    <div class="gem-item">
                        <div class="gem-stone" style="color: ${gem.color}; filter: drop-shadow(0 0 10px ${gem.glow});">${gem.icon}</div>
                        <div class="gem-count">${gem.val}</div>
                        <div class="gem-label">${gem.name}</div>
                    </div>
                `).join('')}
            </div>
        </div>



        <!-- COLLECTION PROGRESS -->
        <div class="collection-card-elite">
            <div class="prog-label-row">
                <span>COLLECTION STATUS</span>
                <span>${unlockedCount}/${totalBadges}</span>
            </div>
            <div class="vault-bar-track">
                <div class="vault-bar-fill" style="width: ${pct}%;"></div>
            </div>
            <p style="font-size:10px; margin-top:10px; color:rgba(255,255,255,0.6); font-weight:700;">
                Keep studying to unlock the Diamond Collection!
            </p>
        </div>

        <!-- RENDER GROUPS -->
        ${badgeGroups.map(group => `
            <span class="badge-cat-header">${group.title}</span>
            <div class="badge-grid-vault">
                ${group.badges.map(badge => `
                    <div class="badge-item-elite ${badge.unlocked ? 'badge-is-unlocked tier-' + badge.tier : 'badge-is-locked'} ${badge.cat || ''}">
                        <span class="b-icon">${badge.unlocked ? badge.icon : '🔒'}</span>
                        <span class="b-name">${badge.name}</span>
                    </div>
                `).join('')}
            </div>
        `).join('')}

        <div style="text-align:center; margin-top:60px; opacity:0.1;">
            <img src="assets/icons/manya_icon.png" style="width:80px">
        </div>
    </div>
    `;
};