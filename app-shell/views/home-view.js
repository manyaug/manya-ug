/**
 * MANYA HOME VIEW - SEAMLESS KIDTOPIA EDITION
 */

// Helper function to build subject cards (defined outside to be safe)
const renderWorldCard = (title, img, progress, id) => {
    return `
        <div class="world-card-elite ${id}" onclick="ViewManager.show('spiral', null, '${id}')">
            <div class="island-stage">
                <div class="glow-aura"></div>
                <img src="${img}" class="floating-island">
            </div>
            <h4>${title}</h4>
            <div class="mini-progress-track">
                <div class="fill" style="width: ${progress}%"></div>
            </div>
            <div class="prog-stats">
                <span>PROGRESS</span>
                <span class="count">${progress}%</span>
            </div>
        </div>
    `;
};

export const renderHome = (mount) => {
    // Branded "M" Icon for the Library Card
    const manyaIcon = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiNkYjI3NzciLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NPC90ZXh0Pjwvc3ZnPg==`;

    mount.innerHTML = `
        <div class="manya-hub animate-in">
            
            <!-- 1. SIMPLIFIED LIBRARY CARD (SEAMLESS BEIGE) -->
            <div class="library-hero-card-elite" onclick="ViewManager.show('library')">
                <div class="lib-content">
                    <span class="lib-badge">SELF STUDY</span>
                    <h2>Topic Library</h2>
                    <p>Browse 2,000+ PLE questions with step-by-step logic.</p>
                    <button class="lib-action-btn">OPEN VAULT →</button>
                </div>
                <div class="lib-mascot-glow">
                    <img src="assets/icons/manya_icon.png" class="lib-mascot">
                </div>
            </div>

            <!-- 2. SECTION HEADER -->
            <div class="section-header-flex">
                <h3 class="section-title">Daily Adventure</h3>
                <span class="new-content-pill">NEW</span>
            </div>

            <!-- 3. CLEAN SUBJECT GRID -->
            <div class="subject-grid-elite">
                ${renderWorldCard('Mathematics', 'assets/icons/math_island.png', 45, 'math')}
                ${renderWorldCard('Science', 'assets/icons/science_island.png', 20, 'science')}
                ${renderWorldCard('SST', 'assets/icons/sst_island.png', 10, 'sst')}
                ${renderWorldCard('English', 'assets/icons/english_island.png', 80, 'english')}
            </div>

            <div style="height: 120px;"></div>
        </div>
    `;
};