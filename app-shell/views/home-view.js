export const renderHome = (mount) => {
    mount.innerHTML = `
        <div class="manya-hub animate-in">
            
            <!-- REPAIRED LIBRARY CARD -->
            <div class="library-hero-card" onclick="ViewManager.show('library')">
                <div class="lib-content">
                    <span class="badge-pill">OPEN THE VAULT</span>
                    <h2>Topic Library</h2>
                    <p>Unlock 2,000+ PLE questions with step-by-step logic.</p>
                    <button class="lib-btn-glass">BROWSE ALL →</button>
                </div>
                <img src="assets/icons/library_3d_books.png" style="width: 100px; z-index:2; filter: drop-shadow(0 15px 25px rgba(0,0,0,0.4));">
            </div>

            <div class="section-header" style="display:flex; justify-content:space-between; margin-bottom:20px; align-items:center;">
                <h3 style="font-weight:900; color:#1e293b; margin:0;">Your Adventure</h3>
                <span style="font-size:10px; font-weight:800; background:#db2777; color:white; padding:4px 12px; border-radius:50px;">NEW CONTENT</span>
            </div>

            <div class="subject-grid">
                ${renderSubjectCard('Mathematics', 'assets/icons/math_land.png', 45, 'math')}
                ${renderSubjectCard('Science', 'assets/icons/science_island.png', 20, 'science')}
                ${renderSubjectCard('Social Studies', 'assets/icons/sst_island.png', 10, 'sst')}
                ${renderSubjectCard('English', 'assets/icons/english_island.png', 80, 'english')}
            </div>
        </div>
    `;
};

function renderSubjectCard(title, img, progress, id) {
    return `
        <div class="world-card ${id}" onclick="ViewManager.show('spiral', null, '${id}')">
            <div class="island-box">
                <!-- THE GLOW LAYER -->
                <div class="glow-aura"></div>
                <img src="${img}" class="floating-island">
            </div>
            <h4 style="font-weight:900; color:#1e293b; margin:0;">${title}</h4>
            
            <div class="prog-bar-container">
                <div class="fill" style="width: ${progress}%"></div>
            </div>
            <div class="prog-label">
                <span>PROGRESS</span>
                <span style="color: #db2777">${progress}%</span>
            </div>
        </div>
    `;
}