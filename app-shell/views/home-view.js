import { ManyaDB } from '../manya-db.js';

const renderSubjectCard = (sub) => {
    return `
        <div class="world-card-elite ${sub.id}" onclick="ViewManager.show('spiral', null, '${sub.id}')">
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
                <span class="pct-text">${sub.progress}% DONE</span>
            </div>
        </div>
    `;
};

export const renderHome = async (mount) => {
    const user = await ManyaDB.getCurrentUser();
    if (!user) return;

    const subjects = [
        { id: 'math', name: 'Mathematics', progress: user.prog_math || 45, icon: 'assets/images/math_island.png', color: '#6366F1' },
        { id: 'science', name: 'Science', progress: user.prog_science || 20, icon: 'assets/images/science_island.png', color: '#10B981' },
        { id: 'sst', name: 'SST', progress: user.prog_sst || 10, icon: 'assets/images/sst_island.png', color: '#F59E0B' },
        { id: 'english', name: 'English', progress: user.prog_english || 80, icon: 'assets/images/english_island.png', color: '#DB2777' }
    ];

    mount.innerHTML = `
        <div class="manya-hub animate-in">
            <!-- DYNAMIC AURORA BLOBS (For extra life) -->
            <div class="aurora-engine" style="position:fixed; inset:0; z-index:-1; pointer-events:none;">
                <div class="blob" style="position:absolute; width:400px; height:400px; background:var(--manya-purple); filter:blur(120px); top:-100px; left:-100px; opacity:0.3;"></div>
                <div class="blob" style="position:absolute; width:400px; height:400px; background:var(--manya-pink); filter:blur(120px); bottom:-50px; right:-50px; opacity:0.3;"></div>
            </div>

            <!-- HERO RESUME CARD -->
            <div class="resume-mission-card" onclick="ViewManager.show('spiral', null, 'math')">
                <div class="mission-visual">
                    <div class="hero-avatar-mini-glow" style="width:65px; height:65px; border-radius:50%; border:2.5px solid #818CF8; background:rgba(255,255,255,0.1); overflow:hidden;">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}" style="width:100%">
                    </div>
                </div>
                <div class="mission-details" style="flex:1; margin-left:15px;">
                    <span style="font-size:9px; font-weight:900; color:#818CF8; letter-spacing:2px;">RESUME ADVENTURE</span>
                    <h3 style="margin:4px 0; color:white; font-size:18px;">Set Theory Mastery</h3>
                    <div style="display:flex; gap:8px;">
                        <span style="background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:100px; font-size:10px; font-weight:800; color:white;">🔥 12d</span>
                        <span style="background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:100px; font-size:10px; font-weight:800; color:white;">🎯 Agg 4</span>
                    </div>
                </div>
                <div class="play-pill-neon" style="width:48px; height:48px; background:#7c3aed; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 20px rgba(124, 58, 237, 0.6);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                </div>
            </div>

            <!-- 2x2 GRID -->
            <div class="subject-grid-elite">
                ${subjects.map(sub => renderSubjectCard(sub)).join('')}
            </div>
        </div>
    `;
};