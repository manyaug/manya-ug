

import { ManyaDB } from '/app-shell/manya-db.js';
import { ManyaNotify } from '/app-shell/views/manya-notify.js';
/**
 * MANYA 3D SKELETON ENGINE v16.0 (ELITE MASTER)
 * --------------------------------------------------------
 * FEATURES:
 * - ADAPTIVE THEME: Automatic Night/Day switching based on Manya User Settings.
 * - UNIFIED HUD: Integrated top bar with Elite Chevron and ManyaDB Gem sync.
 * - BOXED VIEWPORT: Precision margins for high-end "Console" aesthetic.
 * - TAP-TO-DISMISS: Intuitive background clicking to hide info drawers.
 * - DYNAMIC HOTSPOTS: Neon-glow pins with subject-aware state colors.
 */
export const SkeletonQuestEngine = {
    state: {
        data: null,
        selectedPinId: null
    },

    // --- 1. WORLD-CLASS ADAPTIVE STYLES ---
    injectStyles: () => {
        if (document.getElementById('manya-skeleton-v16-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-skeleton-v16-styles';
        style.innerHTML = `
            .skel-root { 
                position: fixed; inset: 0; 
                background: var(--bg-main, #FDFBF7); 
                display: grid;
                grid-template-rows: 85px 1fr 95px; /* Fixed slots for HUD/Nav */
                z-index: 5000;
                font-family: 'Plus Jakarta Sans', sans-serif;
                transition: background 0.5s ease;
            }

            /* SLOT 2: THE MAIN STAGE */
            .skel-stage {
                grid-row: 2; display: flex; flex-direction: column;
                padding: 0 15px; position: relative; overflow: hidden;
            }

            /* THE PREMIUM BOXED VIEWPORT */
            .skel-viewport-bento { 
                flex: 1; background: var(--bg-card, white); 
                border-radius: 35px; border: 2.5px solid var(--border-color, #F1F5F9); 
                position: relative; overflow: hidden; 
                box-shadow: 0 15px 45px rgba(0,0,0,0.04);
            }
            model-viewer { width: 100%; height: 100%; outline: none; --min-hotspot-opacity: 0; }

            /* FLOATING TACTILE RESET */
            .skel-reset-btn {
                position: absolute; left: 15px; bottom: 15px;
                width: 44px; height: 44px; border-radius: 14px;
                background: var(--bg-card, white); border: 2px solid var(--border-color, #F1F5F9);
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                color: var(--text-main); font-size: 18px; transition: 0.2s;
            }
            .skel-reset-btn:active { transform: scale(0.9); background: var(--bg-inner); }

            /* NEON HOTSPOT PINS */
            .Hotspot {
                width: 26px; height: 26px; border-radius: 50%; border: 3.5px solid white;
                background: #7c3aed; cursor: pointer;
                box-shadow: 0 0 15px rgba(124, 58, 237, 0.6);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .Hotspot:not(.selected) { animation: pinPulse 2s infinite; }
            .Hotspot.selected { 
                background: #db2777 !important; transform: scale(1.35); 
                box-shadow: 0 0 25px rgba(219, 39, 119, 0.8); z-index: 100; 
            }
            .Hotspot.correct-pin { background: #10B981 !important; animation: none; border-color: white; }

            /* BENTO INFO DRAWER (SMART NIGHT MODE) */
            .skel-drawer {
                position: absolute; bottom: 0; left: 0; right: 0; height: 58%;
                background: var(--bg-card, white);
                z-index: 500; border-radius: 40px 40px 0 0;
                border-top: 2px solid var(--border-color);
                transform: translateY(105%); transition: 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                display: flex; flex-direction: column;
                box-shadow: 0 -20px 50px rgba(0,0,0,0.1);
            }
            .skel-drawer.open { transform: translateY(0); }
            .drawer-handle { width: 45px; height: 5px; background: var(--border-color, #E2E8F0); border-radius: 10px; margin: 15px auto; }
            .drawer-body { flex: 1; overflow-y: auto; padding: 0 25px 50px; color: var(--text-main); }

            /* QUIZ BANK TACTILE GRID */
            .skel-quiz-bank {
                margin-top: 15px; padding: 15px; background: var(--bg-card);
                border-radius: 30px; border: 2.5px solid var(--border-color);
                display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
                flex: 0 0 auto;
            }
            .q-btn-elite {
                padding: 16px 10px; background: var(--bg-card); border: 2.5px solid var(--border-color);
                border-radius: 20px; font-weight: 800; font-size: 13px;
                color: var(--text-main); cursor: pointer; transition: 0.1s;
                box-shadow: 0 4px 0 var(--border-color); text-align: center;
            }
            .q-btn-elite:active { transform: translateY(3px); box-shadow: none; }
            .q-btn-elite.correct { background: #DCFCE7 !important; border-color: #22C55E !important; color: #16A34A !important; }

            @keyframes pinPulse { 0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.6); } 70% { box-shadow: 0 0 0 15px rgba(124, 58, 237, 0); } }
        `;
        document.head.appendChild(style);
    },

    // --- 2. CAMERA CALCULATION ENGINE ---
    calculateOrbit: (normStr) => {
        if (!normStr) return "0deg 75deg 80%";
        const parts = normStr.split(' ').map(Number);
        let theta = Math.atan2(parts[0], parts[2]) * (180 / Math.PI);
        let phi = Math.acos(parts[1]) * (180 / Math.PI);
        return `${theta}deg ${phi}deg 70%`;
    },

    // --- 3. RENDER STUDY MODE (SIMULATION) ---
    renderStudy: async (container, data) => {
        SkeletonQuestEngine.injectStyles();
        const user = await ManyaDB.getCurrentUser();
        const hotspots = data.hotspots || [];

        container.innerHTML = `
            <div class="skel-root animate-in" data-theme="${user.theme || 'light'}">
                <!-- Slot 1: ELITE HUD -->
                <header class="app-header-master takeover-hud">
            <div class="header-shell" style="border: 2px solid #10B981; background: var(--bg-card) !important;">
                <button class="uni-back-btn" onclick="ViewManager.goBack()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div class="hud-logo">SKELETON ANALYSIS</div>
                <div class="hud-stats">
                    <div class="stat-pill-diamond">💎 <span class="count">${user.diamonds}</span></div>
                </div>
            </div>
        </header>

                <!-- Slot 2: Content -->
                <main class="skel-stage">
                    <div class="skel-viewport-bento">
                        <model-viewer id="vMain" src="${data.modelUrl}" 
                            camera-controls shadow-intensity="1" 
                            auto-rotate 
                            environment-image="neutral"
                            camera-orbit="0deg 75deg 105%">
                            ${hotspots.map(hs => `<button class="Hotspot" slot="hotspot-${hs.id}" data-id="${hs.id}" data-position="${hs.pos}" data-normal="${hs.norm || '0 1 0'}"></button>`).join('')}
                        </model-viewer>
                        <div class="skel-reset-btn" id="skel-reset">↺</div>
                    </div>

                    <div class="skel-drawer" id="skel-drawer">
                        <div class="drawer-handle"></div>
                        <div class="drawer-body" id="skel-drawer-content">
                            <h2 style="margin:0; font-weight:900;">3D Bone Analysis</h2>
                            <p style="color:var(--text-muted); font-weight:600; line-height:1.6; margin-top:10px;">${data.intro || 'Rotate and zoom the model to explore.'}</p>
                            <div style="background:var(--bg-inner); padding:20px; border-radius:22px; border:1.5px solid var(--border-color); margin-top:20px; text-align:center;">
                                <p style="margin:0; font-size:14px; font-weight:700; color:var(--manya-purple);">Tap a purple pin to inspect.</p>
                            </div>
                        </div>
                    </div>
                </main>

                <!-- Slot 3: Nav Guard -->
                <div class="nav-spacer"></div>
            </div>`;

        const viewer = container.querySelector('#vMain');
        const drawer = container.querySelector('#skel-drawer');
        const resetBtn = container.querySelector('#skel-reset');

        // CLICK BACKGROUND TO DISMISS
        viewer.onclick = () => {
            drawer.classList.remove('open');
            container.querySelectorAll('.Hotspot').forEach(p => p.classList.remove('selected'));
        };

        resetBtn.onclick = (e) => {
            e.stopPropagation();
            viewer.cameraTarget = "auto auto auto"; 
            viewer.cameraOrbit = "0deg 75deg 105%";
            drawer.classList.remove('open');
        };

        container.querySelectorAll('.Hotspot').forEach(pin => {
            pin.onclick = (e) => {
                e.stopPropagation();
                container.querySelectorAll('.Hotspot').forEach(p => p.classList.remove('selected'));
                pin.classList.add('selected');
                const hs = hotspots.find(h => h.id === pin.dataset.id);
                
                container.querySelector('#skel-drawer-content').innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                        <span style="padding:5px 12px; background:rgba(124, 58, 237, 0.1); color:#7c3aed; font-size:10px; font-weight:900; border-radius:10px;">${hs.label.toUpperCase()}</span>
                    </div>
                    <h2 style="margin:0; font-weight:900; font-size:24px;">Anatomy Detail</h2>
                    <p style="font-weight:700; color:var(--text-main); font-size:18px; margin-top:15px;">${hs.info}</p>
                    <p style="color:var(--text-muted); font-weight:600; line-height:1.6; margin-top:10px;">${hs.description || "Essential structure for human movement."}</p>
                    ${hs.examTip ? `<div style="background:#FFFBEB; border:2px solid #FBBF24; padding:18px; border-radius:24px; margin-top:25px; display:flex; gap:12px;"><span style="font-size:24px">💡</span><div><div style="font-weight:900; font-size:11px; color:#92400E;">PLE EXAM FOCUS</div><div style="font-weight:700; font-size:13px; color:#B45309; line-height:1.4">${hs.examTip}</div></div></div>` : ''}
                `;
                drawer.classList.add('open');
                viewer.cameraTarget = pin.dataset.position;
                viewer.cameraOrbit = SkeletonQuestEngine.calculateOrbit(pin.dataset.normal);
            };
        });
    },

    // --- 4. RENDER LABELING MODE (QUIZ) ---
    renderLabeling: async (container, data) => {
        SkeletonQuestEngine.injectStyles();
        const user = await ManyaDB.getCurrentUser();
        const hotspots = data.hotspots || [];
        const wordBank = data.wordBank || hotspots.map(h => h.label);

        container.innerHTML = `
            <div class="skel-root animate-in" data-theme="${user.theme || 'light'}">
                <header class="app-header-master">
                    <div class="header-shell" style="border-color: #7c3aed">
                        <button class="uni-back-btn" style="background:#7c3aed" onclick="ViewManager.goBack()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <div class="uni-title-box" style="margin-left:15px">
                            <span class="uni-main-title">3D CHALLENGE</span>
                            <span class="uni-sub-title" style="color:#7c3aed">QUIZ MODE</span>
                        </div>
                        <div class="uni-stats">
                            <span class="diamond-sparkle">💎</span>
                            <span class="uni-count">${user.diamonds}</span>
                        </div>
                    </div>
                </header>

                <main class="skel-stage">
                    <div class="skel-viewport-bento" style="flex: 0.55;">
                        <model-viewer id="vQuiz" src="${data.modelUrl}" camera-controls shadow-intensity="1" camera-orbit="0deg 75deg 105%">
                            ${hotspots.map(hs => `<button class="Hotspot" id="pin-${hs.id}" slot="hotspot-${hs.id}" data-id="${hs.id}" data-position="${hs.pos}" data-normal="${hs.norm || '0 1 0'}"></button>`).join('')}
                        </model-viewer>
                    </div>

                    <div class="skel-quiz-bank">
                        ${wordBank.map(w => `<button class="q-btn-elite" onclick="window.HandleSkelQuiz(this, '${w}')">${w}</button>`).join('')}
                    </div>
                </main>
            </div>`;

        const viewer = container.querySelector('#vQuiz');
        let currentPinId = null;

        container.querySelectorAll('.Hotspot').forEach(pin => {
            pin.onclick = (e) => {
                e.stopPropagation();
                container.querySelectorAll('.Hotspot').forEach(p => p.classList.remove('selected'));
                pin.classList.add('selected');
                currentPinId = pin.dataset.id;
                viewer.cameraTarget = pin.dataset.position;
                viewer.cameraOrbit = SkeletonQuestEngine.calculateOrbit(pin.dataset.normal);
            };
        });

        window.HandleSkelQuiz = (btn, word) => {
            if (!currentPinId) return ManyaNotify.show("Select a pulsing pin first!", "info");
            const hs = hotspots.find(h => h.id === currentPinId);
            if (hs.label.toLowerCase() === word.toLowerCase()) {
                ManyaNotify.show("🌟 Great Work Hero!", "success");
                btn.classList.add('correct');
                const pin = document.getElementById('pin-' + currentPinId);
                pin.classList.replace('selected', 'correct-pin');
                currentPinId = null;
                setTimeout(() => { viewer.cameraTarget = "auto auto auto"; }, 1200);
            } else {
                ManyaNotify.show("Try again Hero!", "error");
            }
        };
    }
};

window.SkeletonQuestEngine = SkeletonQuestEngine;