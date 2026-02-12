export const renderSpiral = (mount, subject) => {
    const themes = {
        math: { color: '#db2777', bg: '#fdf2f8', accent: '#be185d', label: 'Mathematics' },
        science: { color: '#16a34a', bg: '#f0fdf4', accent: '#15803d', label: 'Science' },
        sst: { color: '#0ea5e9', bg: '#f0f9ff', accent: '#0369a1', label: 'Social Studies' },
        english: { color: '#7c3aed', bg: '#f5f3ff', accent: '#6d28d9', label: 'English' }
    };
    const theme = themes[subject] || themes.math;

    // GENERATE 20 LEVELS
    const levels = [];
    for(let i=1; i<=20; i++) {
        let status = 'locked';
        if(i < 8) status = 'completed';
        if(i === 8) status = 'active'; // Manya is here
        
        let type = 'star';
        if(i % 5 === 0) type = 'chest'; // Boss Level every 5
        else if(i % 2 === 0) type = 'book';
        
        levels.push({ id: i, type, status });
    }

    const icons = { star:'⭐', book:'📖', chest:'🎁' };
    const svgHeight = levels.length * 100 + 150; // Dynamic height

    mount.innerHTML = `
        <div class="spiral-view animate-in" style="background:${theme.bg}; --theme-color:${theme.color}; --theme-accent:${theme.accent}">
            
            <div class="spiral-header sticky">
                <div class="header-row">
                    <button class="nav-back-btn" onclick="ViewManager.show('home')">←</button>
                    <div class="subject-capsule">
                        <span class="s-name">${theme.label}</span>
                    </div>
                    <div class="currency-capsule">💎 120</div>
                </div>
            </div>

            <div class="spiral-map-container">
                <div class="bg-pattern"></div>
                
                <!-- THE INFINITE CURVE -->
                <svg class="spiral-svg" width="100%" height="${svgHeight}px" preserveAspectRatio="none">
                    <path d="M 50 20 
                             Q 90 80 50 140 T 50 260 T 50 380 T 50 500 T 50 620 T 50 740 T 50 860 T 50 980 T 50 1100 T 50 1220 T 50 1340 T 50 1460 T 50 1580 T 50 1700 T 50 1820 T 50 1940 T 50 2060" 
                          stroke="white" stroke-width="14" stroke-linecap="round" fill="none"/>
                    <path d="M 50 20 
                             Q 90 80 50 140 T 50 260 T 50 380 T 50 500 T 50 620 T 50 740 T 50 860 T 50 980 T 50 1100 T 50 1220 T 50 1340 T 50 1460 T 50 1580 T 50 1700 T 50 1820 T 50 1940 T 50 2060" 
                          stroke="${theme.color}" stroke-width="6" stroke-dasharray="15 15" stroke-linecap="round" fill="none" opacity="0.4"/>
                </svg>

                <div class="nodes-wrapper">
                    ${levels.map((lvl, index) => {
                        let pos = 'center';
                        if(index % 4 === 1) pos = 'right';
                        if(index % 4 === 3) pos = 'left';
                        
                        return `
                        <div class="node-row ${pos}" style="z-index: ${50 - index}">
                            ${lvl.status === 'active' ? 
                                `<div class="manya-container">
                                    <img src="assets/icons/pose_1.png" class="manya-3d-float">
                                 </div>` : ''}
                            
                            <div class="game-node ${lvl.status} ${lvl.type === 'chest' ? 'boss-node' : ''}" 
                                 onclick="alert('Start Quest ${lvl.id}')">
                                <div class="node-cap"><span class="n-icon">${icons[lvl.type]}</span></div>
                                <div class="node-base"></div>
                                ${lvl.status === 'completed' && lvl.type !== 'chest' ? '<div class="star-rating">⭐⭐⭐</div>' : ''}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
                <div style="height: 100px;"></div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const activeNode = document.querySelector('.game-node.active');
        if(activeNode) activeNode.scrollIntoView({behavior: "smooth", block: "center"});
    }, 100);
};