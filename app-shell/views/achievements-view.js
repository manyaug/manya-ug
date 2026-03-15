import { ManyaDB } from '../manya-db.js';

export const renderAchievements = async (mount) => {
    const user = await ManyaDB.getCurrentUser();
    if (!user) return;

    // Custom SVGs mapped to subjects
    const subjectGems = [
        { name: 'Math', val: user.mathGems || 0, file: 'math_gem.svg', color: 'var(--manya-purple)', glow: 'rgba(124, 58, 237, 0.6)' },
        { name: 'Science', val: user.scienceGems || 0, file: 'science_svg.svg', color: 'var(--manya-green)', glow: 'rgba(16, 185, 129, 0.6)' },
        { name: 'SST', val: user.sstGems || 0, file: 'sst_gem.svg', color: 'var(--manya-gold)', glow: 'rgba(245, 158, 11, 0.6)' },
        { name: 'English', val: user.englishGems || 0, file: 'english_gem.svg', color: 'var(--manya-pink)', glow: 'rgba(219, 39, 119, 0.6)' }
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

    const totalBadges = 31; 
    const unlockedCount = badgeGroups.flatMap(g => g.badges).filter(b => b.unlocked).length;
    const pct = (unlockedCount / totalBadges) * 100;

    mount.innerHTML = `
    <div class="achievements-page animate-in">
       
        <div class="view-header-back">
            <button class="manya-back-btn" onclick="ViewManager.show('profile')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h2 class="page-title-elite">Trophy Room</h2>
        </div>

        <!-- NEW: GEM TREASURY (CUSTOM SVGS) -->
        <div class="gem-treasury-card">
            <span class="vault-label">THE GEM VAULT</span>
            <div class="gem-grid">
                ${subjectGems.map(gem => `
                    <div class="gem-item">
                        <div class="gem-stone" style="filter: drop-shadow(0 8px 15px ${gem.glow});">
                            <img src="assets/images/gems/${gem.file}" alt="${gem.name}">
                        </div>
                        <div class="gem-count" style="color: ${gem.color}">${gem.val}</div>
                        <div class="gem-label">${gem.name}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- COLLECTION PROGRESS -->
        <div class="collection-card-elite">
            <div class="prog-label-row">
                <span class="prog-title">BADGE MASTERY</span>
                <span class="prog-count">${unlockedCount} / ${totalBadges}</span>
            </div>
            <div class="vault-bar-track">
                <div class="vault-bar-fill" style="width: ${pct}%;"></div>
            </div>
            <p class="prog-subtext">Unlock all badges to earn the Diamond Crown!</p>
        </div>

        <!-- RENDER GROUPS WITH MEDAL STYLING -->
        ${badgeGroups.map(group => `
            <div class="badge-category-wrap">
                <div class="badge-cat-header">
                    <span>${group.title}</span>
                    <div class="cat-line"></div>
                </div>
                
                <div class="badge-grid-vault">
                    ${group.badges.map(badge => `
                        <div class="badge-item-elite ${badge.unlocked ? 'badge-is-unlocked tier-' + badge.tier : 'badge-is-locked'} ${badge.cat || ''}">
                            <div class="medal-ring">
                                <span class="b-icon">${badge.unlocked ? badge.icon : '🔒'}</span>
                            </div>
                            <span class="b-name">${badge.name}</span>
                            ${badge.unlocked ? `<div class="tier-label">${badge.tier}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')}

        <div style="text-align:center; margin-top:60px; opacity:0.1;">
            <img src="assets/images/manya_icon.png" style="width:80px">
        </div>
    </div>
    `;
};