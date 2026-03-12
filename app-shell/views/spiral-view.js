/**
 * MANYA SPIRAL MASTER ENGINE - FINAL UNIFIED VERSION
 * Features: Seamless Blending, Biome-Aware HUD, Weather/Time Director, Precision Hotspots
 */
import { ManyaDB } from '../manya-db.js';
import { AudioManager } from '../js/audio-manager.js';
import { ManyaNotify } from './manya-notify.js';
 
export const renderSpiral = async (mount, subject) => {
    // 1. DATA & BIOME SETUP
    const user = await ManyaDB.getCurrentUser();
    if (!user) return ViewManager.show('onboarding');

    const sub = subject.toLowerCase();
    const biomes = {
        math: { color: '#7c3aed', alpha: 'rgba(124, 58, 237, 0.3)', bg: '#e0f2fe', icon: '❄️', folder: 'math_path', weather: 'snowflake' },
        science: { color: '#10B981', alpha: 'rgba(16, 185, 129, 0.3)', bg: '#dcfce7', icon: '🌱', folder: 'science_path', weather: 'rain-drop' },
        sst: { color: '#f59e0b', alpha: 'rgba(245, 158, 11, 0.3)', bg: '#fef3c7', icon: '🌍', folder: 'sst_path', weather: 'dust-particle' },
        english: { color: '#db2777', alpha: 'rgba(219, 39, 119, 0.3)', bg: '#fce7f3', icon: '📖', folder: 'english_path', weather: 'magic-star' }
    };
    const biome = biomes[sub] || biomes.math;
    
    // Inject Theme into Global CSS Variables
    const root = document.documentElement;
    root.style.setProperty('--biome-color', biome.color);
    root.style.setProperty('--biome-color-alpha', biome.alpha);
    root.style.setProperty('--biome-bg', biome.bg);
    document.body.classList.add('in-spiral');

    const progress = user[`prog_${sub}`] || 0;
    const isNight = new Date().getHours() >= 18 || new Date().getHours() < 6;

    // 2. PRECISION HOTSPOTS (Bottom-Up Mapping)
    const roadPath = [
        { x: 54.42, y: 97.68 }, { x: 42.85, y: 80.13 }, { x: 55.78, y: 64.14 },
        { x: 56.47, y: 39.37 }, { x: 45.92, y: 21.43 }, { x: 56.81, y: 7.78  }
    ];

    const nodes = [];
    const labels = ['Warmup', 'Research', 'Drill', 'Mastery'];
    for(let i=0; i<18; i++) { // 3 tiles worth
        nodes.push({ id: i, label: labels[i % 4], icon: i % 4 === 3 ? '🏆' : biome.icon });
    }

    const tileHeight = 850;
    const overlap = 85; 
    const nodesPerTile = roadPath.length;
    const totalTiles = Math.ceil(nodes.length / nodesPerTile);
    const totalHeight = (totalTiles * (tileHeight - overlap)) + overlap;

    const spawnFireflies = () => {
        let h = '';
        if(!isNight) return '';
        for (let i = 0; i < 40; i++) {
            h += `<div class="firefly" style="left:${Math.random()*90+5}%; top:${Math.random()*totalHeight}px; animation-delay:-${Math.random()*10}s"></div>`;
        }
        return h;
    };

    // 3. RENDER THE WORLD
    mount.innerHTML = `
        <div id="spiral-stage" class="spiral-view animate-in ${sub} ${isNight ? 'night' : 'day'}">
            
            <!-- WORLD-CLASS UNIFIED HUD -->
            <header class="spiral-header-unified">
                <div class="unified-shell">
                    <button class="uni-back-btn" onclick="ViewManager.show('home')"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15 18l-6-6 6-6"/>
</svg></button>
                    <div class="uni-title-box">
                        <span class="uni-main-title">${subject.toUpperCase()}</span>
                        <span class="uni-sub-title">ROAD TO AGGREGATE 4</span>
                    </div>
                    <div class="uni-stats">
                        <span class="diamond-sparkle" style="font-size:16px" onclick="ViewManager.show('achievements')">💎</span>
                        <span class="uni-count">${user.diamonds}</span>
                    </div>
                </div>
            </header>

            <div id="firefly-layer" class="weather-mount">${spawnFireflies()}</div>

            <div class="spiral-map-container" id="scroll-frame">
                <div class="map-canvas" style="height:${totalHeight}px">
                    
                    <div class="image-stack">
                        ${Array(totalTiles).fill(0).map((_, i) => `
                            <img src="assets/icons/${biome.folder}/way-${(i % 8) + 1}.png" 
                                 class="physical-tile" style="z-index:${i};">
                        `).join('')}
                    </div>

                    <div class="nodes-overlay">
                        ${nodes.map((n, i) => {
                            const status = i < progress ? 'completed' : (i === progress ? 'active' : 'locked');
                            const coord = roadPath[i % nodesPerTile]; 
                            const tileIdx = Math.floor(i / nodesPerTile);
                            
                            const yOnTile = (100 - coord.y) * (tileHeight - overlap) / 100;
                            const topPos = totalHeight - (tileIdx * (tileHeight - overlap) + yOnTile) - 180;

                            return `
                            <div class="game-node ${status}" style="top: ${topPos}px; left: ${coord.x}%;">
                                ${status === 'active' ? `
                                    <div class="player-marker">
                                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}">
                                    </div>` : ''}
                                <div class="node-cap" onclick="handleSpiralClick(${i}, '${status}')">
                                    ${status === 'completed' ? '✔' : (status === 'locked' ? '🔒' : n.icon)}
                                </div>
                                <div class="node-label-vibrant">${n.label}</div>
                            </div>`;
                        }).join('')}
                    </div>
                    
                    <!-- BOTTOM NAV SPACE BUFFER -->
                    <div style="height: 250px;"></div>
                </div>
            </div>
        </div>`;

    window.handleSpiralClick = (id, status) => {
        if(status === 'locked') return ManyaNotify.show("Area Locked!", "info");
        AudioManager.playSFX();
        window.launchLibraryStep(sub, 'unit1', 'quest_'+id, 'step1');
    };

    // Cleanup when leaving
    const originalShow = ViewManager.show;
    ViewManager.show = function(view) {
        if (view !== 'spiral') {
            document.body.classList.remove('in-spiral');
            root.style.removeProperty('--biome-color');
            root.style.removeProperty('--biome-bg');
            root.style.removeProperty('--biome-color-alpha');
        }
        originalShow.apply(this, arguments);
    };

    // Auto-Focus Camera
    setTimeout(() => {
        const frame = document.getElementById('scroll-frame');
        const activeNode = document.querySelector('.game-node.active');
        if (frame && activeNode) frame.scrollTo({ top: activeNode.offsetTop - 350, behavior: 'auto' });
    }, 150);
};