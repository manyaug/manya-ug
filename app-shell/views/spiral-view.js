/**
 * MANYA SPIRAL MASTER ENGINE - FINAL UNIFIED VERSION
 * Features: Seamless Blending, Biome-Aware HUD, Weather/Time Director, Precision Hotspots
 */
import { ManyaDB } from '../manya-db.js';
import { AudioManager } from '../js/audio-manager.js';
import { ManyaNotify } from './manya-notify.js';
 

export const renderSpiral = async (mount, subject) => {
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
    
    document.documentElement.style.setProperty('--biome-color', biome.color);
    document.documentElement.style.setProperty('--biome-color-alpha', biome.alpha);
    document.documentElement.style.setProperty('--biome-bg', biome.bg);
    document.body.classList.add('in-spiral');

    const progress = user[`prog_${sub}`] || 0;
    const isNightInitial = new Date().getHours() >= 18 || new Date().getHours() < 6;

    // YOUR PRECISION HOTSPOTS (Restored)
    const roadPath = [
        { x: 53.4,  y: 99.44 }, { x: 48.98, y: 85.98 }, { x: 45.24, y: 73.31 },
        { x: 55.44, y: 61.8  }, { x: 54.76, y: 34.89 }, { x: 45.92, y: 19.87 },
        { x: 58.51, y: 8.95  }
    ];

    const nodes = [];
    for(let i=0; i<21; i++) {
        nodes.push({ id: i, label: ['Warmup','Research','Drill','Mastery'][i%4], icon: i%4===3 ? '🏆' : biome.icon });
    }

    const tileHeight = 850, overlap = 85, nodesPerTile = roadPath.length;
    const totalTiles = Math.ceil(nodes.length / nodesPerTile);
    const totalHeight = (totalTiles * (tileHeight - overlap)) + overlap;

    const generateParticles = (type, count) => {
        let h = '';
        for (let i = 0; i < count; i++) {
            h += `<div class="${type}" style="left:${Math.random()*120-10}%; animation-duration:${Math.random()*2+2}s; animation-delay:-${Math.random()*5}s;"></div>`;
        }
        return h;
    };

    mount.innerHTML = `
        <div id="spiral-stage" class="spiral-view animate-in ${sub} ${isNightInitial ? 'night' : 'day'}">
            
            <!-- THE SHARP VIGNETTE -->
            <div class="spiral-mist-vignette"></div>

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

            <div id="weather-layer" class="weather-mount weather-active">${generateParticles(biome.weather, 60)}</div>

            <div class="spiral-map-container" id="scroll-frame">
                <div class="map-canvas" style="height:${totalHeight}px">
                    <div class="image-stack">
                        ${Array(totalTiles).fill(0).map((_, i) => `<img src="assets/icons/${biome.folder}/way-${(i % 8) + 1}.png" class="physical-tile" style="z-index:${i};">`).join('')}
                    </div>
                    <div class="nodes-overlay">
                        ${nodes.map((n, i) => {
                            const status = i < progress ? 'completed' : (i === progress ? 'active' : 'locked');
                            const coord = roadPath[i % roadPath.length];
                            const tileIdx = Math.floor(i / roadPath.length);
                            const yOnTile = (100 - coord.y) * (tileHeight - overlap) / 100;
                            const topPos = totalHeight - (tileIdx * (tileHeight - overlap) + yOnTile) - 180;
                            return `
                            <div class="game-node ${status}" style="top: ${topPos}px; left: ${coord.x}%;">
                                ${status === 'active' ? `<div class="player-marker"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}"></div>` : ''}
                                <div class="node-cap" onclick="handleQuestClick(${i}, '${status}')">
                                    ${status === 'completed' ? '✔' : (status === 'locked' ? '🔒' : n.icon)}
                                </div>
                                <div class="node-title-bubble">${n.label}</div>
                            </div>`;
                        }).join('')}
                    </div>
                    <div style="height: 250px;"></div>
                </div>
            </div>
        </div>`;

    window.handleQuestClick = (id, status) => {
        if(status === 'locked') return ManyaNotify.show("Unlock previous areas first!", "info");
        AudioManager.playSFX();
        window.launchLibraryStep(sub, 'unit1', 'quest_'+id, 'step1');
    };

    const frame = document.getElementById('scroll-frame');
    const activeNode = document.querySelector('.game-node.active');
    if (frame && activeNode) frame.scrollTo({ top: activeNode.offsetTop - 380, behavior: 'auto' });
};