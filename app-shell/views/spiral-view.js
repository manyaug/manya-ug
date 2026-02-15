export const renderSpiral = (mount, subject) => {
    const tileHeight = 850;
    const scienceSyllabus = [
        { id: "q1", title: "Skeletons" }, { id: "q2", title: "Framework" },
        { id: "q3", title: "Skull" }, { id: "q4", title: "Ribs" },
        { id: "q5", title: "Limbs" }, { id: "q6", title: "Joints" }
    ];

    let nodes = [];
    scienceSyllabus.forEach(topic => {
        nodes.push({ tid: topic.id, type: 'WARMUP', label: 'Warmup', icon: '🌱' });
        nodes.push({ tid: topic.id, type: 'STUDY', label: 'Research', icon: '🔬' });
        nodes.push({ tid: topic.id, type: 'PRACTICE', label: 'Drill', icon: '⚡' });
        nodes.push({ tid: topic.id, type: 'MASTERY', label: 'Mastery', icon: '🏆' });
    });

    const progress = parseInt(localStorage.getItem(`manya_prog_${subject}`) || 0);
    const rawCoords = [
        { x: 53.06, y: 95.93 }, { x: 45.58, y: 86.76 }, { x: 39.45, y: 77.4 },
        { x: 52.04, y: 69.01 }, { x: 51.02, y: 58.68 }, { x: 50.68, y: 47.95 },
        { x: 54.76, y: 38.59 }, { x: 44.9,  y: 29.82 }, { x: 43.19, y: 22.21 },
        { x: 52.38, y: 14.61 }, { x: 54.08, y: 6.61 }
    ];
    const pathTemplate = rawCoords.filter((_, i) => i % 2 === 0);
    const nodesPerTile = pathTemplate.length;
    const totalTiles = Math.ceil(nodes.length / nodesPerTile);
    const totalHeight = totalTiles * tileHeight;

    mount.innerHTML = `
        <div class="spiral-view animate-in">
            
            <div class="glass-header">
                <div class="header-left">
                    <div class="back-btn" onclick="ViewManager.goBack()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
                    </div>
                    <div class="header-center">
                        <span class="subject-label">PRIMARY SEVEN</span>
                        <span class="subject-title">${subject.toUpperCase()}</span>
                    </div>
                </div>
                <div class="currency-pill"><span>💎</span> 120</div>
            </div>

            <div class="spiral-map-container" id="scroll-frame">
     
                <div class="god-rays"></div>

                <div class="map-canvas" style="height: ${totalHeight}px;">
                    
                    <div class="image-stack">
                        ${Array(totalTiles).fill(0).map((_, i) => {
                            const wayNum = totalTiles - i;
                            const imageNum = ((wayNum - 1) % 8) + 1;
                            // FALLBACK: If way-x.png is missing, it shows a beautiful green forest texture
                            return `<img src="assets/icons/science_path/way-${imageNum}.png" 
                                         class="physical-tile" 
                                         onerror="this.src='https://img.freepik.com/free-photo/vibrant-green-leaf-texture-nature-background_53876-139682.jpg'; this.style.opacity='0.4'">`;
                        }).join('')}
                    </div>

                    <div style="position: absolute; inset: 0; pointer-events: none; z-index: 5;">
                        ${Array(10).fill(0).map(() => `<div class="firefly" style="left:${Math.random()*100}%; top:${Math.random()*100}%"></div>`).join('')}
                    </div>
                        
                    <div class="nodes-overlay">
                        ${nodes.map((n, i) => {
                            const status = i < progress ? 'completed' : (i === progress ? 'active' : 'locked');
                            const tileIdx = Math.floor(i / nodesPerTile);
                            const pointIdx = i % nodesPerTile;
                            const point = pathTemplate[pointIdx];
                            const yFromBottom = (tileIdx * tileHeight) + ((100 - point.y) * tileHeight / 100);
                            const topPos = totalHeight - yFromBottom;

                            return `
                            <div id="node-${i}" class="game-node ${status}" style="top: ${topPos}px; left: ${point.x + 3}%;">
                                ${status === 'active' ? `<div class="mascot-marker" style="background-image: url('https://cdn-icons-png.flaticon.com/512/4826/4826972.png');"></div>` : ''}
                                <div class="node-cap" onclick="ViewManager.AudioManager.playSFX(); console.log('Level ${i}')">
                                    ${status === 'completed' ? '✔' : (status === 'locked' ? '🔒' : n.icon)}
                                </div>
                                <div class="node-title">${n.label}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>

            </div>

        </div>`;

    setTimeout(() => {
        const frame = document.getElementById('scroll-frame');
        const activeNode = document.getElementById(`node-${progress}`);
        if (frame && activeNode) {
            frame.scrollTo({ top: activeNode.offsetTop - 300, behavior: 'auto' });
        } else if (frame) {
            frame.scrollTop = frame.scrollHeight;
        }
    }, 100);
};