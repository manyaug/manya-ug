/**
 * MANYA SPIRAL MASTER ENGINE - FINAL UNIFIED VERSION
 * Features: Absolute Coordinate Mapping, Biome-Aware HUD, Precision Hotspots
 */
import { ManyaDB } from '../manya-db.js';
import { AudioManager } from '../js/audio-manager.js';
import { ManyaNotify } from './manya-notify.js';
import { SCIENCE_MAP, MATH_MAP, SST_MAP } from '/app-shell/js/curriclum.js';

let spiralIntervals = [];

export const renderSpiral = async (mount, subject) => {
    const user = await ManyaDB.getCurrentUser();
    if (!user) return ViewManager.show('onboarding');

    const sub = subject.toLowerCase();
    localStorage.setItem('last_sub', sub);

    const biomes = {
        math: { color: '#7c3aed', alpha: 'rgba(124, 58, 237, 0.3)', bg: '#e0f2fe', icon: '❄️', folder: 'math_path', weather: 'snowflake' },
        science: { color: '#10B981', alpha: 'rgba(16, 185, 129, 0.3)', bg: '#dcfce7', icon: '🌱', folder: 'science_path', weather: 'rain-drop' },
        sst: { color: '#f59e0b', alpha: 'rgba(245, 158, 11, 0.3)', bg: '#fef3c7', icon: '🌍', folder: 'sst_path', weather: 'dust-particle' },
        english: { color: '#db2777', alpha: 'rgba(219, 39, 119, 0.3)', bg: '#fce7f3', icon: '📖', folder: 'english_path', weather: 'magic-star' }
    };
    const biome = biomes[sub] || biomes.math;
    
    document.documentElement.style.setProperty('--biome-color', biome.color);
    document.documentElement.style.setProperty('--biome-bg', biome.bg);
    document.documentElement.style.setProperty('--biome-color-alpha', biome.alpha);
    document.body.classList.add('in-spiral');

    const progress = user[`prog_${sub}`] || 0;
    const isNightInitial = new Date().getHours() >= 18 || new Date().getHours() < 6;

    // --- YOUR EXACT HOTSPOTS ---
    const roadPath = [
        { id: "point_1", x: 47.28, y: 85.79 },
        { id: "point_2", x: 50.68, y: 69.21 },
        { id: "point_3", x: 49.32, y: 54.19 },
        { id: "point_4", x: 57.15, y: 39.96 },
        { id: "point_5", x: 43.19, y: 25.92 },
        { id: "point_6", x: 56.47, y: 10.9  }
    ];

    const curriculumData = { math: MATH_MAP, science: SCIENCE_MAP, sst: SST_MAP };
    const units = curriculumData[sub] || [];
    
    const tileHeight = 850;
    const overlap = 85; 
    const effectiveHeight = tileHeight - overlap; 
    const nodesPerTile = roadPath.length;
    const totalTiles = Math.ceil(units.length / nodesPerTile);

    // Buffers at top and bottom
    const topBuffer = 20; 
    const bottomBuffer = 120;
    
    // MATHEMATICALLY PERFECT CANVAS HEIGHT
    const totalHeight = bottomBuffer + tileHeight + ((totalTiles > 1 ? totalTiles - 1 : 0) * effectiveHeight) + topBuffer;

    const generateParticles = (type, count) => {
        let h = '';
        for (let i = 0; i < count; i++) {
            h += `<div class="${type}" style="left:${Math.random()*120-10}%; animation-duration:${Math.random()*2+2}s; animation-delay:-${Math.random()*5}s;"></div>`;
        }
        return h;
    };

    // 1. GENERATE BACKGROUND TILES (Absolute Positioning)
    const mappedTiles = Array(totalTiles).fill(0).map((_, i) => {
        const bottomPos = bottomBuffer + (i * effectiveHeight);
        return `<img src="assets/images/${biome.folder}/way-${(i % 8) + 1}.png" 
                     class="physical-tile" 
                     style="z-index:${i}; bottom: ${bottomPos}px;">`;
    }).join('');

    // 2. GENERATE NODES (Using exact same bottom mapping logic)
    const mappedNodes = units.map((unit, i) => {
        const coord = roadPath[i % nodesPerTile]; 
        const tileIdx = Math.floor(i / nodesPerTile);
        
        // Pixels from bottom of THIS specific tile
        const yPxFromTileBottom = ((100 - coord.y) / 100) * tileHeight;
        
        // Absolute bottom position combining buffer + previous tiles + local tile Y
        const bottomOffset = bottomBuffer + (tileIdx * effectiveHeight) + yPxFromTileBottom;

        const isUnlocked = i <= progress; 
        const isActive = i === progress;

        return `
        <div class="game-node ${isUnlocked ? 'unlocked' : 'locked'} ${isActive ? 'active' : ''}" 
             style="bottom: ${bottomOffset}px; left: ${coord.x}%; pointer-events: auto;">
            
            ${isActive ? `
                <div class="hero-speech-bubble">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}">
                </div>` : ''}

            <div class="node-star-rating">
                <span class="${i < progress ? 'earned' : ''}">⭐</span>
                <span class="${i < progress ? 'earned' : ''} big">⭐</span>
                <span class="${i < progress ? 'earned' : ''}">⭐</span>
            </div>

            <div class="node-cap" onclick="window.handleUnitTap(${i}, ${isUnlocked}, '${unit.id}', '${unit.title}')">
                ${isUnlocked ? (i < progress ? '✔' : biome.icon) : '🔒'}
            </div>

            <div class="node-label-elite">${unit.title}</div>
        </div>`;
    }).join('');

    mount.innerHTML = `
        <div id="spiral-stage" class="spiral-view animate-in ${sub} ${isNightInitial ? 'night' : 'day'}">
            <div class="spiral-mist-vignette"></div>
            <div id="weather-layer" class="weather-mount weather-active">${generateParticles(biome.weather, 70)}</div>

            <div class="spiral-map-container" id="scroll-frame">
                <div class="map-canvas" style="height:${totalHeight}px">
                    
                    <!-- TILES LAYER -->
                    <div class="tiles-overlay" style="position: absolute; inset: 0; width: 100%;">
                        ${mappedTiles}
                    </div>

                    <!-- NODES LAYER -->
                    <div class="nodes-overlay" style="position: absolute; inset: 0; pointer-events: none;">
                        ${mappedNodes}
                    </div>

                </div>
            </div>
        </div>`;

    window.handleUnitTap = (index, unlocked, unitId, title) => {
        if(!unlocked) return ManyaNotify.show("This area is still locked!", "info");
        AudioManager.playSFX();
        window.ViewManager.show('questPath', null, { unitId, subject, index, title });
    };

    const originalShow = ViewManager.show;
    ViewManager.show = function(view) {
        if (view !== 'spiral') {
            document.body.classList.remove('in-spiral');
            // FIXED: Using document.documentElement instead of undefined 'root'
            document.documentElement.style.removeProperty('--biome-color');
            document.documentElement.style.removeProperty('--biome-bg');
            document.documentElement.style.removeProperty('--biome-color-alpha');
        }
        originalShow.apply(this, arguments);
    };

    // CENTER CAMERA ON PLAYER
    setTimeout(() => {
        const activeNode = document.querySelector('.game-node.active');
        if (activeNode) activeNode.scrollIntoView({ block: 'center', behavior: 'auto' });
    }, 150);
};