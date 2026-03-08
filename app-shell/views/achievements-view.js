import { ManyaDB } from '../manya-db.js';

export const renderAchievements = async (mount) => {
    const user = await ManyaDB.getCurrentUser();
    if (!user) return;

    // BADGE DATABASE (30 Badges)
    const badgeGroups = [
        {
            title: "General Heroics",
            badges: [
                { name: "Hero Born", icon: "🐣", desc: "Started Journey", unlocked: true, tier: 'silver' },
                { name: "Agg 4 Hunter", icon: "🎯", desc: "High Target", unlocked: user.goal === 'Agg 4-8', tier: 'gold' },
                { name: "7 Day Fire", icon: "🔥", desc: "Week Streak", unlocked: true, tier: 'gold' },
                { name: "Early Bird", icon: "🌅", desc: "Studied @ 6am", unlocked: false, tier: 'silver' },
                { name: "Night Owl", icon: "🦉", desc: "Studied @ 9pm", unlocked: true, tier: 'silver' },
                { name: "Elite Member", icon: "💎", desc: "Elite Status", unlocked: user.status === 'Elite Hero', tier: 'diamond' },
                { name: "Diamond Miner", icon: "⛏️", desc: "Earned 500 Gems", unlocked: false, tier: 'diamond' },
                { name: "Fast Hands", icon: "⚡", desc: "Speed Finish", unlocked: true, tier: 'silver' },
                { name: "Perfect Score", icon: "💯", desc: "Zero Mistakes", unlocked: false, tier: 'gold' },
                { name: "Social Star", icon: "📢", desc: "Shared Results", unlocked: false, tier: 'silver' },
            ]
        },
        {
            title: "Math Mastery",
            badges: [
                { name: "Set Ninja", icon: "⭕", unlocked: true, tier: 'silver', cat: 'cat-math' },
                { name: "Algebra King", icon: "✖️", unlocked: false, tier: 'gold', cat: 'cat-math' },
                { name: "Number Pro", icon: "🔢", unlocked: true, tier: 'silver', cat: 'cat-math' },
                { name: "Geometry Guru", icon: "📐", unlocked: false, tier: 'silver', cat: 'cat-math' },
                { name: "Math Legend", icon: "👑", unlocked: false, tier: 'diamond', cat: 'cat-math' },
            ]
        },
        {
            title: "Science Lab",
            badges: [
                { name: "Body Expert", icon: "🦴", unlocked: true, tier: 'silver', cat: 'cat-science' },
                { name: "Botany Boss", icon: "🌱", unlocked: true, tier: 'silver', cat: 'cat-science' },
                { name: "Energy Sage", icon: "💡", unlocked: false, tier: 'gold', cat: 'cat-science' },
                { name: "Weather Pro", icon: "☁️", unlocked: false, tier: 'silver', cat: 'cat-science' },
                { name: "Whiz Kid", icon: "🧪", unlocked: false, tier: 'diamond', cat: 'cat-science' },
            ]
        },
        {
            title: "SST Voyager",
            badges: [
                { name: "Map Master", icon: "🗺️", unlocked: true, tier: 'silver', cat: 'cat-sst' },
                { name: "History Buff", icon: "📜", unlocked: false, tier: 'gold', cat: 'cat-sst' },
                { name: "Civic Leader", icon: "🗳️", unlocked: false, tier: 'silver', cat: 'cat-sst' },
                { name: "Globe Trotter", icon: "🌍", unlocked: false, tier: 'silver', cat: 'cat-sst' },
                { name: "African King", icon: "🦁", unlocked: false, tier: 'diamond', cat: 'cat-sst' },
            ]
        },
        {
            title: "English Scholar",
            badges: [
                { name: "Grammar King", icon: "✍️", unlocked: true, tier: 'gold', cat: 'cat-english' },
                { name: "Vocab Giant", icon: "📖", unlocked: true, tier: 'silver', cat: 'cat-english' },
                { name: "Story Teller", icon: "🎭", unlocked: false, tier: 'silver', cat: 'cat-english' },
                { name: "Letter Pro", icon: "✉️", unlocked: false, tier: 'silver', cat: 'cat-english' },
                { name: "Oxford Hero", icon: "🎩", unlocked: false, tier: 'diamond', cat: 'cat-english' },
            ]
        }
    ];

    const totalBadges = 30;
    const unlockedCount = badgeGroups.flatMap(g => g.badges).filter(b => b.unlocked).length;
    const progressPercent = (unlockedCount / totalBadges) * 100;

    mount.innerHTML = `
    <div class="achievements-page animate-in">
        
        <!-- BACK NAV -->
        <div class="view-header-back">
            <button class="manya-back-btn" onclick="window.ViewManager.show('profile')">←</button>
            <h2 style="font-weight:900; margin:0;">Badge Vault</h2>
        </div>

        <!-- OVERALL PROGRESS -->
        <div class="collection-progress-card">
            <div class="progress-meta">
                <span>COLLECTION PROGRESS</span>
                <span>${unlockedCount}/${totalBadges}</span>
            </div>
            <div class="mini-striped-track" style="height:12px; background: rgba(255,255,255,0.1);">
                <div class="mini-striped-fill" style="width: ${progressPercent}%; background: #fbbf24;"></div>
            </div>
            <p style="font-size:10px; margin-top:10px; color:rgba(255,255,255,0.6); font-weight:700;">
                Collect all 30 badges to become a Manya Legend!
            </p>
        </div>

        <!-- RENDER GROUPS -->
        ${badgeGroups.map(group => `
            <span class="badge-category-title">${group.title}</span>
            <div class="badge-grid-elite">
                ${group.badges.map(badge => `
                    <div class="badge-card-pro ${badge.unlocked ? 'badge-unlocked tier-' + badge.tier : 'badge-locked'} ${badge.cat || ''}">
                        <span class="badge-icon-elite">${badge.unlocked ? badge.icon : '🔒'}</span>
                        <span class="badge-name-elite">${badge.name}</span>
                    </div>
                `).join('')}
            </div>
        `).join('')}

        <div style="text-align:center; margin-top:60px; opacity:0.2;">
            <img src="assets/icons/manya_icon.png" style="width:80px;">
        </div>
    </div>
    `;
};