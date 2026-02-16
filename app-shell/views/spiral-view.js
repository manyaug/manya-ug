import { AudioManager } from '../../app-shell/js/audio-manager.js';
import { SCIENCE_MAP, MATH_MAP } from '../../app-shell/js/curriclum.js';

export const renderSpiral = (mount, subject) => {
    // --- 1. GLOBAL SCOPE FIX ---
    window.AudioManager = AudioManager; // Allows onclick attributes to work

    // --- 2. THEME & DIMENSIONS ---
    const isMath = subject.toLowerCase() === 'math';
    const activeMap = isMath ? MATH_MAP : SCIENCE_MAP;
    const themeClass = isMath ? 'math' : 'science';
    const assetFolder = isMath ? 'math_path' : 'science_path';

    const tileHeight = 850;
    const overlap = 40; 
    const hour = new Date().getHours();
    const isNightInitial = hour >= 18 || hour < 6;

    // --- 3. BUILD SYLLABUS NODES ---
    let nodes = [];
    activeMap.forEach(quest => {
        nodes.push({ id: quest.id, label: 'Warmup', icon: isMath ? '❄️' : '🌱' });
        nodes.push({ id: quest.id, label: 'Research', icon: isMath ? '📖' : '🔬' });
        nodes.push({ id: quest.id, label: 'Drill', icon: '⚡' });
        nodes.push({ id: quest.id, label: 'Mastery', icon: '🏆' });
    });

    const progress = parseInt(localStorage.getItem(`manya_prog_${subject}`) || 0);
    const rawCoords = [{x:53,y:95},{x:45,y:86},{x:39,y:77},{x:52,y:69},{x:51,y:58},{x:50,y:47},{x:54,y:38},{x:44,y:29}];
    const pathTemplate = rawCoords.filter((_, i) => i % 2 === 0);
    
    // VOID-KILLER MATH: Height matches the physical overlap pixels
    const nodesPerTile = pathTemplate.length;
    const totalTiles = Math.ceil(nodes.length / nodesPerTile);
    const totalHeight = (totalTiles * (tileHeight - overlap)) + overlap;

    // --- 4. DYNAMIC GENERATORS ---
    const generateWeather = () => {
        let h = '';
        for (let i = 0; i < 120; i++) {
            const left = Math.random() * 130 - 30; // Coverage for slant
            const delay = Math.random() * 5;
            if (isMath) {
                const size = 3 + Math.random() * 4;
                const dur = 2 + Math.random() * 3;
                h += `<div class="snowflake" style="width:${size}px; height:${size}px; left:${left}%; animation-duration:${dur}s; animation-delay:-${delay}s;"></div>`;
            } else {
                const dur = 0.4 + Math.random() * 0.3;
                h += `<div class="rain-drop" style="left:${left}%; animation-duration:${dur}s; animation-delay:-${delay}s;"></div>`;
            }
        }
        return h;
    };

    const atmosphere = () => {
        let h = '';
        for (let i = 0; i < 60; i++) {
            h += `<div class="firefly" style="left:${Math.random()*95}%; top:${Math.random()*totalHeight}px; animation-delay:-${Math.random()*15}s"></div>`;
        }
        return h;
    };

    // --- 5. RENDER MAIN VIEW ---
    mount.innerHTML = `
        <div id="spiral-stage" class="spiral-view animate-in ${themeClass} ${isNightInitial ? 'night' : 'day'}">
            <div class="time-overlay"></div>
            <div class="cloudy-overlay"></div>
            
            <!-- WEATHER LAYER -->
            <div id="weather-layer" class="weather-mount">${generateWeather()}</div>

            <!-- VIEWPORT FX -->
            <div id="star-mount" style="position:fixed; inset:0; z-index:100; pointer-events:none;"></div>
            <div id="sun-gust" class="sun-gust"></div>

            <!-- GLASS HUD -->
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
                <div class="map-canvas">
                    
                    <!-- THE IMAGE STACK (Relative layout pushes height) -->
                    <div class="image-stack">
                        ${Array(totalTiles).fill(0).map((_, i) => {
                            const imgNum = ((totalTiles - i - 1) % 8) + 1;
                            const isLast = i === totalTiles - 1;
                            return `<img src="../../assets/icons/${assetFolder}/way-${imgNum}.png" 
                                         class="physical-tile" 
                                         style="margin-bottom:${isLast ? '0' : -overlap}px; z-index: ${i};">`;
                        }).join('')}
                    </div>

                    <div class="biome-layer" style="position:absolute; inset:0; pointer-events:none; z-index:10;">
                        ${atmosphere()}
                    </div>
                        
                    <div class="nodes-overlay">
                        ${nodes.map((n, i) => {
                            const status = i < progress ? 'completed' : (i === progress ? 'active' : 'locked');
                            const tileIdx = Math.floor(i / nodesPerTile);
                            const point = pathTemplate[i % nodesPerTile];
                            const yOnTile = (100 - point.y) * tileHeight / 100;
                            const topPos = totalHeight - ((tileIdx * (tileHeight - overlap)) + yOnTile);

                            return `
                            <div id="node-${i}" class="game-node ${status}" style="top: ${topPos}px; left: ${point.x + 3}%;">
                                ${status === 'active' ? `<div class="mascot-marker" style="background-image: url('../../assets/avatars/student_mascot.png')"></div>` : ''}
                                <div class="node-cap" onclick="AudioManager.playSFX()">
                                    ${status === 'completed' ? '✔' : (status === 'locked' ? '🔒' : n.icon)}
                                </div>
                                <div class="node-title">${n.label}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>`;

    // --- 6. DIRECTOR ENGINE (30s Cycle) ---
    const stage = document.getElementById('spiral-stage');
    const weatherLayer = document.getElementById('weather-layer');
    let isNight = isNightInitial;

    const cycleInterval = setInterval(() => {
        isNight = !isNight;
        stage.classList.toggle('day', !isNight);
        stage.classList.toggle('night', isNight);
        AudioManager.transitionTo(isNight ? 'night' : 'day');
        
        // Safety: Clear daytime weather if night hits
        if (isNight) {
            stage.classList.remove('active-weather', 'raining');
            AudioManager.playWeather(false);
        }
    }, 30000);

    const eventInterval = setInterval(() => {
        if (!isNight) {
            // DAY EVENTS (Rain or Wind)
            if (Math.random() < 0.5) {
                stage.classList.add('active-weather');
                if (!isMath) stage.classList.add('raining');
                AudioManager.playWeather(true);
                setTimeout(() => { 
                    stage.classList.remove('active-weather', 'raining');
                    AudioManager.playWeather(false); 
                }, 12000);
            }
        } else if (Math.random() > 0.5) {
            // NIGHT EVENTS (Shooting Star)
            const star = document.createElement('div');
            star.className = 'shooting-star star-active';
            star.style.left = (20 + Math.random() * 60) + '%';
            star.style.top = (10 + Math.random() * 30) + '%';
            document.getElementById('star-mount').appendChild(star);
            AudioManager.playSFX('../../assets/audios/shine.mp3', 0.1);
            setTimeout(() => star.remove(), 1600);
        }
    }, 10000);

    // --- 7. CLEANUP & INIT ---
    const originalShow = ViewManager.show;
    ViewManager.show = function() {
        clearInterval(cycleInterval);
        clearInterval(eventInterval);
        originalShow.apply(this, arguments);
    };

    setTimeout(() => {
        const frame = document.getElementById('scroll-frame');
        const activeNode = document.getElementById(`node-${progress}`);
        if (frame) {
            if (activeNode) frame.scrollTo({ top: activeNode.offsetTop - 350, behavior: 'auto' });
            else frame.scrollTop = frame.scrollHeight;
        }
        AudioManager.playAmbient();
    }, 100);
};