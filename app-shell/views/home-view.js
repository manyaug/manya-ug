/**
 * MANYA HOME VIEW - v12.0 ASTRO MASTER
 * Features: Full Mascot Visibility & High-Intensity Neon Aura
 */

const renderWorldCard = (title, img, progress, id) => {
    return `
        <div class="world-card-elite ${id}" onclick="ViewManager.show('spiral', null, '${id}')">
            <div class="island-stage">
                <div class="glow-aura"></div>
                <img src="${img}" class="floating-island">
            </div>
            
            <div class="card-footer-info">
                <h4>${title}</h4>
                <div class="prog-stats">
                    <span class="count">${progress}% Done</span>
                </div>
            </div>

            <div class="mini-progress-track">
                <div class="fill" style="width: ${progress}%"></div>
            </div>
        </div>
    `;
};

export const renderHome = (mount) => {
    mount.innerHTML = `
        <div class="manya-hub animate-in">
            <div class="bg-orb orb-1"></div>
            <div class="bg-orb orb-2"></div>

            <div class="section-header-flex">
                <h3 class="section-title">Your Adventure</h3>
                <span class="live-now-badge">LIVE NOW</span>
            </div>

            <div class="subject-grid-elite">
                ${renderWorldCard('Math', 'assets/icons/math_island.png', 45, 'math')}
                ${renderWorldCard('Science', 'assets/icons/science_island.png', 20, 'science')}
                ${renderWorldCard('SST', 'assets/icons/sst_island.png', 10, 'sst')}
                ${renderWorldCard('English', 'assets/icons/english_island.png', 80, 'english')}
            </div>

            <!-- THE ASTRO-LIBRARY (RECONSTRUCTED WITH FULL AURA) -->
            <div class="astro-library-outer">
                <div class="astro-library-card" onclick="ViewManager.show('library')">
                    <div class="astro-mesh"></div>
                    
                    <div class="astro-content-wrapper">
                        <div class="astro-text-box">
                            <span class="astro-badge">EXAM VAULT</span>
                            <h2>Topic Library</h2>
                            <p>2,500+ CHALLENGES</p>
                        </div>
                    </div>

                    <!-- FULLY VISIBLE MASCOT -->
                    <img src="assets/icons/manya_icon.png" class="lib-mascot-full">
                </div>
            </div>

            <div style="height: 150px;"></div>
        </div>
    `;
};