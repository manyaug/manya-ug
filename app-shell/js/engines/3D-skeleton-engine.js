/**
 * Manya Pro 3D Skeleton Engine (v3.0 - Hybrid Context)
 * 1. Quick Info: Immediate pop-up bubbles on parts.
 * 2. Deep Dive: "Slide-out" drawer activated ONLY via the side tab.
 * 3. Mobile Optimized: Touch-friendly targets.
 */
export const SkeletonQuestEngine = {
    state: {
        selectedId: null, // Track what is currently clicked
        data: null
    },

    injectStyles: () => {
        if (document.getElementById('skeleton-sim-styles')) return;
        const style = document.createElement('style');
        style.id = 'skeleton-sim-styles';
        style.innerHTML = `
            :root {
                --manya-purple: #7c3aed;
                --drawer-w-mobile: 85%;
                --drawer-w-desktop: 350px;
            }

            .manya-3d-root { 
                position: relative; height: 100dvh; width: 100%; 
                background: #f8fafc; overflow: hidden;
            }

            /* --- 1. SIDE TAB (The Trigger) --- */
            .side-tab {
                position: absolute; left: 0; top: 50%; transform: translateY(-50%);
                background: white;
                color: var(--manya-purple);
                padding: 30px 6px;
                border-radius: 0 12px 12px 0;
                box-shadow: 4px 0 15px rgba(0,0,0,0.1);
                cursor: pointer; z-index: 300;
                font-weight: 800; font-size: 12px;
                writing-mode: vertical-rl; text-orientation: mixed;
                border: 1px solid #e2e8f0; border-left: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .side-tab:hover { padding-right: 12px; }
            .side-tab.pulse {
                animation: tabPulse 1.5s infinite;
                background: var(--manya-purple); color: white; border: none;
            }
            @keyframes tabPulse { 0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(124, 58, 237, 0); } 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); } }

            /* --- 2. SLIDE-OUT DRAWER --- */
            .info-drawer {
                position: absolute; top: 0; left: 0; bottom: 0;
                width: var(--drawer-w-mobile); max-width: var(--drawer-w-desktop);
                background: rgba(255, 255, 255, 0.96);
                backdrop-filter: blur(10px);
                z-index: 250;
                transform: translateX(-105%);
                transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                box-shadow: 10px 0 50px rgba(0,0,0,0.15);
                display: flex; flex-direction: column;
                border-right: 1px solid #e2e8f0;
            }
            .info-drawer.open { transform: translateX(0); }

            .drawer-header { padding: 20px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
            .drawer-title { font-size: 1.2rem; font-weight: 800; color: #1e293b; margin: 0; }
            .drawer-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; padding: 0 10px; }
            
            .drawer-content { padding: 20px; overflow-y: auto; flex: 1; font-size: 14px; line-height: 1.6; color: #334155; }
            .drawer-content h3 { margin-top: 0; font-size: 1rem; color: var(--manya-purple); }

            .exam-tip-box { margin-top: 20px; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; }

            /* --- 3. QUICK INFO BUBBLES (Restored) --- */
            .HotspotAnnotation {
                background: white; padding: 8px 12px; border-radius: 8px;
                position: absolute; top: -50px; left: 50%; transform: translateX(-50%);
                width: 140px; text-align: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.15);
                pointer-events: none; opacity: 0; transition: opacity 0.2s;
                z-index: 100; font-size: 12px;
            }
            .HotspotAnnotation b { display: block; color: var(--manya-purple); margin-bottom: 2px; }
            /* The caret (triangle) at the bottom */
            .HotspotAnnotation::after {
                content: ''; position: absolute; top: 100%; left: 50%; margin-left: -6px;
                border-width: 6px; border-style: solid; border-color: white transparent transparent transparent;
            }
            
            .Hotspot.selected .HotspotAnnotation { opacity: 1; top: -60px; }

            /* --- 4. VIEWER & CONTROLS --- */
            model-viewer { width: 100%; height: 100%; --min-hotspot-opacity: 0; outline: none; }
            
            .Hotspot { 
                width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.2); transition: 0.3s; 
                background: var(--manya-purple);
            }
            .Hotspot:not(.selected) { animation: pulse 2s infinite; }
            .Hotspot.selected { border-color: var(--manya-purple); background: white; transform: scale(1.3); z-index: 90; }

            @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }

            .reset-btn {
                position: absolute; bottom: 20px; right: 20px;
                background: white; padding: 10px 16px; border-radius: 20px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1); font-weight: 700; font-size: 12px;
                cursor: pointer; border: 1px solid #e2e8f0; z-index: 50;
            }
            
            /* Top Card (Mini) */
            .top-card {
                position: absolute; top: 10px; left: 50px; right: 10px;
                background: rgba(255,255,255,0.9); backdrop-filter: blur(4px);
                padding: 10px 15px; border-radius: 12px; border: 1px solid #e2e8f0;
                z-index: 50; pointer-events: none;
            }
            .top-card h2 { margin: 0; font-size: 14px; color: #1e293b; }
        `;
        document.head.appendChild(style);
    },

    calculateOrbit: (normStr) => {
        const parts = normStr.split(' ').map(Number);
        const nx = parts[0], ny = parts[1], nz = parts[2];
        let theta = Math.atan2(nx, nz) * (180 / Math.PI);
        let phi = Math.acos(ny) * (180 / Math.PI);
        return `${theta}deg ${phi}deg 45%`;
    },

    renderStudy: (container, data) => {
        SkeletonQuestEngine.injectStyles();
        SkeletonQuestEngine.state.data = data;
        SkeletonQuestEngine.state.selectedId = null;

        container.innerHTML = `
            <div class="manya-3d-root">
                <!-- TOP INTRO -->
                <div class="top-card">
                    <h2>${data.topic}</h2>
                </div>

                <!-- SIDE TAB TRIGGER -->
                <div class="side-tab" id="drawer-trigger">
                    <span>📑 NOTES</span>
                </div>

                <!-- SLIDE-OUT DRAWER (Hidden by default) -->
                <aside class="info-drawer" id="drawer">
                    <div class="drawer-header">
                        <span class="drawer-title" id="d-title">Overview</span>
                        <button class="drawer-close" id="d-close">✕</button>
                    </div>
                    <div class="drawer-content" id="d-content">
                        <!-- Dynamic Content Goes Here -->
                    </div>
                </aside>

                <!-- 3D VIEWER -->
                <model-viewer id="v3d" src="${data.modelUrl}" camera-controls shadow-intensity="1" bounds="tight" interpolation-decay="200">
                    ${data.hotspots.map(hs => `
                        <button class="Hotspot" slot="hotspot-${hs.id}" 
                                data-id="${hs.id}"
                                data-position="${hs.pos.replace('m','')}" 
                                data-normal="${(hs.norm || "0 1 0").replace('m','')}">
                            <div class="HotspotAnnotation">
                                <b>${hs.label}</b>
                                <span>${hs.info || 'Tap to learn'}</span>
                            </div>
                        </button>`).join('')}
                </model-viewer>

                <button class="reset-btn" id="reset-v">↺ RESET</button>
            </div>
        `;

        const viewer = container.querySelector('#v3d');
        const drawer = container.querySelector('#drawer');
        const trigger = container.querySelector('#drawer-trigger');
        const dTitle = container.querySelector('#d-title');
        const dContent = container.querySelector('#d-content');
        
        // --- 1. DRAWER CONTENT LOGIC ---
        const updateDrawer = (isGeneral = false, hotspotData = null) => {
            if (isGeneral) {
                dTitle.innerText = "General Overview";
                dContent.innerHTML = `
                    <h3>${data.topic}</h3>
                    <p>${data.intro}</p>
                    ${data.notes ? `<ul style="padding-left:20px;">${data.notes.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}
                    <div style="margin-top:20px; padding:10px; background:#f1f5f9; border-radius:8px; font-size:12px; text-align:center;">
                        👈 Tap a part on the 3D model to see specific details here.
                    </div>
                `;
            } else if (hotspotData) {
                dTitle.innerText = hotspotData.label;
                dContent.innerHTML = `
                    <p>${hotspotData.description || hotspotData.info}</p>
                    ${hotspotData.examTip ? `
                        <div class="exam-tip-box">
                            <strong style="color:#b45309; text-transform:uppercase; font-size:11px;">💡 Exam Tip</strong><br>
                            ${hotspotData.examTip}
                        </div>
                    ` : ''}
                `;
            }
        };

        // Initialize Drawer with General Topic Info
        updateDrawer(true);

        // --- 2. SIDE TAB INTERACTION ---
        trigger.onclick = () => {
            drawer.classList.add('open');
            trigger.classList.remove('pulse'); // Stop pulsing if it was
        };

        container.querySelector('#d-close').onclick = () => drawer.classList.remove('open');

        // --- 3. HOTSPOT INTERACTION ---
        container.querySelectorAll('.Hotspot').forEach(h => {
            h.onclick = (e) => {
                e.stopPropagation(); // Stop click from hitting background

                // Visual Selection (Quick Info Bubble)
                container.querySelectorAll('.Hotspot').forEach(btn => btn.classList.remove('selected'));
                h.classList.add('selected');

                // Camera Move
                viewer.cameraTarget = h.dataset.position;
                viewer.cameraOrbit = SkeletonQuestEngine.calculateOrbit(h.dataset.normal);

                // Update Drawer Content (But DO NOT Open it)
                const hsData = data.hotspots.find(x => x.id === h.dataset.id);
                updateDrawer(false, hsData);

                // UX Hint: Flash the side tab to say "Hey, details are here!"
                trigger.classList.add('pulse');
                trigger.innerText = "READ MORE 👉";
                
                // If drawer is ALREADY open, just update it. If closed, keep it closed until requested.
            };
        });

        // --- 4. BACKGROUND CLICK ---
        viewer.addEventListener('mousedown', (e) => {
            if(e.target === viewer) {
                // Deselect everything
                container.querySelectorAll('.Hotspot').forEach(btn => btn.classList.remove('selected'));
                drawer.classList.remove('open'); // Close drawer
                trigger.classList.remove('pulse');
                trigger.innerText = "📑 NOTES";
                
                // Reset Drawer to General
                updateDrawer(true);
            }
        });

        // --- 5. RESET BUTTON ---
        container.querySelector('#reset-v').onclick = () => {
            viewer.cameraTarget = "auto auto auto";
            viewer.cameraOrbit = "auto auto auto";
            container.querySelectorAll('.Hotspot').forEach(btn => btn.classList.remove('selected'));
            drawer.classList.remove('open');
            updateDrawer(true);
        };
    },

    // --- QUIZ MODE (Standard) ---
    renderLabeling: (container, data) => {
        // Reuse style injection
        SkeletonQuestEngine.injectStyles(); 
        
        // Simple Quiz Layout (No drawer needed, focus on game)
        container.innerHTML = `
            <div class="manya-3d-root">
                <div style="position:absolute; top:10px; left:10px; right:10px; background:white; padding:15px; border-radius:12px; z-index:100; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                    <h3 style="margin:0; font-size:16px;">${data.variantTitle}</h3>
                    <p id="q-status" style="margin:5px 0 0 0; color:var(--manya-purple); font-weight:bold; font-size:13px;">Tap a pin to start!</p>
                </div>

                <model-viewer id="q3d" src="${data.modelUrl}" camera-controls shadow-intensity="1" bounds="tight">
                    ${data.hotspots.map(hs => `<button class="Hotspot" id="pin-${hs.id}" slot="hotspot-${hs.id}" data-position="${hs.pos.replace('m','')}" data-normal="${(hs.norm || "0 1 0").replace('m','')}"></button>`).join('')}
                </model-viewer>

                <div style="position:absolute; bottom:0; left:0; right:0; background:white; padding:15px; border-radius:20px 20px 0 0; display:grid; grid-template-columns:1fr 1fr; gap:10px; z-index:100;">
                    ${data.wordBank.map(w => `<button class="q-btn" style="padding:12px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; font-weight:700; color:#334155;" onclick="ManyaQuiz3D(this, '${w}')">${w}</button>`).join('')}
                </div>
            </div>
        `;

        // Logic for Quiz
        const viewer = container.querySelector('#q3d');
        let currentPin = null;

        container.querySelectorAll('.Hotspot').forEach(p => {
            p.onclick = () => {
                container.querySelectorAll('.Hotspot').forEach(x => x.classList.remove('selected'));
                p.classList.add('selected');
                currentPin = p.id.replace('pin-', '');
                viewer.cameraTarget = p.dataset.position;
                document.getElementById('q-status').innerText = "Which part is this?";
            };
        });

        window.ManyaQuiz3D = (btn, word) => {
            if(!currentPin) {
                document.getElementById('q-status').innerText = "⚠️ Tap a pin on the skeleton first!";
                return;
            }
            const correct = data.hotspots.find(h => h.id === currentPin);
            if(correct.label === word) {
                document.getElementById('q-status').innerHTML = `<span style="color:green">✓ Correct! It is the ${word}</span>`;
                btn.style.background = "#dcfce7"; btn.style.color = "green"; btn.disabled = true;
                const pin = document.getElementById('pin-'+currentPin);
                pin.style.background = "#22c55e"; pin.classList.remove('selected');
                currentPin = null;
                viewer.cameraTarget = "auto auto auto";
            } else {
                document.getElementById('q-status').innerHTML = `<span style="color:red">✗ Wrong! Try again.</span>`;
            }
        };
    }
};