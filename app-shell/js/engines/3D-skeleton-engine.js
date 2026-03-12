

import { ManyaDB } from '/app-shell/manya-db.js';
import { ManyaNotify } from '/app-shell/views/manya-notify.js';
/**
 * MANYA 3D SKELETON ENGINE v15.0 (ELITE UNIVERSAL)
 * --------------------------------------------------------
 * FIXES:
 * - DYNAMIC SCREEN PADDING: Physically blocks out HUD (80px) and Nav (95px).
 * - OVERLAP ELIMINATION: Uses CSS Grid to ensure model and UI never collide.
 * - EXPANDED LABELING: Quiz bank now takes 40% of the screen for easier tapping.
 * - TAP-TO-DISMISS: Fully functional "click-away" logic for the info drawer.
 * - RESET BUTTON: Precision-placed tactile reset.
 */



export const SkeletonQuestEngine = {
    state: {
        data: null,
        selectedPinId: null
    },

    // --- 1. GLOBAL STYLES ---
    injectStyles: () => {
        if (document.getElementById('manya-skeleton-v15-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-skeleton-v15-styles';
        style.innerHTML = `
            .skel-root { 
                position: fixed; inset: 0; background: #FDFBF7; 
                display: grid;
                /* HUD Area | Content Area | Bottom Nav Area */
                grid-template-rows: 80px 1fr 95px;
                z-index: 5000;
                font-family: 'Plus Jakarta Sans', sans-serif;
                box-sizing: border-box;
            }

            /* SLOT 2: THE MAIN INTERACTIVE STAGE */
            .skel-stage {
                grid-row: 2;
                display: flex;
                flex-direction: column;
                padding: 0 15px;
                position: relative;
                overflow: hidden;
            }

            /* THE BOXED 3D VIEWPORT */
            .skel-viewport-bento { 
                flex: 1; 
                background: white; border-radius: 35px;
                border: 2.5px solid #F1F5F9; position: relative;
                overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.03);
                min-height: 250px;
            }
            model-viewer { width: 100%; height: 100%; outline: none; --min-hotspot-opacity: 0; }

            /* RESET & HUD UI */
            .skel-reset-btn {
                position: absolute; left: 15px; bottom: 15px;
                width: 42px; height: 42px; border-radius: 12px;
                background: white; border: 2px solid #F1F5F9;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.06);
            }

            /* HOTSPOT PINS */
            .Hotspot {
                width: 26px; height: 26px; border-radius: 50%; border: 3.5px solid white;
                background: #7c3aed; cursor: pointer;
                box-shadow: 0 0 15px rgba(124, 58, 237, 0.6);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .Hotspot:not(.selected) { animation: pinPulse 2s infinite; }
            .Hotspot.selected { background: #db2777 !important; transform: scale(1.35); box-shadow: 0 0 25px rgba(219, 39, 119, 0.8); z-index: 100; }
            .Hotspot.correct-pin { background: #10B981 !important; animation: none; border-color: white; }

            /* INFO DRAWER (STUDY MODE) */
            .skel-drawer {
                position: absolute; bottom: 0; left: 0; right: 0; height: 60%;
                background: rgba(255,255,255,0.98); backdrop-filter: blur(20px);
                z-index: 500; border-radius: 40px 40px 0 0;
                border-top: 2.5px solid #F1F5F9;
                transform: translateY(105%); transition: 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                display: flex; flex-direction: column;
                box-shadow: 0 -15px 50px rgba(0,0,0,0.12);
            }
            .skel-drawer.open { transform: translateY(0); }
            .drawer-handle { width: 45px; height: 5px; background: #E2E8F0; border-radius: 10px; margin: 15px auto; }
            .drawer-body { flex: 1; overflow-y: auto; padding: 0 25px 40px; }

            /* WORD BANK (QUIZ MODE) */
            .skel-quiz-bank {
                margin-top: 15px;
                display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
                background: white; border-radius: 30px; padding: 15px;
                border: 2px solid #F1F5F9;
                flex: 0 0 auto; /* Ensures it doesn't shrink */
            }

            .q-btn-elite {
                padding: 16px 10px; background: white; border: 2.5px solid #F1F5F9;
                border-radius: 20px; font-weight: 800; font-size: 13px;
                color: #1E293B; cursor: pointer; transition: 0.1s;
                box-shadow: 0 4px 0 #F1F5F9; text-align: center;
            }
            .q-btn-elite.correct { background: #DCFCE7; border-color: #22C55E; color: #16A34A; }

            @keyframes pinPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.6); } 70% { box-shadow: 0 0 0 15px rgba(124, 58, 237, 0); } }
        `;
        document.head.appendChild(style);
    },

    calculateOrbit: (normStr) => {
        if (!normStr) return "0deg 75deg 80%";
        const parts = normStr.split(' ').map(Number);
        let theta = Math.atan2(parts[0], parts[2]) * (180 / Math.PI);
        let phi = Math.acos(parts[1]) * (180 / Math.PI);
        return `${theta}deg ${phi}deg 70%`;
    },

    // --- 3. RENDER STUDY (SIMULATION) ---
    renderStudy: async (container, data) => {
        SkeletonQuestEngine.injectStyles();
        const user = await ManyaDB.getCurrentUser();
        const hotspots = data.hotspots || [];

        container.innerHTML = `
            <div class="skel-root animate-in">
                <!-- Slot 1: HUD -->
                <header class="app-header-master">
                    <div class="header-shell" style="border: 2px solid #10B981">
                        <button class="uni-back-btn" style="background:#10B981" onclick="ViewManager.goBack()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <div class="uni-title-box" style="margin-left:15px">
                            <span class="uni-main-title">${data.topic.toUpperCase()}</span>
                            <span class="uni-sub-title" style="color:#10B981">3D EXPLORER</span>
                        </div>
                        <div class="uni-stats">
                            <span class="diamond-sparkle">💎</span>
                            <span class="uni-count">${user.diamonds}</span>
                        </div>
                    </div>
                </header>

                <!-- Slot 2: Content -->
                <main class="skel-stage">
                    <div class="skel-viewport-bento">
                        <model-viewer id="vMain" src="${data.modelUrl}" camera-controls shadow-intensity="1" auto-rotate camera-orbit="0deg 75deg 105%">
                            ${hotspots.map(hs => `<button class="Hotspot" slot="hotspot-${hs.id}" data-id="${hs.id}" data-position="${hs.pos}" data-normal="${hs.norm || '0 1 0'}"></button>`).join('')}
                        </model-viewer>
                        <div class="skel-reset-btn" id="skel-reset">↺</div>
                    </div>

                    <div class="skel-drawer" id="skel-drawer">
                        <div class="drawer-handle"></div>
                        <div class="drawer-body" id="skel-drawer-content">
                            <h2 style="margin:0; font-weight:900; color:#1E293B;">Skeleton Anatomy</h2>
                            <p style="color:#64748B; font-weight:600; line-height:1.6; margin-top:10px;">${data.intro}</p>
                            <div style="background:#F8FAFC; padding:20px; border-radius:22px; border:1.5px solid #F1F5F9; margin-top:20px; text-align:center;">
                                <p style="margin:0; font-size:14px; font-weight:700; color:#475569;">Tap a purple glowing pin on the bone to analyze it.</p>
                            </div>
                        </div>
                    </div>
                </main>

                <!-- Slot 3: Nav Spacer (Placeholder) -->
                <div class="nav-spacer"></div>
            </div>`;

        const viewer = container.querySelector('#vMain');
        const drawer = container.querySelector('#skel-drawer');
        const resetBtn = container.querySelector('#skel-reset');

        // TAP OUTSIDE DISMISS
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
                    <span style="padding:5px 12px; background:#F5F3FF; color:#7c3aed; font-size:10px; font-weight:900; border-radius:10px;">${hs.label.toUpperCase()}</span>
                    <h2 style="margin:10px 0 0; font-weight:900; font-size:24px;">Bone Analysis</h2>
                    <p style="font-weight:700; color:#1E293B; font-size:18px; margin-top:15px;">${hs.info}</p>
                    <p style="color:#64748B; font-weight:600; line-height:1.6; margin-top:10px;">${hs.description || "Vital structure for support."}</p>
                    ${hs.examTip ? `<div style="background:#FFFBEB; border:2.5px solid #FBBF24; padding:20px; border-radius:24px; margin-top:25px; display:flex; gap:15px;"><span style="font-size:24px">💡</span><div><div style="font-weight:900; font-size:11px; color:#92400E;">PLE STRATEGY</div><div style="font-weight:700; font-size:14px; color:#B45309;">${hs.examTip}</div></div></div>` : ''}
                `;
                drawer.classList.add('open');
                viewer.cameraTarget = pin.dataset.position;
                viewer.cameraOrbit = SkeletonQuestEngine.calculateOrbit(pin.dataset.normal);
            };
        });
    },

    // --- 4. RENDER LABELING (QUIZ) ---
    renderLabeling: async (container, data) => {
        SkeletonQuestEngine.injectStyles();
        const user = await ManyaDB.getCurrentUser();
        const hotspots = data.hotspots || [];
        const wordBank = data.wordBank || hotspots.map(h => h.label);

        container.innerHTML = `
            <div class="skel-root animate-in">
                <header class="app-header-master">
                    <div class="header-shell" style="border: 2px solid #7c3aed">
                        <button class="uni-back-btn" style="background:#7c3aed" onclick="ViewManager.goBack()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <div class="uni-title-box" style="margin-left:15px">
                            <span class="uni-main-title">BIOLOGY QUIZ</span>
                            <span class="uni-sub-title">IDENTIFY THE PART</span>
                        </div>
                        <div class="uni-stats">
                            <span class="diamond-sparkle">💎</span>
                            <span class="uni-count">${user.diamonds}</span>
                        </div>
                    </div>
                </header>

                <main class="skel-stage">
                    <div class="skel-viewport-bento">
                        <model-viewer id="vQuiz" src="${data.modelUrl}" camera-controls shadow-intensity="1" camera-orbit="0deg 75deg 105%">
                            ${hotspots.map(hs => `<button class="Hotspot" id="pin-${hs.id}" slot="hotspot-${hs.id}" data-id="${hs.id}" data-position="${hs.pos}" data-normal="${hs.norm || '0 1 0'}"></button>`).join('')}
                        </model-viewer>
                    </div>

                    <div class="skel-quiz-bank">
                        ${wordBank.map(w => `<button class="q-btn-elite" onclick="window.HandleSkelQuiz(this, '${w}')">${w}</button>`).join('')}
                    </div>
                </main>

                <div class="nav-spacer"></div>
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
            if (!currentPinId) return ManyaNotify.show("Tap a pin on the skeleton first!", "info");
            const hs = hotspots.find(h => h.id === currentPinId);
            if (hs.label.toLowerCase() === word.toLowerCase()) {
                ManyaNotify.show("Excellent!", "success");
                btn.classList.add('correct');
                const pin = document.getElementById('pin-' + currentPinId);
                pin.classList.replace('selected', 'correct-pin');
                currentPinId = null;
                setTimeout(() => { viewer.cameraTarget = "auto auto auto"; }, 1000);
            } else {
                ManyaNotify.show("Check the position and try again!", "error");
            }
        };
    }
};

window.SkeletonQuestEngine = SkeletonQuestEngine;