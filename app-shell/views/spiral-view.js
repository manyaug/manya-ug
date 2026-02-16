import { AudioManager } from '../../app-shell/js/audio-manager.js';

export const renderSpiral = (mount, subject) => {
    const tileHeight = 850;
    const overlap = 40;
    const hour = new Date().getHours();
    const isNight = hour >= 18 || hour < 6;

    // --- DATA ---
    const scienceSyllabus = [
        { id: "q1", title: "Skeletons" }, { id: "q2", title: "Framework" },
        { id: "q3", title: "Skull" }, { id: "q4", title: "Ribs" }
    ];

    let nodes = [];
    scienceSyllabus.forEach(topic => {
        nodes.push({ tid: topic.id, label: 'Warmup', icon: '🌱' });
        nodes.push({ tid: topic.id, label: 'Research', icon: '🔬' });
        nodes.push({ tid: topic.id, label: 'Drill', icon: '⚡' });
        nodes.push({ tid: topic.id, label: 'Mastery', icon: '🏆' });
    });

    const progress = parseInt(localStorage.getItem(`manya_prog_${subject}`) || 0);
    const rawCoords = [{x:53,y:95},{x:45,y:86},{x:39,y:77},{x:52,y:69},{x:51,y:58},{x:50,y:47},{x:54,y:38},{x:44,y:29}];
    const pathTemplate = rawCoords.filter((_, i) => i % 2 === 0);
    const nodesPerTile = pathTemplate.length;
    const totalTiles = Math.ceil(nodes.length / nodesPerTile);

    // CRITICAL: The total height calculation that matches the CSS overlap
    const totalHeight = (totalTiles * (tileHeight - overlap)) + overlap;

    const atmosphere = () => {
        let h = '';
        for (let i = 0; i < 70; i++) {
            const left = Math.random() * 95;
            const top = Math.random() * totalHeight;
            const delay = Math.random() * 15;
            const type = Math.random() > 0.4 ? 'firefly' : 'leaf';
            h += `<div class="${type}" style="left:${left}%; top:${top}px; animation-delay:-${delay}s"></div>`;
        }
        return h;
    };

    mount.innerHTML = `
        <div id="spiral-stage" class="spiral-view animate-in ${isNight ? 'night' : 'day'}">
            <div class="time-overlay"></div>
            <div class="rain-layer"></div>
            <div id="sun-gust" class="sun-gust"></div>
            <div id="star-mount" style="position:fixed; inset:0; z-index:100; pointer-events:none;"></div>

            <div class="glass-header">
                <div class="header-left">
                    <button class="back-btn" onclick="ViewManager.goBack()">
                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke-linecap="round"/></svg>
                    </button>
                    <div class="header-center">
                        <span class="subject-title">${subject.toUpperCase()}</span>
                    </div>
                </div>
                <div class="currency-pill"><span>💎</span> 120</div>
            </div>

            <div class="spiral-map-container" id="scroll-frame">
                <div class="map-canvas">
                    
                    <!-- 1. NATURAL IMAGE STACK (Dictates height) -->
                    <div class="image-stack">
                        ${Array(totalTiles).fill(0).map((_, i) => {
                            const imgNum = ((totalTiles - i - 1) % 8) + 1;
                            return `<img src="assets/icons/science_path/way-${imgNum}.png" class="physical-tile">`;
                        }).join('')}
                    </div>

                    <!-- 2. ATMOSPHERE -->
                    <div class="biome-layer">${atmosphere()}</div>

                    <!-- 3. SEAM MIST -->
                    ${Array(totalTiles-1).fill(0).map((_, i) => {
                        const y = (i + 1) * (tileHeight - overlap);
                        return `<div class="seam-mist" style="top: ${y - 70}px;"></div>`;
                    }).join('')}
                        
                    <!-- 4. NODES (Positioned relative to image stack height) -->
                    <div class="nodes-overlay">
                        ${nodes.map((n, i) => {
                            const status = i < progress ? 'completed' : (i === progress ? 'active' : 'locked');
                            const tileIdx = Math.floor(i / nodesPerTile);
                            const point = pathTemplate[i % nodesPerTile];
                            
                            // PRECISE POSITIONING MATH
                            const yOnTile = (100 - point.y) * tileHeight / 100;
                            const topPos = totalHeight - ((tileIdx * (tileHeight - overlap)) + yOnTile);

                            return `
                            <div id="node-${i}" class="game-node ${status}" style="top:${topPos}px; left:${point.x + 3}%">
                                ${status === 'active' ? `<div class="mascot-marker" style="background-image: url('https://cdn-icons-png.flaticon.com/512/4826/4826972.png')"></div>` : ''}
                                <div class="node-cap" onclick="AudioManager.playSFX('https://www.soundjay.com/buttons/sounds/button-16.mp3')">
                                    ${status === 'completed' ? '✔' : (status === 'locked' ? '🔒' : n.icon)}
                                </div>
                                <div class="node-title">${n.label}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>`;

    // --- DIRECTOR LOGIC (Day/Night 30s) ---
    const stage = document.getElementById('spiral-stage');
    let cycleState = isNight;
    const cycleInterval = setInterval(() => {
        cycleState = !cycleState;
        stage.classList.toggle('day', !cycleState);
        stage.classList.toggle('night', cycleState);
        AudioManager.transitionTo(cycleState ? 'night' : 'day');
    }, 30000);

    // Weather Events
    const eventInterval = setInterval(() => {
        if (!cycleState) { // Day weather
            if (Math.random() < 0.4) {
                stage.classList.add('raining');
                AudioManager.playWeather(true);
                setTimeout(() => { stage.classList.remove('raining'); AudioManager.playWeather(false); }, 12000);
            }
        } else if (Math.random() > 0.5) { // Night Star
            const star = document.createElement('div');
            star.className = 'shooting-star star-active';
            star.style.left = Math.random() * 80 + '%';
            star.style.top = Math.random() * 40 + '%';
            document.getElementById('star-mount').appendChild(star);
            setTimeout(() => star.remove(), 2000);
        }
    }, 10000);

    const originalShow = ViewManager.show;
    ViewManager.show = function() { 
        clearInterval(cycleInterval); 
        clearInterval(eventInterval); 
        originalShow.apply(this, arguments); 
    };

    // SCROLL TO PROGRESS
    setTimeout(() => {
        const frame = document.getElementById('scroll-frame');
        const activeNode = document.getElementById(`node-${progress}`);
        if (frame && activeNode) frame.scrollTo({ top: activeNode.offsetTop - 350, behavior: 'auto' });
        else if (frame) frame.scrollTop = frame.scrollHeight;
        AudioManager.playAmbient();
    }, 100);
};