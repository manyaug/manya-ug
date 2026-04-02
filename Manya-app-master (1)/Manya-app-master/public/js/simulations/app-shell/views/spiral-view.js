/**
 * MANYA SPIRAL VIEW - FINAL UNIFIED MASTER
 * Handles: Science (Forest/Rain), Math (Snow/Ice), SST (Savannah/Dust)
 */

import { AudioManager } from '../../app-shell/js/audio-manager.js';
import { SCIENCE_MAP, MATH_MAP, SST_MAP } from '../../app-shell/js/curriclum.js';

export const renderSpiral = (mount, subject) => {
    // --- 1. GLOBAL SCOPE & THEME SETUP ---
    window.AudioManager = AudioManager; 
    const sub = subject.toLowerCase();
    
    // Choose the right map and assets based on subject
    const isMath = sub === 'math';
    const isSST = sub === 'sst';
    const isScience = sub === 'science';
    const activeMap = isSST ? SST_MAP : (isMath ? MATH_MAP : SCIENCE_MAP);
    const themeClass = sub;
    const assetFolder = `${sub}_path`;

    // Visual Config
    const tileHeight = 850;
    const overlap = 40; // The magic number for seamless blending
    const hour = new Date().getHours();
    const isNightInitial = hour >= 18 || hour < 6;

    // --- 2. BUILD THE QUEST NODES ---
    let nodes = [];
    activeMap.forEach(quest => {
        // Assign icons based on subject theme
        let icon = '🌱'; // Science
        if(isMath) icon = '❄️';
        if(isSST) icon = '🌍';

        nodes.push({ id: quest.id, label: 'Warmup', icon: icon, type: 'warmup' });
        nodes.push({ id: quest.id, label: 'Research', icon: '📖', type: 'study' });
        nodes.push({ id: quest.id, label: 'Drill', icon: '⚡', type: 'practice' });
        nodes.push({ id: quest.id, label: 'Mastery', icon: '🏆', type: 'mastery' });
    });

    const progress = parseInt(localStorage.getItem(`manya_prog_${sub}`) || 0);

    // Path Logic (The winding road coordinates)
    const rawCoords = [
        {x:53,y:95},{x:45,y:86},{x:39,y:77},{x:52,y:69},{x:51,y:58},
        {x:50,y:47},{x:54,y:38},{x:44,y:29},{x:43,y:22},{x:52,y:14}
    ];
    const pathTemplate = rawCoords.filter((_, i) => i % 2 === 0);
    const nodesPerTile = pathTemplate.length;
    const totalTiles = Math.ceil(nodes.length / nodesPerTile);

    // VOID-KILLER MATH: Calculated height including overlap
    const totalHeight = (totalTiles * (tileHeight - overlap)) + overlap;

    // --- 3. DYNAMIC ATMOSPHERE GENERATORS ---

    // Subject-Specific Weather Particles
    const generateWeather = () => {
        let h = '';
        const count = 120; // High density for world-class feel
        for (let i = 0; i < count; i++) {
            const left = Math.random() * 130 - 30; // Coverage for slant
            const delay = Math.random() * 5;
            
            if (isMath) {
                // MATH: Fluffy falling snow
                const size = 3 + Math.random() * 4;
                const dur = 2 + Math.random() * 3;
                h += `<div class="snowflake" style="width:${size}px; height:${size}px; left:${left}%; animation-duration:${dur}s; animation-delay:-${delay}s;"></div>`;
            } else if (isSST) {
                // SST: Drifting dust motes
                const size = 2 + Math.random() * 4;
                const dur = 4 + Math.random() * 4;
                h += `<div class="dust-mote" style="width:${size}px; height:${size}px; left:${left}%; animation-duration:${dur}s; animation-delay:-${delay}s;"></div>`;
            } else {
                // SCIENCE: High-speed needle rain
                const dur = 0.4 + Math.random() * 0.3;
                h += `<div class="rain-drop" style="left:${left}%; animation-duration:${dur}s; animation-delay:-${delay}s;"></div>`;
            }
        }
        return h;
    };

    // Ambient Particles (Fireflies/Frost/Heat Sparks)
    const generateBiomeParticles = () => {
        let h = '';
        for (let i = 0; i < 60; i++) {
            const left = Math.random() * 95;
            const top = Math.random() * totalHeight;
            h += `<div class="firefly" style="left:${left}%; top:${top}px; animation-delay:-${Math.random()*15}s"></div>`;
        }
        return h;
    };

    // --- 4. RENDER HTML TEMPLATE ---
    mount.innerHTML = `
        <div id="spiral-stage" class="spiral-view animate-in ${themeClass} ${isNightInitial ? 'night' : 'day'}">
            <div class="time-overlay"></div>
            <div class="cloudy-overlay"></div>
            
            <!-- WEATHER LAYER (Sits on top of map) -->
            <div id="weather-layer" class="weather-mount">${generateWeather()}</div>

            <!-- VIEWPORT-RELATIVE FX (Stars and Wind) -->
            <div id="star-mount" style="position:fixed; inset:0; z-index:100; pointer-events:none;"></div>
            <div id="sun-gust" class="sun-gust"></div>
            <div class="heat-haze"></div>

            <!-- FLOATING GLASS HUD -->
            <div class="glass-header">
                <div class="header-left">
                    <button class="back-btn" onclick="AudioManager.playSFX(); ViewManager.goBack()">
                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke-linecap="round"/></svg>
                    </button>
                    <div class="header-center">
                        <span class="subject-title">${subject.toUpperCase()}</span>
                    </div>
                </div>
                <div class="currency-pill"><span>💎</span> 120</div>
            </div>

            <div class="spiral-map-container" id="scroll-frame">
                
                <!-- LIGHTING RAYS -->
                <div class="god-rays"></div>

                <div class="map-canvas">
                    
                    <!-- LAYER 1: SEAMLESS OVERLAPPING MAP TILES -->
                    <div class="image-stack">
                        ${Array(totalTiles).fill(0).map((_, i) => {
                            const imgNum = ((totalTiles - i - 1) % 8) + 1;
                            const isLast = i === totalTiles - 1;
                            return `<img src="../../assets/icons/${assetFolder}/way-${imgNum}.png" 
                                         class="physical-tile" 
                                         style="margin-bottom:${isLast ? '0' : -overlap}px; z-index: ${i};"
                                         onerror="this.src='https://img.freepik.com/free-photo/vibrant-green-leaf-texture-nature-background_53876-139682.jpg'; this.style.opacity='0.5'">`;
                        }).join('')}
                    </div>

                    <!-- LAYER 2: BIOME PARTICLES (FIREFLIES) -->
                    <div class="biome-layer" style="position:absolute; inset:0; pointer-events:none; z-index:10;">
                        ${generateBiomeParticles()}
                    </div>
                        
                    <!-- LAYER 3: INTERACTIVE NODES -->
                    <div class="nodes-overlay">
                        ${nodes.map((n, i) => {
                            const status = i < progress ? 'completed' : (i === progress ? 'active' : 'locked');
                            const tileIdx = Math.floor(i / nodesPerTile);
                            const point = pathTemplate[i % nodesPerTile];
                            
                            // CALCULATE POSITION: Accounts for the seamless overlap logic
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

    // --- 5. DIRECTOR ENGINE (The 30s Logic) ---
    const stage = document.getElementById('spiral-stage');
    const weatherLayer = document.getElementById('weather-layer');
    let isNight = isNightInitial;

    // Toggle Day/Night every 30 seconds for dev purposes
    const cycleInterval = setInterval(() => {
        isNight = !isNight;
        stage.classList.toggle('day', !isNight);
        stage.classList.toggle('night', isNight);
        AudioManager.transitionTo(isNight ? 'night' : 'day');
        
        // Clear daytime weather if night hits
        if (isNight) {
            stage.classList.remove('active-weather', 'raining', 'windy');
            AudioManager.playWeather(false);
        }
    }, 30000);

    // Weather & Star Event Director (Random events every 10s)
    const eventInterval = setInterval(() => {
        if (!isNight) {
            // DAY EVENTS: Rain, Wind, or Sun Flare
            const roll = Math.random();
            if (roll < 0.45) { // 45% chance of Weather
                stage.classList.add('active-weather');
                if (isScience) stage.classList.add('raining');
                if (isSST) stage.classList.add('windy');
                AudioManager.playWeather(true);
                
                setTimeout(() => { 
                    stage.classList.remove('active-weather', 'raining', 'windy');
                    AudioManager.playWeather(false); 
                }, 12000);
            }
        } else {
            // NIGHT EVENTS: Shooting Star
            if (Math.random() > 0.5) {
                const star = document.createElement('div');
                star.className = 'shooting-star star-active';
                star.style.left = (20 + Math.random() * 60) + '%';
                star.style.top = (10 + Math.random() * 30) + '%';
                document.getElementById('star-mount').appendChild(star);
                AudioManager.playSFX('../../assets/audios/shine.mp3', 0.1);
                setTimeout(() => star.remove(), 1600);
            }
        }
    }, 10000);

    // --- 6. CLEANUP & CAMERA ---

    // Safety: Stop intervals if we leave the view
    const originalShow = ViewManager.show;
    ViewManager.show = function() {
        clearInterval(cycleInterval);
        clearInterval(eventInterval);
        originalShow.apply(this, arguments);
    };

    // Scroll to progress node or bottom immediately
    setTimeout(() => {
        const frame = document.getElementById('scroll-frame');
        const activeNode = document.getElementById(`node-${progress}`);
        if (frame) {
            if (activeNode) {
                const targetY = activeNode.offsetTop - (frame.offsetHeight / 2);
                frame.scrollTo({ top: targetY, behavior: 'auto' });
            } else {
                frame.scrollTop = frame.scrollHeight;
            }
        }
        AudioManager.playAmbient();
    }, 60);
};