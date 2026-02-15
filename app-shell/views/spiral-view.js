export const renderSpiral = (mount, subject) => {
    // 1. YOUR PIXEL DATA (Sampled - taking every 2nd point for gaps)
    const rawCoords = [
        { x: 53.06, y: 95.93 }, { x: 45.58, y: 86.76 }, { x: 39.45, y: 77.4 },
        { x: 52.04, y: 69.01 }, { x: 51.02, y: 58.68 }, { x: 50.68, y: 47.95 },
        { x: 54.76, y: 38.59 }, { x: 44.9,  y: 29.82 }, { x: 43.19, y: 22.21 },
        { x: 52.38, y: 14.61 }, { x: 54.08, y: 6.61 }
    ];
    // This gives us roughly 6 nodes per image tile
    const pathTemplate = rawCoords.filter((_, i) => i % 2 === 0);

    const scienceSyllabus = [
        { id: "q1", title: "Skeletons" }, { id: "q2", title: "Framework" },
        { id: "q3", title: "Skull" }, { id: "q4", title: "Ribs" },
        { id: "q5", title: "Limbs" }, { id: "q6", title: "Joints" },
        { id: "q7", title: "Muscles" }, { id: "q8", title: "Action" }
    ];

    let nodes = [];
    scienceSyllabus.forEach(topic => {
        nodes.push({ tid: topic.id, type: 'WARMUP', label: 'Warmup', icon: '🌱' });
        nodes.push({ tid: topic.id, type: 'STUDY', label: 'Research', icon: '🔬' });
        nodes.push({ tid: topic.id, type: 'PRACTICE', label: 'Drill', icon: '⚡' });
        nodes.push({ tid: topic.id, type: 'MASTERY', label: 'Mastery', icon: '🏆' });
    });

    const progress = parseInt(localStorage.getItem(`manya_prog_${subject}`) || 0);
    
    // --- TILING MATH ---
    const tileHeight = 850; 
    const nodesPerTile = pathTemplate.length;
    const totalTiles = Math.ceil(nodes.length / nodesPerTile);
    const totalHeight = totalTiles * tileHeight;

    mount.innerHTML = `
        <div class="spiral-view animate-in">
            <header class="pro-header">
                <button class="icon-btn" onclick="ViewManager.show('home')">←</button>
                <div class="header-pill science-tag">SCIENCE QUEST</div>
                <div class="header-pill points-badge">⭐ <span>${localStorage.getItem('manya_points') || 0}</span></div>
            </header>

            <div class="spiral-map-container" id="scroll-frame">
                <div class="map-canvas" style="height: ${totalHeight}px;">
                    
                    <!-- 1. THE FLOOR: Stacking your 8 unique images -->
                    <div class="image-stack">
                        ${Array(totalTiles).fill(0).map((_, i) => {
                            // Cycles through your way-1 to way-8 images
                            const num = (i % 8) + 1; 
                            return `<img src="assets/icons/science_path/way-${num}.png" class="physical-tile">`;
                        }).reverse().join('')}
                    </div>

                    <!-- 2. THE NODES: Positioned on the floor -->
                    <div class="nodes-overlay">
                        ${nodes.map((n, i) => {
                            const status = i < progress ? 'completed' : (i === progress ? 'active' : 'locked');
                            
                            const tileIdx = Math.floor(i / nodesPerTile);
                            const pointIdx = i % nodesPerTile;
                            const point = pathTemplate[pointIdx];

                            // MATH: Calculate Y from the bottom up
                            const yFromBottom = (tileIdx * tileHeight) + ((100 - point.y) * tileHeight / 100);
                            const topPos = totalHeight - yFromBottom;

                            return `
                            <div id="node-${i}" class="game-node ${status}" 
                                 style="top: ${topPos}px; left: ${point.x + 3}%;">
                                <div class="star-tray">
                                    <span class="star-dot">★</span><span class="star-dot">★</span><span class="star-dot">★</span>
                                </div>
                                <div class="node-cap" onclick="window.handleLabClick('${subject}', '${n.tid}', '${n.type}', ${i})">
                                    ${status === 'completed' ? '✔' : n.icon}
                                </div>
                                <div class="node-base"></div>
                                <div class="node-title">${n.label}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>`;

    // AUTO-LOCATE: Snap camera to Manya's current node
    setTimeout(() => {
        const frame = document.getElementById('scroll-frame');
        const activeNode = document.getElementById(`node-${progress}`);
        if(activeNode) frame.scrollTop = activeNode.offsetTop - (frame.offsetHeight / 2) + 50;
    }, 100);
};