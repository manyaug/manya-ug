export const renderSpiral = (mount, subject) => {
    // 1. DATA: Your 11 path points
    const rawCoords = [
        { x: 53.06, y: 95.93 }, { x: 45.58, y: 86.76 }, { x: 39.45, y: 77.4 },
        { x: 52.04, y: 69.01 }, { x: 51.02, y: 58.68 }, { x: 50.68, y: 47.95 },
        { x: 54.76, y: 38.59 }, { x: 44.9,  y: 29.82 }, { x: 43.19, y: 22.21 },
        { x: 52.38, y: 14.61 }, { x: 54.08, y: 6.61 }
    ];
    
    // SKIP EVERY OTHER POINT for breathing room
    const pathTemplate = rawCoords.filter((_, i) => i % 2 === 0);

    const scienceSyllabus = [
        { id: "q1", title: "Skeletons" }, { id: "q2", title: "Overview" },
        { id: "q3", title: "Backbone" }, { id: "q4", title: "Rib Cage" },
        { id: "q5", title: "Limbs" }, { id: "q6", title: "Joints" }
    ];

    let nodes = [];
    scienceSyllabus.forEach(topic => {
        nodes.push({ tid: topic.id, type: 'WARMUP', label: 'WARMUP', icon: '🌱' });
        nodes.push({ tid: topic.id, type: 'STUDY', label: 'RESEARCH', icon: '🔬' });
        nodes.push({ tid: topic.id, type: 'PRACTICE', label: 'DRILL', icon: '⚡' });
        nodes.push({ tid: topic.id, type: 'MASTERY', label: 'MASTERY', icon: '🏆' });
    });

    const progress = parseInt(localStorage.getItem(`manya_prog_${subject}`) || 0);
    const points = localStorage.getItem('manya_points') || 0;

    // --- TILING ENGINE ---
    const tileHeight = 850; 
    // We add +1 extra tile at the bottom as a "Start zone" to remove the green block
    const totalTiles = Math.ceil(nodes.length / pathTemplate.length) + 1;
    const totalHeight = totalTiles * tileHeight;

    mount.innerHTML = `
        <div class="spiral-view animate-in">
            <header class="pro-header" style="z-index: 100;">
                <button class="icon-btn" onclick="ViewManager.show('home')">←</button>
                <div class="header-pill points-badge" style="background:#1e293b; color:white;">⭐ <span>${points}</span></div>
                <div class="header-pill" style="color:#16a34a; border-color:#16a34a;">SCIENCE WORLD</div>
            </header>

            <div class="spiral-map-container" id="scroll-frame">
                <!-- THE GROUND LAYER (Stacked Images) -->
                <div class="map-bg-stack">
                    ${Array(totalTiles).fill(0).map(() => `
                        <img src="../../assets/icons/way-3.png" class="map-tile">
                    `).join('')}
                </div>

                <!-- THE NODES LAYER -->
                <div class="nodes-overlay" style="height: ${totalHeight}px">
                    ${nodes.map((n, i) => {
                        const status = i < progress ? 'completed' : (i === progress ? 'active' : 'locked');
                        
                        const tileIdx = Math.floor(i / pathTemplate.length);
                        const pointIdx = i % pathTemplate.length;
                        const point = pathTemplate[pointIdx];

                        // Calculate Y starting from the bottom of the map
                        const tileOffset = (totalTiles - 1 - tileIdx) * tileHeight;
                        const topPos = tileOffset + (point.y * tileHeight / 100);

                        return `
                        <div id="node-${i}" class="game-node ${status}" 
                             style="top: ${topPos}px; left: ${point.x}%;">
                            <div class="node-cap" onclick="window.handleLabClick('${subject}', '${n.tid}', '${n.type}', ${i})">
                                ${status === 'completed' ? '✔' : n.icon}
                            </div>
                            <div class="node-base"></div>
                            
                            <!-- Star Holder -->
                            <div class="star-holder">
                                <span class="star-mini">★</span>
                                <span class="star-mini">★</span>
                                <span class="star-mini">★</span>
                            </div>

                            <div class="node-label-pro">${n.label}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;

    // AUTO-FOCUS CAMERA
    setTimeout(() => {
        const frame = document.getElementById('scroll-frame');
        const activeNode = document.getElementById(`node-${progress}`);
        if(activeNode) frame.scrollTop = activeNode.offsetTop - 250;
    }, 150);
};