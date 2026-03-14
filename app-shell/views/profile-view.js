/**
 * MANYA ELITE PROFILE DASHBOARD v18.0
 * Features: XP Ring, Weekly Analytics, Subject Mastery, System Services
 */
import { ManyaDB } from '../manya-db.js';

export const renderProfile = async (mount) => {
    const user = await ManyaDB.getCurrentUser();
    if (!user) return;

    // --- ELITE LEVEL CALCULATOR ---
    const xpToLevel = (xp) => {
        const level = Math.floor((xp || 0) / 1000) + 1;
        const progress = (xp % 1000) / 10; // Percentage of current level
        const offset = 339.29 - (339.29 * (progress / 100)); // SVG Circumference
        let rank = "Novice Hero";
        if (level > 5) rank = "Elite Scholar";
        if (level > 10) rank = "Manya Legend";
        return { level, progress, offset, rank };
    };

    const stats = xpToLevel(user.xp || 150);

    const subjectProgress = [
        { name: 'Mathematics', val: 78, color: '#7c3aed', icon: 'assets/images/math_island.png' },
        { name: 'Science', val: 45, color: '#10b981', icon: 'assets/images/science_island.png' },
        { name: 'SST', val: 62, color: '#f59e0b', icon: 'assets/images/sst_island.png' },
        { name: 'English', val: 90, color: '#db2777', icon: 'assets/images/english_island.png' }
    ];

    mount.innerHTML = `
    <div class="profile-page animate-in">
        
        <!-- 1. HERO IDENTITY (XP RING) -->
        <div class="hero-passport-header">
            <div class="xp-ring-container">
                <svg class="xp-ring-svg" viewBox="0 0 120 120">
                    <circle class="ring-bg" cx="60" cy="60" r="54"></circle>
                    <circle class="ring-fill" cx="60" cy="60" r="54" style="stroke-dasharray: 339.29; stroke-dashoffset: ${stats.offset}"></circle>
                </svg>
                <div class="avatar-circle">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}">
                </div>
                <div class="level-badge">LVL ${stats.level}</div>
            </div>
            <h2 class="hero-name-display">${user.nickname}</h2>
            <div class="hero-rank-pill">${stats.rank.toUpperCase()}</div>
        </div>

        <!-- 2. ANALYTICS BENTO GRID -->
        <div class="bento-grid">
            <div class="bento-card" style="background: rgba(124, 58, 237, 0.1); border-color: var(--manya-purple);">
                <span class="card-icon">🔥</span>
                <span class="card-label">Streak</span>
                <div class="card-val">12 Days</div>
            </div>
            <div class="bento-card" style="background: rgba(6, 182, 212, 0.1); border-color: #06B6D4;">
                <span class="card-icon">🎯</span>
                <span class="card-label">PLE Target</span>
                <div class="card-val">${user.goal || 'Agg 4'}</div>
            </div>
        </div>

        <!-- 3. LEARNING ACTIVITY -->
        <div class="activity-card-elite">
            <div class="activity-header">
                <span class="card-icon">🧠</span>
                <div>
                    <div class="activity-title">Learning Activity</div>
                    <div class="activity-sub">04hr 54min this week</div>
                </div>
            </div>
            <div class="bar-chart-container">
                ${['Sun', 'Mon', 'Tue', 'Wed', 'Thr', 'Fri', 'Sat'].map((day, i) => {
                    const heights = [30, 20, 50, 70, 95, 60, 40];
                    return `
                    <div class="chart-bar-wrapper">
                        <div class="bar-fill ${day === 'Thr' ? 'active' : ''}" style="height: ${heights[i]}px">
                            ${day === 'Thr' ? '<div class="bar-tooltip">4.5h</div>' : ''}
                        </div>
                        <span class="bar-day-label">${day}</span>
                    </div>`;
                }).join('')}
            </div>
        </div>

        <!-- 4. SUBJECT PROGRESS -->
        <h4 class="section-label">Curriculum Progress</h4>
        <div class="subject-stack">
            ${subjectProgress.map(sub => `
                <div class="sub-progress-card">
                    <div class="sub-row">
                        <div class="sub-identity">
                            <img src="${sub.icon}" class="sub-icon-tiny">
                            <span>${sub.name}</span>
                        </div>
                        <span class="sub-pct">${sub.val}%</span>
                    </div>
                    <div class="striped-track">
                        <div class="striped-fill" style="width: ${sub.val}%; background-color: ${sub.color}"></div>
                    </div>
                </div>
            `).join('')}
        </div>

        <!-- 5. HERO MANAGEMENT SERVICES -->
        <h4 class="section-label">Hero Management</h4>
        <div class="service-list-elite">
            <div class="service-row" onclick="window.ViewManager.show('settings')">
                <div class="service-icon" style="background:#F5F3FF; color:#7c3aed">⚙️</div>
                <div class="service-text">
                    <span class="s-title">Hero Settings</span>
                    <span class="s-sub">DNA, Nickname, and School</span>
                </div>
                <span class="s-arrow">›</span>
            </div>

            <div class="service-row" onclick="window.ViewManager.show('membership')">
                <div class="service-icon" style="background:#FFF1F2; color:#db2777">👑</div>
                <div class="service-text">
                    <span class="s-title">Elite Hero Status</span>
                    <span class="s-sub">${user.status || 'Free Scholar'}</span>
                </div>
                <span class="s-arrow">›</span>
            </div>
        </div>

        <div style="text-align:center; margin-top:40px; opacity:0.2; padding-bottom:50px;">
            <img src="assets/images/manya_icon.png" style="width:50px">
        </div>
    </div>
    `;
};