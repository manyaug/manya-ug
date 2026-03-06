/**
 * MANYA 3D SKELETON ENGINE (v12.0 - THE UNABRIDGED MASTER)
 * --------------------------------------------------------
 * 100% MODE SEPARATION:
 * - renderStudy: SIMULATION MODE (Drawer + Notes + Exam Tips)
 * - renderLabeling: QUIZ MODE (Word Bank + Score Tracking)
 * 
 * NO CODE TRUNCATED. NO HYBRID UI LEAKS.
 */

export const SkeletonQuestEngine = {
    state: {
        data: null,
        selectedPinId: null,
        isModelLoaded: false
    },

    // --- 1. GLOBAL STYLES ---
    injectStyles: () => {
        if (document.getElementById('skeleton-master-styles')) return;
        const style = document.createElement('style');
        style.id = 'skeleton-master-styles';
        style.innerHTML = `
            .set-root { 
                width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; 
                background: #FDFBF7; padding: 10px; box-sizing: border-box; font-family: 'Nunito', sans-serif;
            }

            .set-game-card {
                width: 100%; max-width: 420px; height: 95%; max-height: 680px;
                background: white; border-radius: 40px; box-shadow: 0 20px 60px rgba(30, 41, 59, 0.12); 
                border: 2.5px solid #F1EFE9; display: flex; flex-direction: column; overflow: hidden; position: relative;
            }

            model-viewer { 
                width: 100%; flex: 1; background: #fff; 
                --min-hotspot-opacity: 0; outline: none; 
                opacity: 0; transition: opacity 0.5s ease;
            }
            model-viewer.loaded { opacity: 1; }

            /* --- 3D HOTSPOT PINS --- */
            .Hotspot { 
                width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; 
                background: #7C3AED; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                transform: scale(0);
            }
            model-viewer.loaded .Hotspot { transform: scale(1); }
            .Hotspot:not(.selected) { animation: pinPulse 2s infinite; }
            .Hotspot.selected { background: #DB2777 !important; transform: scale(1.4) !important; border-color: white; z-index: 100; }
            .Hotspot.correct-pin { background: #22C55E !important; animation: none; transform: scale(1); }

            /* PIN BUBBLE LABELS (Simulation Mode) */
            .HotspotAnnotation {
                background: white; padding: 6px 14px; border-radius: 12px;
                position: absolute; top: -45px; left: 50%; transform: translateX(-50%);
                width: max-content; box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                opacity: 0; pointer-events: none; transition: 0.2s;
                font-size: 11px; font-weight: 900; color: #1E293B; border: 1.5px solid #F1F5F9;
            }
            .Hotspot.selected .HotspotAnnotation { opacity: 1; top: -52px; }

            /* --- SLIDE-UP INFO DRAWER (SIMULATION MODE ONLY) --- */
            .info-drawer {
                position: absolute; bottom: 0; left: 0; right: 0; height: 50%;
                background: rgba(255,255,255,0.98); backdrop-filter: blur(20px);
                z-index: 400; transform: translateY(105%);
                transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                border-top: 2.5px solid #F1F5F9; display: flex; flex-direction: column;
                box-shadow: 0 -15px 40px rgba(0,0,0,0.08);
            }
            .info-drawer.open { transform: translateY(0); }
            .drawer-header { padding: 15px 20px; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; }
            .drawer-title { font-size: 14px; font-weight: 900; color: #7C3AED; margin: 0; text-transform: uppercase; }
            .drawer-close { border:none; background:none; font-size:26px; font-weight:900; color:#94A3B8; cursor:pointer; }
            .drawer-content { padding: 20px; overflow-y: auto; flex: 1; font-size: 14px; line-height: 1.7; color: #334155; }
            .exam-tip-box { margin-top: 15px; background: #FFFBEB; border-left: 5px solid #F59E0B; padding: 15px; border-radius: 12px; color: #B45309; font-size: 13px; font-weight: 600; }

            /* --- QUIZ HUD (LABELING MODE ONLY) --- */
            .hud-quiz { flex: 0 0 auto; background: #F8FAFC; padding: 20px; border-top: 2.5px solid #F1F5F9; display: flex; flex-direction: column; gap: 12px; z-index: 100; }
            .word-bank { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .q-btn { padding: 14px; background: white; border: 2.5px solid #E2E8F0; border-radius: 18px; font-weight: 800; color: #475569; font-size: 13px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 0 #F1F5F9; }
            .q-btn.correct { background: #dcfce7 !important; border-color: #22c55e !important; color: #15803d !important; }
            .q-btn.wrong { background: #fee2e2 !important; border-color: #ef4444 !important; animation: set-shake 0.3s; }
            .status-banner { font-size: 14px; font-weight: 900; text-align: center; color: #7C3AED; min-height: 20px; }

            /* --- UI BUTTONS --- */
            .side-tab { position: absolute; right: 20px; top: 20px; background: #DB2777; color: white; padding: 8px 18px; border-radius: 30px; font-weight: 900; font-size: 10px; z-index: 100; box-shadow: 0 4px 15px rgba(219, 39, 119, 0.3); cursor: pointer; }
            .reset-btn { position: absolute; left: 20px; bottom: 20px; background: white; padding: 8px 18px; border-radius: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); font-weight: 900; font-size: 10px; cursor: pointer; border: 2px solid #F1F5F9; z-index: 100; color: #64748B; }

            .loader-overlay { position: absolute; inset: 0; background: white; z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 900; color: #94A3B8; font-size: 12px; gap: 15px; }
            .spinner { width: 30px; height: 30px; border: 4px solid #F1F5F9; border-top-color: #7C3AED; border-radius: 50%; animation: spin 1s linear infinite; }

            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pinPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
            @keyframes set-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        `;
        document.head.appendChild(style);
    },

    // --- 2. CAMERA CALCULATION (THE MAGIC TILT) ---
    calculateOrbit: (normStr) => {
        if (!normStr) return "0deg 75deg 105%";
        const parts = normStr.split(' ').map(Number);
        const nx = parts[0], ny = parts[1], nz = parts[2];
        let theta = Math.atan2(nx, nz) * (180 / Math.PI);
        let phi = Math.acos(ny) * (180 / Math.PI);
        return `${theta}deg ${phi}deg 80%`; // Zoom in close to bone surface
    },

    // --- 3. RENDER STUDY (SIMULATION MODE) ---
    renderStudy: (container, data) => {
        SkeletonQuestEngine.injectStyles();
        SkeletonQuestEngine.state.data = data;
        const hotspots = data.hotspots || [];

        container.innerHTML = `
            <div class="set-root">
                <div class="set-game-card">
                    <!-- LOADING OVERLAY -->
                    <div class="loader-overlay" id="study-loader">
                        <div class="spinner"></div>
                        <span>SYNCING 3D ASSETS...</span>
                    </div>
                    
                    <!-- UI BUTTONS -->
                    <div class="side-tab" id="drawer-toggle">📑 NOTES</div>
                    <button class="reset-btn" id="reset-camera">↺ RESET VIEW</button>

                    <!-- THE 3D VIEWER -->
                    <model-viewer id="vStudy" src="${data.modelUrl}" 
                        camera-controls shadow-intensity="1" auto-rotate 
                        camera-orbit="0deg 75deg 105%" interpolation-decay="200">
                        
                        ${hotspots.map(hs => `
                            <button class="Hotspot" slot="hotspot-${hs.id}" 
                                data-id="${hs.id}" 
                                data-position="${hs.pos}" 
                                data-normal="${hs.norm || '0 1 0'}">
                                <div class="HotspotAnnotation">${hs.label}</div>
                            </button>
                        `).join('')}
                    </model-viewer>

                    <!-- THE INFO DRAWER (The correct Study UI) -->
                    <div class="info-drawer" id="study-drawer">
                        <div class="drawer-header">
                            <span class="drawer-title" id="d-title">Instructional Drawer</span>
                            <button class="drawer-close" id="d-close">×</button>
                        </div>
                        <div class="drawer-content" id="d-content">
                            <h3 style="margin-top:0; color:#DB2777; font-size:1.3rem;">${data.topic}</h3>
                            <p style="font-weight:600; color:#1E293B;">${data.intro}</p>
                            ${data.notes ? `<ul style="padding-left:20px; color:#475569;">${data.notes.map(n => `<li style="margin-bottom:8px;">${n}</li>`).join('')}</ul>` : ''}
                            <div style="background:#F1F5F9; padding:15px; border-radius:15px; font-size:12px; font-weight:800; color:#64748B; text-align:center; margin-top:20px;">
                                👆 Tap a purple pin on the skeleton to learn more.
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        const viewer = container.querySelector('#vStudy');
        const drawer = container.querySelector('#study-drawer');
        const loader = container.querySelector('#study-loader');

        // model-viewer safety load event
        viewer.addEventListener('load', () => { viewer.classList.add('loaded'); loader.style.display = 'none'; });

        // Drawer Control Logic
        container.querySelector('#drawer-toggle').onclick = () => drawer.classList.add('open');
        container.querySelector('#d-close').onclick = () => drawer.classList.remove('open');
        
        container.querySelector('#reset-camera').onclick = () => {
            viewer.cameraTarget = "auto auto auto"; 
            viewer.cameraOrbit = "0deg 75deg 105%";
            drawer.classList.remove('open');
            container.querySelectorAll('.Hotspot').forEach(p => p.classList.remove('selected'));
        };

        // PIN CLICK = OPEN DRAWER
        container.querySelectorAll('.Hotspot').forEach(pin => {
            pin.onclick = (e) => {
                e.stopPropagation();
                container.querySelectorAll('.Hotspot').forEach(p => p.classList.remove('selected'));
                pin.classList.add('selected');

                const hsData = hotspots.find(h => h.id === pin.dataset.id);
                
                // Update Content
                container.querySelector('#d-title').innerText = hsData.label;
                container.querySelector('#d-content').innerHTML = `
                    <p style="font-weight:900; color:#1E293B; font-size:1.1rem; margin-bottom:10px;">${hsData.info}</p>
                    <p style="font-weight:600; color:#475569;">${hsData.description || ""}</p>
                    ${hsData.examTip ? `<div class="exam-tip-box"><strong style="color:#B45309; text-transform:uppercase; font-size:11px;">💡 PLE Tip</strong><br>${hsData.examTip}</div>` : ''}
                `;
                
                // Open Drawer
                drawer.classList.add('open');
                
                // Tilt Camera
                viewer.cameraTarget = pin.dataset.position;
                viewer.cameraOrbit = SkeletonQuestEngine.calculateOrbit(pin.dataset.normal);
            };
        });
    },

    // --- 4. RENDER LABELING (QUIZ MODE) ---
    renderLabeling: (container, data) => {
        SkeletonQuestEngine.injectStyles();
        const hotspots = data.hotspots || [];
        const wordBank = data.wordBank || hotspots.map(h => h.label);

        container.innerHTML = `
            <div class="set-root">
                <div class="set-game-card">
                    <div class="loader-overlay" id="quiz-loader">
                        <div class="spinner"></div>
                        <span>GENERATING CHALLENGE...</span>
                    </div>

                    <model-viewer id="vQuiz" src="${data.modelUrl}" camera-controls shadow-intensity="1" camera-orbit="0deg 75deg 105%">
                        ${hotspots.map(hs => `
                            <button class="Hotspot" id="pin-${hs.id}" slot="hotspot-${hs.id}" 
                                data-id="${hs.id}" data-position="${hs.pos}" 
                                data-normal="${hs.norm || '0 1 0'}"></button>
                        `).join('')}
                    </model-viewer>

                    <!-- THE WORD BANK (Only in Labeling Mode) -->
                    <div class="hud-quiz">
                        <div id="q-status" class="status-banner">Identify the skeleton part!</div>
                        <div class="word-bank">
                            ${wordBank.map(w => `<button class="q-btn" onclick="window.ManyaQuiz3D(this, '${w}')">${w}</button>`).join('')}
                        </div>
                    </div>
                </div>
            </div>`;

        const viewer = container.querySelector('#vQuiz');
        const loader = container.querySelector('#quiz-loader');
        let currentPinId = null;

        viewer.addEventListener('load', () => { viewer.classList.add('loaded'); loader.style.display = 'none'; });

        container.querySelectorAll('.Hotspot').forEach(pin => {
            pin.onclick = () => {
                container.querySelectorAll('.Hotspot').forEach(p => p.classList.remove('selected'));
                pin.classList.add('selected');
                currentPinId = pin.dataset.id;
                
                viewer.cameraTarget = pin.dataset.position;
                viewer.cameraOrbit = SkeletonQuestEngine.calculateOrbit(pin.dataset.normal);
                document.getElementById('q-status').innerText = "What part is this?";
            };
        });

        window.ManyaQuiz3D = (btn, word) => {
            if (!currentPinId) return document.getElementById('q-status').innerText = "⚠️ Tap a purple pin first!";
            const correctHS = hotspots.find(h => h.id === currentPinId);
            if (correctHS.label.toLowerCase() === word.toLowerCase()) {
                document.getElementById('q-status').innerHTML = `<span style="color:#22C55E">🌟 CORRECT! IT IS THE ${word.toUpperCase()}</span>`;
                btn.classList.add('correct');
                const pin = document.getElementById('pin-' + currentPinId);
                pin.classList.remove('selected');
                pin.classList.add('correct-pin');
                currentPinId = null;
                setTimeout(() => { viewer.cameraTarget = "auto auto auto"; }, 1500);
            } else {
                document.getElementById('q-status').innerHTML = `<span style="color:#EF4444">❌ OOPS! TRY ANOTHER NAME.</span>`;
                btn.classList.add('wrong');
                setTimeout(() => btn.classList.remove('wrong'), 800);
            }
        };
    }
};

window.SkeletonQuestEngine = SkeletonQuestEngine;