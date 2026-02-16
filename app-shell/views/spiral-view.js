/**
 * MANYA SPIRAL VIEW - FINAL MASTER EDITION
 * Fixes: Rain Coverage, Header Spacing, Seam Blending.
 */

import { AudioManager } from '../../app-shell/js/audio-manager.js';
import { SCIENCE_MAP } from '../../app-shell/js/curriclum.js';

/**
 * MANYA SPIRAL VIEW - FINAL SEAMLESS MASTER
 * Optimized for: Zero-Seam visibility and High-Speed Droplet Rain.
 */


export const renderSpiral = (mount, subject) => {
    // --- 1. CONFIGURATION ---
    const tileHeight = 850;
    const overlap = 40; 
    const hour = new Date().getHours();
    const isNightInitial = hour >= 18 || hour < 6;

    const SCIENCE_MAP = [
        { id: "q1", title: "Skeletons" }, { id: "q2", title: "Framework" },
        { id: "q3", title: "Skull" }, { id: "q4", title: "Ribs" },
        { id: "q5", title: "Limbs" }, { id: "q6", title: "Joints" }
    ];

    let nodes = [];
    SCIENCE_MAP.forEach(topic => {
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
    const totalHeight = (totalTiles * (tileHeight - overlap)) + overlap;

    // --- 2. GENERATORS ---

    const atmosphere = () => {
        let h = '';
        for (let i = 0; i < 60; i++) {
            h += `<div class="firefly" style="left:${Math.random()*95}%; top:${Math.random()*totalHeight}px; animation-delay:-${Math.random()*15}s"></div>`;
        }
        return h;
    };

    const generateRainParticles = () => {
        let h = '';
        // DRIFT COVERAGE: -30% to 100% to cover bottom left corner
        for (let i = 0; i < 120; i++) {
            const left = Math.random() * 130 - 30;
            const duration = 0.4 + Math.random() * 0.3;
            const delay = Math.random() * 2;
            h += `<div class="rain-drop" style="left:${left}%; animation-duration:${duration}s; animation-delay:-${delay}s;"></div>`;
        }
        return h;
    };

    // --- 3. RENDER HTML ---
    mount.innerHTML = `
        <div id="spiral-stage" class="spiral-view animate-in ${isNightInitial ? 'night' : 'day'}">
            <div class="time-overlay"></div>
            <div class="cloudy-overlay"></div>
            
            <div class="rain-mount">${generateRainParticles()}</div>

            <div id="star-mount" style="position:fixed; inset:0; z-index:100; pointer-events:none;"></div>
            <div id="sun-gust" class="sun-gust"></div>

            <div class="glass-header">
                <div class="header-left">
                    <button class="back-btn" onclick="AudioManager.playSFX(); ViewManager.goBack()">
                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke-linecap="round"/></svg>
                    </button>
                    <div class="header-center">
                        <span class="subject-label">PRIMARY SEVEN</span>
                        <span class="subject-title">${subject.toUpperCase()}</span>
                    </div>
                </div>
                <div class="currency-pill"><span>💎</span> 120</div>
            </div>

            <div class="spiral-map-container" id="scroll-frame">
                <div class="god-rays"></div>
                <div class="map-canvas">
                    
                    <!-- THE IMAGE STACK -->
                    <div class="image-stack">
                        ${Array(totalTiles).fill(0).map((_, i) => {
                            const imgNum = ((totalTiles - i - 1) % 8) + 1;
                            const isLast = i === totalTiles - 1;
                            return `<img src="assets/icons/science_path/way-${imgNum}.png" 
                                         class="physical-tile" 
                                         style="margin-bottom:${isLast ? '0' : -overlap}px; z-index:${i}">`;
                        }).join('')}
                    </div>

                    <div class="biome-layer" style="position:absolute; inset:0; pointer-events:none; z-index:10;">${atmosphere()}</div>

                    <div class="nodes-overlay">
                        ${nodes.map((n, i) => {
                            const status = i < progress ? 'completed' : (i === progress ? 'active' : 'locked');
                            const tileIdx = Math.floor(i / nodesPerTile);
                            const point = pathTemplate[i % nodesPerTile];
                            const yOnTile = (100 - point.y) * tileHeight / 100;
                            const topPos = totalHeight - ((tileIdx * (tileHeight - overlap)) + yOnTile);
                            
                            return `
                            <div id="node-${i}" class="game-node ${status}" style="top:${topPos}px; left:${point.x + 3}%">
                                ${status === 'active' ? `<div class="mascot-marker" style="background-image: url('assets/avatars/student_mascot.png')"></div>` : ''}
                                <div class="node-cap" onclick="AudioManager.playSFX(); console.log('Playing:', ${i})">
                                    ${status === 'completed' ? '✔' : (status === 'locked' ? '🔒' : n.icon)}
                                </div>
                                <div class="node-title">${n.label}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>`;

    // --- 4. DIRECTOR ENGINE ---
    const stage = document.getElementById('spiral-stage');
    let cycleState = isNightInitial;

    const cycleInterval = setInterval(() => {
        cycleState = !cycleState;
        stage.classList.toggle('day', !cycleState);
        stage.classList.toggle('night', cycleState);
        AudioManager.transitionTo(cycleState ? 'night' : 'day');
        if (cycleState) stage.classList.remove('raining'); 
    }, 30000);

    const eventInterval = setInterval(() => {
        if (!cycleState) { 
            if (Math.random() < 0.4) {
                stage.classList.add('raining');
                AudioManager.playWeather('rain', true);
                setTimeout(() => { stage.classList.remove('raining'); AudioManager.playWeather('rain', false); }, 12000);
            }
        } else if (Math.random() > 0.5) {
            const star = document.createElement('div');
            star.className = 'shooting-star star-active';
            star.style.left = (Math.random() * 80) + '%';
            star.style.top = (Math.random() * 40) + '%';
            document.getElementById('star-mount').appendChild(star);
            setTimeout(() => star.remove(), 1600);
        }
    }, 10000);

    // Cleanup
    const originalShow = ViewManager.show;
    ViewManager.show = function() { clearInterval(cycleInterval); clearInterval(eventInterval); originalShow.apply(this, arguments); };

    // Initial Scroll
    setTimeout(() => {
        const frame = document.getElementById('scroll-frame');
        const activeNode = document.getElementById(`node-${progress}`);
        if (frame && activeNode) frame.scrollTo({ top: activeNode.offsetTop - 350, behavior: 'auto' });
        else if (frame) frame.scrollTop = frame.scrollHeight;
        AudioManager.playAmbient();
    }, 100);
};