import { ManyaDB } from '../manya-db.js';

const renderSubjectCard = (sub) => {
    return `
        <div class="world-card-elite ${sub.id}" onclick="ViewManager.show('spiral', null, '${sub.id}')">
            <div class="island-stage">
                <!-- Subject-specific glowing aura -->
                <div class="island-halo"></div>
                <img src="${sub.icon}" class="floating-island">
            </div>
            <div class="card-footer-info">
                <h4>${sub.name}</h4>
                <div class="prog-stats-row">
                    <div class="mini-striped-track">
                        <div class="mini-striped-fill" style="width: ${sub.progress}%; background: ${sub.color}"></div>
                    </div>
                    <span>${sub.progress}%</span>
                </div>
            </div>
        </div>
    `;
};

export const renderHome = async (mount) => {
    const user = await ManyaDB.getCurrentUser();
    
    // Data setup for the 4 subjects
    const subjects = [
        { id: 'math', name: 'Mathematics', progress: 45, icon: 'assets/icons/math_island.png', color: '#6366F1' },
        { id: 'science', name: 'Science', progress: 20, icon: 'assets/icons/science_island.png', color: '#10B981' },
        { id: 'sst', name: 'SST', progress: 10, icon: 'assets/icons/sst_island.png', color: '#F59E0B' },
        { id: 'english', name: 'English', progress: 80, icon: 'assets/icons/english_island.png', color: '#DB2777' }
    ];

    mount.innerHTML = `
        <div class="manya-hub animate-in">
            
            <!-- 1. RESUME MISSION (World-Class UX) -->
            <div class="resume-mission-card" onclick="ViewManager.show('spiral', null, 'math')">
                <div class="mission-info">
                    <span class="mission-tag">CURRENT MISSION</span>
                    <h3>Resume: Set Theory</h3>
                    <div class="mission-subtext">🔥 12 Day Streak • 💎 +50 XP</div>
                </div>
                <div class="play-btn-circle">▶</div>
            </div>

            <!-- 2. THE 2x2 WORLD GRID -->
            <div class="subject-grid-elite">
                ${subjects.map(sub => renderSubjectCard(sub)).join('')}
            </div>
        </div>
    `;

    // Ensure the navigation highlights the Home tab
    if(window.updateNavIndicator) window.updateNavIndicator();
};