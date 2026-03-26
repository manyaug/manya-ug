export const SkeletonQuestEngine = {
    state: {
        selectedId: null,
        data: null
    },

    injectStyles: () => {
        if (document.getElementById('skeleton-sim-styles')) return;
        const style = document.createElement('style');
        style.id = 'skeleton-sim-styles';
        style.innerHTML = `
            /* CONTAINER: Fit strictly inside parent */
            .manya-3d-root { 
                position: absolute; 
                top: 0; left: 0; right: 0; bottom: 0; 
                width: 100%; height: 100%; 
                background: radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%);
                overflow: hidden;
            }

            /* 3D VIEWER */
            model-viewer { 
                width: 100%; height: 100%; 
                --min-hotspot-opacity: 0; 
                outline: none; 
                opacity: 0; /* Hide until loaded */
                transition: opacity 0.5s ease;
            }
            model-viewer.loaded { opacity: 1; }

            /* --- SIDE TAB (The Trigger) --- */
            .side-tab {
                position: absolute; left: 0; top: 50%; transform: translateY(-50%);
                background: white; color: #7c3aed;
                padding: 24px 8px; border-radius: 0 12px 12px 0;
                box-shadow: 4px 0 15px rgba(0,0,0,0.1); cursor: pointer; z-index: 300;
                font-weight: 800; font-size: 11px;
                writing-mode: vertical-rl; text-orientation: mixed;
                border: 1px solid #e2e8f0; border-left: none;
                transition: 0.3s;
            }
            .side-tab:hover { padding-right: 12px; }
            .side-tab.pulse {
                background: #7c3aed; color: white;
                animation: tabPulse 1.5s infinite;
            }

            /* --- SLIDE-OUT DRAWER --- */
            .info-drawer {
                position: absolute; top: 0; left: 0; bottom: 0;
                width: 85%; max-width: 350px;
                background: rgba(255, 255, 255, 0.98);
                backdrop-filter: blur(10px);
                z-index: 400; /* Above everything */
                transform: translateX(-105%);
                transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                box-shadow: 10px 0 50px rgba(0,0,0,0.2);
                display: flex; flex-direction: column;
                border-right: 1px solid #e2e8f0;
            }
            .info-drawer.open { transform: translateX(0); }

            .drawer-header { padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
            .drawer-title { font-size: 14px; font-weight: 800; color: #1e293b; margin: 0; }
            .drawer-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b; }
            .drawer-content { padding: 20px; overflow-y: auto; flex: 1; font-size: 14px; line-height: 1.6; color: #334155; }
            
            /* --- HOTSPOTS (Pins) --- */
            .Hotspot { 
                width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; 
                box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: 0.3s; 
                background: #7c3aed; cursor: pointer;
                transform: scale(0); /* Start hidden */
            }
            /* Pop in animation */
            model-viewer.loaded .Hotspot { transform: scale(1); }
            
            .Hotspot:not(.selected) { animation: pinPulse 2s infinite; }
            .Hotspot.selected { background: white; border-color: #7c3aed; transform: scale(1.3) !important; z-index: 100; }

            .HotspotAnnotation {
                background: white; padding: 6px 12px; border-radius: 8px;
                position: absolute; top: -45px; left: 50%; transform: translateX(-50%);
                width: max-content; max-width: 150px; text-align: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.15);
                pointer-events: none; opacity: 0; transition: opacity 0.2s;
                font-size: 12px; font-weight: 700; color: #1e293b;
            }
            .Hotspot.selected .HotspotAnnotation { opacity: 1; top: -55px; }

            /* RESET BUTTON */
            .reset-btn {
                position: absolute; bottom: 20px; right: 20px;
                background: white; padding: 8px 16px; border-radius: 20px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1); font-weight: 700; font-size: 11px;
                cursor: pointer; border: 1px solid #e2e8f0; z-index: 50;
            }

            /* LOADING INDICATOR */
            .model-loader {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                display: flex; flex-direction: column; align-items: center;
                color: #94a3b8; font-weight: 700; font-size: 12px; pointer-events: none;
            }
            .model-loader.hidden { display: none; }

            @keyframes tabPulse { 0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(124, 58, 237, 0); } }
            @keyframes pinPulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        `;
        document.head.appendChild(style);
    },

    calculateOrbit: (normStr) => {
        if(!normStr) return "0deg 90deg 105%"; // Fallback
        const parts = normStr.split(' ').map(Number);
        const nx = parts[0], ny = parts[1], nz = parts[2];
        let theta = Math.atan2(nx, nz) * (180 / Math.PI);
        let phi = Math.acos(ny) * (180 / Math.PI);
        return `${theta}deg ${phi}deg 80%`; // Zoom in slightly (80%)
    },

    renderStudy: (container, data) => {
        SkeletonQuestEngine.injectStyles();
        SkeletonQuestEngine.state.data = data;

        // 1. RENDER HTML
        container.innerHTML = `
            <div class="manya-3d-root">
                
                <!-- LOADING SPINNER INSIDE ENGINE -->
                <div class="model-loader" id="skel-loader">
                    <div style="width:30px; height:30px; border:3px solid #e2e8f0; border-top-color:#7c3aed; border-radius:50%; animation:spin 1s linear infinite; margin-bottom:10px;"></div>
                    <span>Loading 3D Model...</span>
                </div>

                <!-- SIDE TAB -->
                <div class="side-tab" id="drawer-trigger">
                    <span>📑 NOTES</span>
                </div>

                <!-- DRAWER -->
                <aside class="info-drawer" id="drawer">
                    <div class="drawer-header">
                        <span class="drawer-title" id="d-title">Overview</span>
                        <button class="drawer-close" id="d-close">✕</button>
                    </div>
                    <div class="drawer-content" id="d-content"></div>
                </aside>

                <!-- 3D VIEWER -->
                <model-viewer id="v3d" 
                    src="${data.modelUrl}" 
                    camera-controls 
                    auto-rotate 
                    shadow-intensity="1" 
                    camera-orbit="0deg 75deg 105%"
                    interpolation-decay="200">
                    
                    ${data.hotspots.map(hs => `
                        <button class="Hotspot" slot="hotspot-${hs.id}" 
                                data-id="${hs.id}"
                                data-position="${hs.pos.replace('m','')}" 
                                data-normal="${(hs.norm || "0 1 0").replace('m','')}">
                            <div class="HotspotAnnotation">${hs.label}</div>
                        </button>`).join('')}
                </model-viewer>

                <button class="reset-btn" id="reset-v">↺ VIEW ALL</button>
            </div>
        `;

        // 2. GET ELEMENTS
        const viewer = container.querySelector('#v3d');
        const loader = container.querySelector('#skel-loader');
        const drawer = container.querySelector('#drawer');
        const trigger = container.querySelector('#drawer-trigger');
        const dTitle = container.querySelector('#d-title');
        const dContent = container.querySelector('#d-content');

        // 3. HANDLE MODEL LOADING (Fixes the purple dots bunching issue)
        viewer.addEventListener('load', () => {
            console.log("3D Model Loaded Successfully");
            loader.classList.add('hidden'); // Hide Spinner
            viewer.classList.add('loaded'); // Show Model & Pins
        });

        // Handle Errors
        viewer.addEventListener('error', (e) => {
            loader.innerHTML = `<span style="color:red">⚠️ Error loading 3D file.</span><br><small style="font-size:10px">${data.modelUrl}</small>`;
        });

        // 4. DRAWER CONTENT LOGIC
        const updateDrawer = (isGeneral = false, hotspotData = null) => {
            if (isGeneral) {
                dTitle.innerText = "General Overview";
                dContent.innerHTML = `
                    <h3 style="margin-top:0; color:#7c3aed;">${data.topic}</h3>
                    <p>${data.intro}</p>
                    ${data.notes ? `<ul style="padding-left:20px;">${data.notes.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}
                    <div style="margin-top:20px; padding:12px; background:#f1f5f9; border-radius:12px; font-size:12px; text-align:center; color:#64748b;">
                        👆 Tap the purple pins on the model to learn more.
                    </div>
                `;
            } else if (hotspotData) {
                dTitle.innerText = hotspotData.label;
                dContent.innerHTML = `
                    <p style="font-weight:600; color:#334155;">${hotspotData.info}</p>
                    <p>${hotspotData.description || ""}</p>
                    ${hotspotData.examTip ? `
                        <div style="margin-top:15px; background:#fffbeb; border-left:4px solid #f59e0b; padding:10px; border-radius:4px;">
                            <strong style="color:#b45309; font-size:10px; text-transform:uppercase;">💡 Exam Tip</strong><br>
                            ${hotspotData.examTip}
                        </div>
                    ` : ''}
                `;
            }
        };

        // Init Drawer
        updateDrawer(true);

        // 5. INTERACTION LISTENERS
        trigger.onclick = () => {
            drawer.classList.add('open');
            trigger.classList.remove('pulse');
        };

        container.querySelector('#d-close').onclick = () => drawer.classList.remove('open');

        // Hotspot Clicks
        container.querySelectorAll('.Hotspot').forEach(h => {
            h.onclick = (e) => {
                e.stopPropagation();
                container.querySelectorAll('.Hotspot').forEach(btn => btn.classList.remove('selected'));
                h.classList.add('selected');

                // Camera Action
                viewer.cameraTarget = h.dataset.position;
                viewer.cameraOrbit = SkeletonQuestEngine.calculateOrbit(h.dataset.normal);

                // Drawer Action
                const hsData = data.hotspots.find(x => x.id === h.dataset.id);
                updateDrawer(false, hsData);
                
                // Open Drawer automatically on mobile for better UX
                drawer.classList.add('open');
            };
        });

        // Background Click
        viewer.addEventListener('mousedown', (e) => {
            if(e.target === viewer) {
                container.querySelectorAll('.Hotspot').forEach(btn => btn.classList.remove('selected'));
                // Don't close drawer immediately, maybe user wants to read?
                // But reset to general info
                // updateDrawer(true); 
            }
        });

        container.querySelector('#reset-v').onclick = () => {
            viewer.cameraTarget = "auto auto auto";
            viewer.cameraOrbit = "0deg 75deg 105%";
            container.querySelectorAll('.Hotspot').forEach(btn => btn.classList.remove('selected'));
            drawer.classList.remove('open');
            updateDrawer(true);
        };
    },

    // --- QUIZ MODE (Simplified) ---
    renderLabeling: (container, data) => {
    SkeletonQuestEngine.injectStyles();
    container.innerHTML = `
        <div class="manya-3d-root">
            <div class="model-loader" id="skel-loader-q">
                <span>Loading Quiz...</span>
            </div>
            
            <div style="position:absolute; top:15px; left:15px; right:15px; background:rgba(255,255,255,0.95); padding:15px; border-radius:16px; z-index:100; text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.1); backdrop-filter:blur(5px);">
                <h3 style="margin:0; font-size:15px; color:#1e293b;">${data.variantTitle || 'Label the parts'}</h3>
                <p id="q-status" style="margin:5px 0 0 0; color:#7c3aed; font-weight:800; font-size:12px;">
                    Tap a purple pin to select a part, then choose its name
                </p>
            </div>

            <model-viewer id="q3d" src="${data.modelUrl}" camera-controls shadow-intensity="1" bounds="tight">
                ${data.hotspots.map(hs => `
                    <button class="Hotspot" id="pin-${hs.id}" slot="hotspot-${hs.id}"
                            data-id="${hs.id}"
                            data-position="${hs.pos.replace('m','')}" 
                            data-normal="${(hs.norm || "0 1 0").replace('m','')}">
                        <div class="HotspotAnnotation" id="anno-${hs.id}"></div>
                    </button>
                `).join('')}
            </model-viewer>

            <div style="position:absolute; bottom:100px; left:0; right:0; background:white; padding:20px; z-index:100; box-shadow:0 -5px 20px rgba(0,0,0,0.05);">
                <div id="wordbank" style="display:flex; flex-wrap:wrap; gap:12px; justify-content:center;">
                    ${data.wordBank.map(w => `
                        <button class="q-btn" style="padding:14px 20px; background:#f8fafc; border:2px solid #e2e8f0; border-radius:12px; font-weight:700; color:#475569; font-size:13px;" 
                                data-word="${w}">${w}</button>
                    `).join('')}
                </div>
            </div>

            <div style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); z-index:100; display:flex; gap:16px;">
                <button id="submitBtn" disabled 
                        style="padding:14px 32px; font-size:16px; font-weight:700; background:#7c3aed; color:white; border:none; border-radius:30px; cursor:pointer;">
                    Submit Answers
                </button>
                <button id="resetBtn" 
                        style="padding:14px 32px; font-size:16px; font-weight:700; background:#6b7280; color:white; border:none; border-radius:30px; cursor:pointer;">
                    Reset
                </button>
            </div>
        </div>
    `;

    const viewer = container.querySelector('#q3d');
    const loader = container.querySelector('#skel-loader-q');
    const status = container.querySelector('#q-status');
    const submitBtn = container.querySelector('#submitBtn');
    const resetBtn = container.querySelector('#resetBtn');
    const wordButtons = container.querySelectorAll('#wordbank .q-btn');
    const hotspots = container.querySelectorAll('.Hotspot');

    let currentPin = null;
    const userSelections = {}; // pinId → chosen word

    viewer.addEventListener('load', () => { 
        loader.classList.add('hidden'); 
        viewer.classList.add('loaded');
        status.innerText = "Tap a purple pin to select a part, then choose its name";
    });

    // Pin selection
    hotspots.forEach(p => {
        p.onclick = () => {
            hotspots.forEach(x => x.classList.remove('selected'));
            p.classList.add('selected');
            currentPin = p.dataset.id;
            status.innerText = "Now choose the name for this part from below";
        };
    });

    // Word selection – show chosen word as hint on pin (no right/wrong yet)
    wordButtons.forEach(btn => {
        btn.onclick = () => {
            if (!currentPin) {
                status.innerText = "⚠️ Tap a purple pin first!";
                return;
            }

            const selectedWord = btn.dataset.word;
            userSelections[currentPin] = selectedWord;

            // Show chosen word as floating hint
            const anno = container.querySelector(`#anno-${currentPin}`);
            anno.innerText = selectedWord;
            const pin = container.querySelector(`#pin-${currentPin}`);
            pin.classList.add('labeled');

            // Visual cue on button
            wordButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            status.innerText = `Labeled as "${selectedWord}". Continue labeling or Submit.`;

            // Auto-deselect pin
            hotspots.forEach(x => x.classList.remove('selected'));
            currentPin = null;

            // Enable Submit only when all labeled
            checkAllLabeled();
        };
    });

    // Check if all pins have labels → enable Submit
    function checkAllLabeled() {
        const allLabeled = data.hotspots.every(h => userSelections[h.id]);
        submitBtn.disabled = !allLabeled;
        if (allLabeled) {
            status.innerText = "All parts labeled! Click Submit to check.";
        }
    }

    // Submit – check ALL answers only when clicked
 // Inside renderLabeling function, right after const submitBtn = ... line

// Expose result callback to parent (QuestScreen will set this)
window.onSimulationSubmit = null;  // will be set by QuestScreen

// Then in your submitBtn.onclick:
submitBtn.onclick = () => {
    let allCorrect = true;
    data.hotspots.forEach(h => {
        if (userSelections[h.id] !== h.label) {
            allCorrect = false;
        }
    });

    // Show UI feedback (your existing code)
    if (allCorrect) {
        status.innerHTML = `<span style="color:#16a34a; font-size:1.3em;">🏆 Correct! Perfect score!</span>`;
    } else {
        status.innerHTML = `<span style="color:#dc2626; font-size:1.2em;">Incorrect – some parts are wrong.</span>`;
    }

    // IMPORTANT: Notify parent system (QuestScreen)
    const result = {
        isCorrect: allCorrect,
        correctCount: allCorrect ? data.hotspots.length : 0,
        total: data.hotspots.length,
        selections: { ...userSelections }
    };

    if (window.onSimulationSubmit) {
        console.log('🔔 Notifying QuestScreen of submit result:', result);
        window.onSimulationSubmit(result);
    } else {
        console.warn('⚠️ No parent listener found for simulation submit');
    }
};

    // Reset
    resetBtn.onclick = () => {
        currentPin = null;
        Object.keys(userSelections).forEach(k => delete userSelections[k]);
        status.innerText = "Tap a purple pin to select a part, then choose its name";
        hotspots.forEach(p => {
            p.classList.remove('selected', 'labeled');
            container.querySelector(`#anno-${p.id.replace('pin-','')}`).innerText = '';
        });
        wordButtons.forEach(b => b.classList.remove('selected'));
        submitBtn.disabled = true;
        viewer.cameraTarget = "auto auto auto";
        viewer.cameraOrbit = "0deg 75deg 105%";
    };
    // Inside your renderLabeling function, update the submitAnswers function:

window.submitAnswers = () => {
    let allCorrect = true;
    data.hotspots.forEach(h => {
        if (userSelections[h.id] !== h.label) {
            allCorrect = false;
        }
    });

    if (allCorrect) {
        status.innerHTML = `<span style="color:#16a34a; font-size:1.3em;">✅ Completed correctly! Perfect score!</span>`;
        
        // Capture result and auto-advance
        if (window.captureSimulationResult) {
            window.captureSimulationResult(true, data.hotspots.length, data.hotspots.length);
        }
    } else {
        status.innerHTML = `<span style="color:#dc2626; font-size:1.2em;">Completed – but incorrect (some parts are wrong).</span>`;
        
        // Capture result and auto-advance (incorrect)
        if (window.captureSimulationResult) {
            window.captureSimulationResult(false, 0, data.hotspots.length);
        }
    }
};
}
};