export const renderSpiral = (mount, subject) => {
    const tileHeight = 850;
    const hour = new Date().getHours();
    const isNight = hour >= 18 || hour < 6;

    // Syllabus Setup
    const scienceSyllabus = [
        { id: "q1", title: "Skeletons", icon: "🌱" },
        { id: "q2", title: "Framework", icon: "🔬" },
        { id: "q3", title: "Skull", icon: "⚡" },
        { id: "q4", title: "Ribs", icon: "🏆" }
    ];

    let nodes = [];
    scienceSyllabus.forEach(topic => {
        nodes.push({ tid: topic.id, label: 'Warmup', icon: '🌱' });
        nodes.push({ tid: topic.id, label: 'Research', icon: '🔬' });
        nodes.push({ tid: topic.id, label: 'Drill', icon: '⚡' });
        nodes.push({ tid: topic.id, label: 'Mastery', icon: '🏆' });
    });

    const progress = parseInt(localStorage.getItem(`manya_prog_${subject}`) || 0);
    const rawCoords = [{x:53,y:95},{x:45,y:86},{x:39,y:77},{x:52,y:69},{x:51,y:58},{x:50,y:47},{x:54,y:38},{x:44,y:29},{x:43,y:22},{x:52,y:14}];
    const pathTemplate = rawCoords.filter((_, i) => i % 2 === 0);
    
    const nodesPerTile = pathTemplate.length;
    const totalTiles = Math.ceil(nodes.length / nodesPerTile);
    const totalHeight = totalTiles * tileHeight;

    const atmosphere = () => {
        let h = '';
        for (let i = 0; i < 30; i++) { // Reduced count for stability
            const left = Math.random() * 95;
            const top = Math.random() * totalHeight;
            const delay = Math.random() * 15;
            h += `<div class="firefly" style="left:${left}%; top:${top}px; animation-delay:-${delay}s"></div>`;
        }
        return h;
    };

    mount.innerHTML = `
        <div class="spiral-view animate-in ${isNight ? 'night' : 'day'}">
            <div class="time-overlay"></div>

            <div class="glass-header">
                <div class="header-left">
                    <button class="back-btn" onclick="ViewManager.goBack()">
                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <div class="header-center">
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
                            const imgNum = ((totalTiles - i - 1) % 8) + 1;
                            return `<img src="assets/icons/science_path/way-${imgNum}.png" class="physical-tile" loading="lazy">`;
                        }).join('')}
                    </div>

                    <div class="biome-layer" style="position: absolute; inset: 0; pointer-events: none; z-index: 5;">
                        ${atmosphere()}
                    </div>
                        
                    <div class="nodes-overlay">
                        ${nodes.map((n, i) => {
                            const status = i < progress ? 'completed' : (i === progress ? 'active' : 'locked');
                            const tileIdx = Math.floor(i / nodesPerTile);
                            const point = pathTemplate[i % nodesPerTile];
                            const topPos = totalHeight - ((tileIdx * tileHeight) + ((100 - point.y) * tileHeight / 100));
                            
                            return `
                            <div id="node-${i}" class="game-node ${status}" style="top: ${topPos}px; left: ${point.x + 3}%;">
                                ${status === 'active' ? `<div class="mascot-marker" style="background-image: url('https://cdn-icons-png.flaticon.com/512/4826/4826972.png');"></div>` : ''}
                                <div class="node-cap" onclick="ViewManager.AudioManager.playSFX();">
                                    ${status === 'completed' ? '✔' : (status === 'locked' ? '🔒' : n.icon)}
                                </div>
                                <div class="node-title">${n.label}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>`;

    // Snap Camera
    setTimeout(() => {
        const frame = document.getElementById('scroll-frame');
        const activeNode = document.getElementById(`node-${progress}`);
        if (frame) {
            if (activeNode) frame.scrollTo({ top: activeNode.offsetTop - 300, behavior: 'auto' });
            else frame.scrollTop = frame.scrollHeight;
        }
    }, 100);
};