import { ManyaDB } from '../manya-db.js';

const renderSubjectCard = (sub) => {
    return `
        <div class="world-card-elite ${sub.id}" onclick="ViewManager.show('spiral', null, '${sub.id}')">
            
            <!-- NEW: FLOATING GEM BOUNTY PILL -->
            <div class="card-gem-bounty">
                <img src="${sub.gemFile}" class="bounty-gem-icon" alt="${sub.name} Gem">
                <span class="bounty-gem-count" style="color: ${sub.color}">${sub.gems}</span>
            </div>

            <div class="island-stage">
                <!-- THE THOR GLOW ELEMENT -->
                <div class="island-halo" style="background: ${sub.color}"></div>
                <img src="${sub.icon}" class="floating-island">
            </div>
            
            <div class="card-footer-info">
                <h4>${sub.name}</h4>
                <div class="mini-striped-track">
                    <div class="mini-striped-fill" style="width: ${sub.progress}%; background-color: ${sub.color}"></div>
                </div>
                <span class="pct-text">${sub.progress}% EXPLORED</span>
            </div>
        </div>
    `;
};

export const renderHome = async (mount) => {
    const user = await ManyaDB.getCurrentUser();
    if (!user) return;

    // INJECTED GEM DATA & FILES
    const subjects = [
        { id: 'math', name: 'Mathematics', progress: user.prog_math || 45, gems: user.mathGems || 12, gemFile: 'assets/images/gems/math_gem.svg', icon: 'assets/images/math_island.png', color: '#6366F1' },
        { id: 'science', name: 'Science', progress: user.prog_science || 20, gems: user.scienceGems || 5, gemFile: 'assets/images/gems/science_svg.svg', icon: 'assets/images/science_island.png', color: '#10B981' },
        { id: 'sst', name: 'SST', progress: user.prog_sst || 10, gems: user.sstGems || 2, gemFile: 'assets/images/gems/sst_gem.svg', icon: 'assets/images/sst_island.png', color: '#F59E0B' },
        { id: 'english', name: 'English', progress: user.prog_english || 80, gems: user.englishGems || 24, gemFile: 'assets/images/gems/english_gem.svg', icon: 'assets/images/english_island.png', color: '#DB2777' }
    ];

    mount.innerHTML = `
        <div class="manya-hub animate-in">
            <!-- DYNAMIC AURORA BLOBS (For extra life) -->
            <div class="aurora-engine" style="position:fixed; inset:0; z-index:-1; pointer-events:none;">
                <div class="blob aurora-1"></div>
                <div class="blob aurora-2"></div>
            </div>

            <!-- HERO RESUME CARD (THE BOUNTY BOARD) -->
            <div class="resume-mission-card" onclick="ViewManager.show('spiral', null, 'math')">
                
                <!-- NEW: EPIC GEM WATERMARK IN BACKGROUND -->
                <img src="assets/images/gems/math_gem.svg" class="hero-bg-gem-watermark">

                <div class="mission-visual">
                    <div class="hero-avatar-mini-glow">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}">
                    </div>
                </div>
                
                <div class="mission-details">
                    <span class="mission-kicker">CURRENT BOUNTY</span>
                    <h3 class="mission-title">Set Theory Mastery</h3>
                    <div class="mission-tags">
                        <span class="tag"><img src="assets/images/gems/math_gem.svg" style="width:12px; height:12px; margin-right:4px;"> +3 Loot</span>
                        <span class="tag">🔥 12d Streak</span>
                    </div>
                </div>
                
                <div class="play-pill-neon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="white" style="margin-left:3px;"><path d="M8 5v14l11-7z"/></svg>
                </div>
            </div>

            <!-- 2x2 GRID -->
            <div class="subject-grid-elite">
                ${subjects.map(sub => renderSubjectCard(sub)).join('')}
            </div>
        </div>
    `;
};