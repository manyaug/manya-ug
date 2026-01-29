/**
 * Manya Pro 3D Skeleton Engine (v2.0)
 * Features: 
 * 1. Auto-Vector Camera Focus
 * 2. Dual 3D/2D Diagram Toggle
 * 3. Pro Quiz Logic (Labeling Mode)
 * 4. Slide-Out Context Drawer (Notes & Exam Tips) - NEW
 */
export const SkeletonQuestEngine = {
    state: {
        selectedJointId: null,
        data: null
    },

    // --- 1. DYNAMIC STYLES (Consolidated) ---
    injectStyles: () => {
        if (document.getElementById('skeleton-sim-styles')) return;
        const style = document.createElement('style');
        style.id = 'skeleton-sim-styles';
        style.innerHTML = `
            :root {
                --manya-purple: #7c3aed;
                --manya-bg: #f8fafc;
                --drawer-width: 340px;
            }

            .manya-3d-root { 
                display: grid;
                grid-template-rows: auto 1fr auto; 
                height: 100dvh; 
                width: 100%; 
                background: var(--manya-bg);
                overflow: hidden;
                position: relative; /* For absolute positioning of drawer */
            }
            
            /* --- TOP CARD --- */
            .notes-card-3d { 
                background: white; padding: 12px 16px; margin: 12px;
                border-radius: 16px; border-left: 6px solid var(--manya-purple); 
                box-shadow: 0 4px 15px rgba(0,0,0,0.05); z-index: 10;
                position: relative;
                transition: opacity 0.3s;
            }

            .dual-mode-btn { 
                position: absolute; right: 12px; top: 12px; 
                background: var(--manya-purple); color: white; 
                border: none; padding: 6px 12px; border-radius: 8px; 
                font-size: 10px; font-weight: 800; cursor: pointer; 
                display: flex; align-items: center; gap: 5px; 
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }

            /* --- SLIDE-OUT DRAWER (NEW) --- */
            .info-drawer {
                position: absolute;
                top: 0; left: 0; bottom: 0;
                width: 85%;
                max-width: var(--drawer-width);
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(12px); /* Glass effect */
                z-index: 200;
                transform: translateX(-105%); /* Hidden by default */
                transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                box-shadow: 10px 0 40px rgba(0,0,0,0.1);
                display: flex; flex-direction: column;
                border-right: 1px solid #e2e8f0;
            }
            
            .info-drawer.open {
                transform: translateX(0); /* Slide in */
            }

            .drawer-header {
                padding: 24px;
                background: var(--manya-purple);
                color: white;
                position: relative;
            }

            .drawer-close {
                position: absolute; top: 15px; right: 15px;
                background: rgba(255,255,255,0.2); border: none;
                color: white; width: 32px; height: 32px; border-radius: 50%;
                cursor: pointer; display: flex; align-items: center; justify-content: center;
                transition: background 0.2s;
            }
            .drawer-close:hover { background: rgba(255,255,255,0.4); }

            .drawer-content {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
            }

            .drawer-title { font-size: 1.6rem; font-weight: 900; margin: 0 0 5px 0; line-height: 1.1; }
            .drawer-subtitle { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.8; margin-bottom: 5px; }
            .drawer-body { font-size: 0.95rem; color: #334155; line-height: 1.6; margin-top: 15px; }
            
            /* EXAM TIP BOX */
            .exam-tip-box {
                margin-top: 25px;
                background: #fffbeb;
                border-left: 4px solid #f59e0b;
                border-radius: 8px;
                padding: 16px;
            }
            .exam-tip-label { color: #b45309; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; display: block; margin-bottom: 5px; }
            .exam-tip-text { color: #78350f; font-size: 0.9rem; font-style: italic; }

            /* --- VIEWER & OVERLAYS --- */
            .viewer-wrapper {
                position: relative; width: 100%; height: 100%; min-height: 0;
            }

            model-viewer { 
                width: 100%; height: 100%; 
                background: radial-gradient(circle, #ffffff 0%, #f1f5f9 100%);
                --min-hotspot-opacity: 0; 
                outline: none;
            }

            .diag-overlay { 
                position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
                background: white; z-index: 50; display: none; 
                align-items: center; justify-content: center;
            }
            .diag-overlay img { max-width: 95%; max-height: 95%; object-fit: contain; }

            .reset-view-btn {
                position: absolute; bottom: 20px; right: 20px;
                background: white; border: 1px solid #e2e8f0;
                padding: 10px 16px; border-radius: 30px; font-size: 11px;
                font-weight: 800; cursor: pointer; z-index: 100;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                color: #475569; display: flex; align-items: center; gap: 6px;
                transition: transform 0.2s;
            }
            .reset-view-btn:active { transform: scale(0.95); }

            /* --- HOTSPOTS --- */
            .Hotspot { 
                width: 24px; height: 24px; 
                border-radius: 50%; border: 3px solid #fff; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; transition: 0.3s; 
                animation: pulse 2s infinite;
            }
            @keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); } 70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); } }

            .Hotspot.selected { background-color: var(--manya-purple) !important; border-color: white; transform: scale(1.3); animation: none; }
            .axial { background-color: #ef4444 !important; } /* Red */
            .appendicular { background-color: #f59e0b !important; } /* Amber */
            .quiz-mode { background-color: #3b82f6 !important; } /* Blue */
            .correct { background-color: #22c55e !important; } /* Green */

            /* --- QUIZ SPECIFIC --- */
            .word-bank-3d {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 8px; padding: 16px; background: white; border-top: 1px solid #e2e8f0;
                max-height: 30vh; overflow-y: auto; z-index: 1000;
            }
            .word-btn { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 700; font-size: 13px; cursor: pointer; transition: 0.2s; color: #334155; }
            .word-btn.used { opacity: 0.4; pointer-events: none; background: #e2e8f0; text-decoration: line-through; }
        `;
        document.head.appendChild(style);
    },

    // --- 2. CAMERA MATH: VECTORS TO ORBIT ---
    calculateOrbit: (normStr) => {
        const parts = normStr.split(' ').map(Number);
        const nx = parts[0], ny = parts[1], nz = parts[2];
        let theta = Math.atan2(nx, nz) * (180 / Math.PI);
        let phi = Math.acos(ny) * (180 / Math.PI);
        return `${theta}deg ${phi}deg 45%`; // 45% zoom is a good sweet spot
    },

    // --- 3. STUDY MODE (With Drawer Logic) ---
    renderStudy: (container, data) => {
        SkeletonQuestEngine.injectStyles();
        
        container.innerHTML = `
            <div class="manya-3d-root">
                
                <!-- 1. HEADER CARD -->
                <div class="notes-card-3d" id="main-intro">
                    ${data.secondaryImage ? `<button class="dual-mode-btn" id="diag-toggle"><span style="font-size:14px">🖼️</span> DIAGRAM</button>` : ''}
                    <h2 style="margin:0; font-size:1.1rem; color:#1e293b; padding-right: 80px;">${data.topic}</h2>
                    <p style="margin:4px 0 0 0; font-size:12px; color:var(--manya-purple); font-weight:700;">
                        👆 Tap the pulsing dots to explore details.
                    </p>
                </div>

                <!-- 2. SLIDE-OUT DRAWER -->
                <aside class="info-drawer" id="ctx-drawer">
                    <div class="drawer-header">
                        <button class="drawer-close" id="drawer-close">✕</button>
                        <div class="drawer-subtitle">Selected Part</div>
                        <h1 class="drawer-title" id="d-title">...</h1>
                    </div>
                    <div class="drawer-content">
                        <div class="drawer-body" id="d-body">...</div>
                        
                        <!-- Dynamic Exam Tip Box -->
                        <div class="exam-tip-box" id="d-tip-box" style="display:none;">
                            <span class="exam-tip-label">💡 Exam Tip</span>
                            <span class="exam-tip-text" id="d-tip"></span>
                        </div>
                    </div>
                </aside>

                <!-- 3. MAIN VIEWER AREA -->
                <div class="viewer-wrapper">
                    <model-viewer id="v3d" src="${data.modelUrl}" camera-controls shadow-intensity="1" bounds="tight" interpolation-decay="200">
                        ${data.hotspots.map(hs => `
                            <button class="Hotspot ${hs.region || 'appendicular'}" slot="hotspot-${hs.id}" 
                                    data-id="${hs.id}"
                                    data-position="${hs.pos.replace('m','')}" 
                                    data-normal="${(hs.norm || "0 1 0").replace('m','')}">
                            </button>`).join('')}
                    </model-viewer>
                    
                    ${data.secondaryImage ? `<div class="diag-overlay" id="diag-overlay"><img src="${data.secondaryImage}"></div>` : ''}
                    
                    <button class="reset-view-btn" id="reset-v">
                        <span>↺</span> RESET VIEW
                    </button>
                </div>
            </div>
        `;

        // --- INTERACTION LOGIC ---
        const viewer = container.querySelector('#v3d');
        const drawer = container.querySelector('#ctx-drawer');
        const dTitle = container.querySelector('#d-title');
        const dBody = container.querySelector('#d-body');
        const dTip = container.querySelector('#d-tip');
        const dTipBox = container.querySelector('#d-tip-box');
        
        // 1. Hotspot Click Handler
        container.querySelectorAll('.Hotspot').forEach(h => {
            h.onclick = (e) => {
                e.stopPropagation(); // Prevent clicking through to the model background
                
                // Visual State
                container.querySelectorAll('.Hotspot').forEach(btn => btn.classList.remove('selected'));
                h.classList.add('selected');

                // Camera Movement
                viewer.cameraTarget = h.dataset.position;
                viewer.cameraOrbit = SkeletonQuestEngine.calculateOrbit(h.dataset.normal);

                // Populate Drawer
                const pointId = h.dataset.id;
                const pointData = data.hotspots.find(x => x.id === pointId);

                if (pointData) {
                    dTitle.innerText = pointData.label;
                    // Prefer 'description', fallback to 'info'
                    dBody.innerHTML = pointData.description || pointData.info || "No details available.";
                    
                    // Handle Exam Tips
                    if (pointData.examTip) {
                        dTip.innerText = pointData.examTip;
                        dTipBox.style.display = 'block';
                    } else {
                        dTipBox.style.display = 'none';
                    }
                }

                // Open Drawer
                drawer.classList.add('open');
            };
        });

        // 2. Close Drawer Logic
        const closeDrawer = () => {
            drawer.classList.remove('open');
            container.querySelectorAll('.Hotspot').forEach(btn => btn.classList.remove('selected'));
        };

        container.querySelector('#drawer-close').onclick = closeDrawer;

        // 3. Reset View Logic (Closes drawer + Resets Camera)
        container.querySelector('#reset-v').onclick = () => {
            closeDrawer();
            viewer.cameraTarget = "auto auto auto";
            viewer.cameraOrbit = "auto auto auto";
        };

        // 4. Click Background to Close
        viewer.addEventListener('mousedown', (e) => {
            // If clicking the canvas itself (not a hotspot), close drawer
            if(e.target === viewer) closeDrawer();
        });

        // 5. Dual Mode Toggle (Image vs 3D)
        const toggleBtn = container.querySelector('#diag-toggle');
        const overlay = container.querySelector('#diag-overlay');

        if (toggleBtn) {
            toggleBtn.onclick = () => {
                const isHidden = overlay.style.display === 'none' || overlay.style.display === '';
                overlay.style.display = isHidden ? 'flex' : 'none';
                toggleBtn.innerHTML = isHidden ? '<span style="font-size:14px">🦴</span> 3D MODEL' : '<span style="font-size:14px">🖼️</span> DIAGRAM';
            };
        }
    },

    // --- 4. QUIZ MODE (Preserved functionality) ---
    renderLabeling: (container, data) => {
        SkeletonQuestEngine.injectStyles();
        let selectedId = null;

        container.innerHTML = `
            <div class="manya-3d-root">
                <div class="notes-card-3d" style="text-align:center;">
                    <h2 style="margin:0; font-size:16px;">${data.variantTitle}</h2>
                    <p id="q-hint" style="margin:0; font-size:12px; font-weight:600; color:var(--manya-purple);">Tap a blue pin first.</p>
                </div>
                <div class="viewer-wrapper">
                    <model-viewer id="q3d" src="${data.modelUrl}" camera-controls shadow-intensity="1" bounds="tight">
                        ${data.hotspots.map(hs => `<button class="Hotspot quiz-mode" id="pin-${hs.id}" slot="hotspot-${hs.id}" data-position="${hs.pos.replace('m','')}" data-normal="${(hs.norm || "0 1 0").replace('m','')}"></button>`).join('')}
                    </model-viewer>
                </div>
                <div class="word-bank-3d">
                    ${data.wordBank.map(w => `<button class="word-btn" onclick="Manya3DQuizHandler(this, '${w}')">${w}</button>`).join('')}
                </div>
            </div>
        `;
        
        const viewer = container.querySelector('#q3d');
        const pins = container.querySelectorAll('.Hotspot');

        pins.forEach(pin => {
            pin.onclick = () => {
                pins.forEach(p => p.classList.remove('selected'));
                pin.classList.add('selected');
                selectedId = pin.id.replace('pin-', '');
                viewer.cameraTarget = pin.dataset.position;
                viewer.cameraOrbit = SkeletonQuestEngine.calculateOrbit(pin.dataset.normal);
                document.getElementById('q-hint').innerText = "Now select the name below 👇";
                document.getElementById('q-hint').style.color = "#334155";
            };
        });

        // Global handler for the dynamically created buttons
        window.Manya3DQuizHandler = (btn, word) => {
            if (!selectedId) {
                const hint = document.getElementById('q-hint');
                hint.innerText = "⚠️ Select a pin on the skeleton first!";
                hint.style.color = "#ef4444";
                return;
            }

            const target = data.hotspots.find(h => h.id === selectedId);
            
            if (word === target.label) {
                // Correct Answer
                const activePin = container.querySelector(`#pin-${selectedId}`);
                activePin.classList.add('correct');
                activePin.classList.remove('quiz-mode', 'selected');
                
                btn.classList.add('used');
                btn.innerText = "✓ " + word;
                
                selectedId = null;
                document.getElementById('q-hint').innerText = "Correct! Find the next one.";
                document.getElementById('q-hint').style.color = "#22c55e";
                
                // Reset Camera
                viewer.cameraTarget = "auto auto auto";
                viewer.cameraOrbit = "auto auto auto";
            } else {
                // Wrong Answer
                const hint = document.getElementById('q-hint');
                hint.innerText = "❌ Try again!";
                hint.style.color = "#ef4444";
                
                btn.style.background = "#fee2e2";
                setTimeout(() => btn.style.background = "#f8fafc", 500);
            }
        };
    }
};