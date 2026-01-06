/**
 * Manya Pro 3D Skeleton Engine
 * Features: Auto-Vector Camera Focus, Dual 3D/2D Toggle, and Pro Quiz Logic.
 */
export const SkeletonQuestEngine = {
    state: {
        selectedJointId: null,
        data: null
    },

    // --- 1. DYNAMIC STYLES ---
    injectStyles: () => {
        if (document.getElementById('skeleton-sim-styles')) return;
        const style = document.createElement('style');
        style.id = 'skeleton-sim-styles';
        style.innerHTML = `
            .manya-3d-root { 
                display: grid;
                grid-template-rows: auto 1fr auto; 
                height: 100dvh; 
                width: 100%; 
                background: var(--manya-bg);
                overflow: hidden;
            }
            
            .notes-card-3d { 
                background: white; padding: 12px 16px; margin: 8px;
                border-radius: 16px; border-left: 6px solid var(--manya-purple); 
                box-shadow: 0 4px 15px rgba(0,0,0,0.04); z-index: 10;
                position: relative;
            }

            .dual-mode-btn { 
                position: absolute; right: 12px; top: 12px; 
                background: var(--manya-purple); color: white; 
                border: none; padding: 6px 12px; border-radius: 8px; 
                font-size: 10px; font-weight: 800; cursor: pointer; 
                display: flex; align-items: center; gap: 5px; 
            }

            .viewer-wrapper {
                position: relative; width: 100%; height: 100%; min-height: 0;
            }

            model-viewer { 
                width: 100%; height: 100%; 
                background: radial-gradient(circle, #ffffff 0%, #f1f5f9 100%);
                --min-hotspot-opacity: 0; 
            }

            .diag-overlay { 
                position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
                background: white; z-index: 50; display: none; 
                align-items: center; justify-content: center; border-radius: 20px; 
            }
            .diag-overlay img { max-width: 90%; max-height: 90%; object-fit: contain; }

            .reset-view-btn {
                position: absolute; bottom: 20px; right: 20px;
                background: rgba(255,255,255,0.9); border: 1px solid #e2e8f0;
                padding: 10px 16px; border-radius: 12px; font-size: 10px;
                font-weight: 800; cursor: pointer; z-index: 100;
            }

            /* HOTSPOT & ANNOTATION STYLING */
            .Hotspot { 
                width: clamp(20px, 5vw, 26px); height: clamp(20px, 5vw, 26px); 
                border-radius: 50%; border: 3px solid #fff; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; transition: 0.3s; 
            }
            .axial { background-color: var(--axial-color) !important; }
            .appendicular { background-color: var(--appendicular-color) !important; }
            .quiz-mode { background-color: var(--quiz-color) !important; }
            .correct { background-color: var(--success-color) !important; }
            .Hotspot.active { transform: scale(1.4); border-color: #000 !important; }

            .HotspotAnnotation { 
                display: none; position: absolute; bottom: 35px; left: 50%; transform: translateX(-50%);
                background: white; padding: 12px; border-radius: 14px; width: 180px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #f1f5f9; z-index: 1000;
            }
            .Hotspot.active .HotspotAnnotation { display: block; }
            .HotspotAnnotation b { display: block; color: var(--manya-purple); margin-bottom: 4px; font-size: 13px; text-transform: uppercase; }

            /* WORD BANK */
            .word-bank-3d {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 8px; padding: 16px; background: white; border-top: 1px solid #e2e8f0;
                max-height: 30vh; overflow-y: auto; z-index: 1000;
            }
            .word-btn { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 700; font-size: 13px; cursor: pointer; transition: 0.2s; }
            .word-btn.used { opacity: 0.2; pointer-events: none; }
        `;
        document.head.appendChild(style);
    },

    // --- 2. CAMERA MATH: VECTORS TO ORBIT ---
    calculateOrbit: (normStr) => {
        const parts = normStr.split(' ').map(Number);
        const nx = parts[0], ny = parts[1], nz = parts[2];
        let theta = Math.atan2(nx, nz) * (180 / Math.PI);
        let phi = Math.acos(ny) * (180 / Math.PI);
        return `${theta}deg ${phi}deg 40%`; // 40% zoom
    },

    // --- 3. STUDY MODE ---
    renderStudy: (container, data) => {
        SkeletonQuestEngine.injectStyles();
        container.innerHTML = `
            <div class="manya-3d-root">
                <div class="notes-card-3d">
                    ${data.secondaryImage ? `<button class="dual-mode-btn" id="diag-toggle">🖼️ VIEW DIAGRAM</button>` : ''}
                    <h2 style="margin:0;">${data.topic}</h2>
                    <p style="margin:0; font-size:13px; color:#64748b;">${data.intro}</p>
                </div>
                <div class="viewer-wrapper">
                    <model-viewer id="v3d" src="${data.modelUrl}" camera-controls shadow-intensity="1" bounds="tight" interpolation-decay="200">
                        ${data.hotspots.map(hs => `
                            <button class="Hotspot ${hs.region || 'appendicular'}" slot="hotspot-${hs.id}" 
                                    data-position="${hs.pos.replace('m','')}" 
                                    data-normal="${(hs.norm || "0 1 0").replace('m','')}">
                                <div class="HotspotAnnotation"><b>${hs.label}</b><p style="margin:0;font-size:11px;">${hs.info || ''}</p></div>
                            </button>`).join('')}
                    </model-viewer>
                    ${data.secondaryImage ? `<div class="diag-overlay" id="diag-overlay"><img src="${data.secondaryImage}"></div>` : ''}
                    <button class="reset-view-btn" id="reset-v">🔄 RESET</button>
                </div>
            </div>
        `;

        const viewer = container.querySelector('#v3d');
        const overlay = container.querySelector('#diag-overlay');
        const toggleBtn = container.querySelector('#diag-toggle');

        if (toggleBtn) {
            toggleBtn.onclick = () => {
                const isHidden = overlay.style.display === 'none' || overlay.style.display === '';
                overlay.style.display = isHidden ? 'flex' : 'none';
                toggleBtn.innerText = isHidden ? '🦴 VIEW 3D' : '🖼️ VIEW DIAGRAM';
            };
        }

        container.querySelectorAll('.Hotspot').forEach(h => {
            h.onclick = (e) => {
                e.stopPropagation();
                container.querySelectorAll('.Hotspot').forEach(btn => btn.classList.remove('active'));
                h.classList.add('active');
                viewer.cameraTarget = h.dataset.position;
                viewer.cameraOrbit = SkeletonQuestEngine.calculateOrbit(h.dataset.normal);
            };
        });

        container.querySelector('#reset-v').onclick = () => {
            viewer.cameraTarget = "auto auto auto";
            viewer.cameraOrbit = "auto auto auto";
            container.querySelectorAll('.Hotspot').forEach(btn => btn.classList.remove('active'));
        };
    },

    // --- 4. QUIZ MODE ---
    renderLabeling: (container, data) => {
        SkeletonQuestEngine.injectStyles();
        let selectedId = null;
        container.innerHTML = `
            <div class="manya-3d-root">
                <div class="notes-card-3d" style="text-align:center;">
                    <h2 style="margin:0; font-size:16px;">${data.variantTitle}</h2>
                    <p id="q-hint" style="margin:0; font-size:12px; font-weight:600; color:var(--manya-purple);">Tap a yellow pin first.</p>
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
                pins.forEach(p => p.classList.remove('active'));
                pin.classList.add('active');
                selectedId = pin.id.replace('pin-', '');
                viewer.cameraTarget = pin.dataset.position;
                viewer.cameraOrbit = SkeletonQuestEngine.calculateOrbit(pin.dataset.normal);
            };
        });

        window.Manya3DQuizHandler = (btn, word) => {
            if (!selectedId) return;
            const target = data.hotspots.find(h => h.id === selectedId);
            if (word === target.label) {
                const activePin = container.querySelector(`#pin-${selectedId}`);
                activePin.classList.add('correct');
                activePin.classList.remove('quiz-mode', 'active');
                btn.classList.add('used');
                selectedId = null;
                document.getElementById('q-hint').innerText = "Correct! Match another.";
                viewer.cameraTarget = "auto auto auto";
                viewer.cameraOrbit = "auto auto auto";
            } else {
                document.getElementById('q-hint').innerText = "Try again!";
                document.getElementById('q-hint').style.color = "red";
                setTimeout(() => document.getElementById('q-hint').style.color = "var(--manya-purple)", 1000);
            }
        };
    }
};