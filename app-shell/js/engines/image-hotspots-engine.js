/**
 * MANYA 2D IMAGE HOTSPOT ENGINE v5.0 (ELITE MASTER)
 * -----------------------------------------------------------
 * FEATURES:
 * - HUD TAKEOVER: Science-themed header with Elite Chevron.
 * - BOXED VIEWPORT: Ensures diagrams never overlap system UI.
 * - NEON GLOW PINS: Pulsing interactive hotspots with haptic-style feedback.
 * - BENTO DRAWER: High-fidelity study notes with tap-to-dismiss logic.
 * - REAL-TIME SYNC: Integrated with ManyaDB and ManyaNotify.
 */

import { ManyaDB } from '/app-shell/manya-db.js';
import { ManyaNotify } from '/app-shell/views/manya-notify.js';


export const ImageHotspotEngine = {
    state: {
        data: null,
        selectedPinId: null
    },

    // --- 1. WORLD-CLASS STYLES ---
    injectStyles: () => {
        if (document.getElementById('manya-2d-hotspot-v5-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-2d-hotspot-v5-styles';
        style.innerHTML = `
            .hotspot-root { 
                position: fixed; inset: 0; background: #FDFBF7; 
                display: grid;
                grid-template-rows: 80px 1fr 95px; /* HUD | Content | Nav */
                z-index: 5000;
                font-family: 'Plus Jakarta Sans', sans-serif;
            }

            /* BOXED DIAGRAM CONTAINER */
            .hotspot-stage {
                grid-row: 2; display: flex; flex-direction: column;
                padding: 0 15px; position: relative; overflow: hidden;
            }

            .hotspot-viewport-bento {
                flex: 1; background: white; border-radius: 35px;
                border: 2.5px solid #F1F5F9; position: relative;
                overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.03);
                display: flex; align-items: center; justify-content: center;
            }

            .hotspot-img-wrapper { position: relative; width: 90%; max-height: 90%; }
            .hotspot-img-wrapper img { width: 100%; height: auto; display: block; border-radius: 15px; }

            /* NEON INTERACTIVE PINS */
            .pin-2d { 
                position: absolute; width: 28px; height: 28px; 
                transform: translate(-50%, -50%); cursor: pointer; z-index: 10; 
                display: flex; align-items: center; justify-content: center; 
            }
            .pin-dot { 
                width: 14px; height: 14px; background: #7c3aed; 
                border: 3px solid white; border-radius: 50%; 
                box-shadow: 0 0 15px rgba(124, 58, 237, 0.6); transition: 0.3s; 
            }
            
            .pin-2d::after { 
                content: ''; position: absolute; width: 100%; height: 100%; 
                border-radius: 50%; border: 2.5px solid #7c3aed; animation: pinPulse 2s infinite; 
            }
            .pin-2d.active .pin-dot { background: #db2777; transform: scale(1.3); box-shadow: 0 0 20px rgba(219, 39, 119, 0.8); }
            .pin-2d.correct .pin-dot { background: #10B981 !important; border-color: white; transform: scale(1); }
            .pin-2d.correct::after { display: none; }

            /* BENTO INFO DRAWER (STUDY) */
            .hotspot-drawer {
                position: absolute; bottom: 0; left: 0; right: 0; height: 50%;
                background: rgba(255,255,255,0.98); backdrop-filter: blur(20px);
                z-index: 500; border-radius: 40px 40px 0 0;
                border-top: 2px solid #F1F5F9;
                transform: translateY(105%); transition: 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                display: flex; flex-direction: column;
                box-shadow: 0 -20px 50px rgba(0,0,0,0.1);
            }
            .hotspot-drawer.open { transform: translateY(0); }
            .drawer-handle { width: 45px; height: 5px; background: #E2E8F0; border-radius: 10px; margin: 15px auto; }
            .drawer-body { flex: 1; overflow-y: auto; padding: 0 25px 40px; }

            /* QUIZ WORD BANK */
            .hotspot-quiz-bank {
                margin-top: 15px; background: white; border-radius: 30px;
                padding: 15px; border: 2px solid #F1F5F9;
                display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
            }
            .q-btn-elite {
                padding: 16px 10px; background: white; border: 2.5px solid #F1F5F9;
                border-radius: 20px; font-weight: 800; font-size: 13px;
                color: #1E293B; cursor: pointer; transition: 0.1s;
                box-shadow: 0 4px 0 #F1F5F9; text-align: center;
            }
            .q-btn-elite:active { transform: translateY(3px); box-shadow: none; }
            .q-btn-elite.correct { background: #DCFCE7; border-color: #22C55E; color: #16A34A; }

            @keyframes pinPulse { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        `;
        document.head.appendChild(style);
    },

    // --- 2. RENDER STUDY MODE ---
    renderStudy: async (container, data) => {
        ImageHotspotEngine.injectStyles();
        const user = await ManyaDB.getCurrentUser();
        const hotspots = data.hotspots || [];

        container.innerHTML = `
            <div class="hotspot-root animate-in">
                <!-- HUD -->
                <header class="app-header-master">
                    <div class="header-shell" style="border: 2px solid #10B981">
                        <button class="uni-back-btn" style="background:#10B981" onclick="ViewManager.goBack()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <div class="uni-title-box" style="margin-left:15px">
                            <span class="uni-main-title">${data.topic.toUpperCase()}</span>
                            <span class="uni-sub-title" style="color:#10B981">LEARNING DIAGRAM</span>
                        </div>
                        <div class="uni-stats">
                            <span class="diamond-sparkle">💎</span>
                            <span class="uni-count">${user.diamonds}</span>
                        </div>
                    </div>
                </header>

                <main class="hotspot-stage">
                    <div class="hotspot-viewport-bento" id="hs-trigger">
                        <div class="hotspot-img-wrapper">
                            <img src="${data.imageUrl}" alt="Study Diagram">
                            ${hotspots.map(hs => `
                                <div class="pin-2d" data-id="${hs.id}" style="left:${hs.x}%; top:${hs.y}%;">
                                    <div class="pin-dot"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="hotspot-drawer" id="hs-drawer">
                        <div class="drawer-handle"></div>
                        <div class="drawer-body" id="hs-drawer-content">
                            <h2 style="margin:0; font-weight:900; color:#1E293B;">Diagram Explorer</h2>
                            <p style="color:#64748B; font-weight:600; line-height:1.6; margin-top:10px;">${data.intro || "Explore the parts of this diagram to master the topic."}</p>
                            <div style="background:#F8FAFC; padding:20px; border-radius:22px; border:1.5px solid #F1F5F9; margin-top:20px; text-align:center;">
                                <p style="margin:0; font-size:14px; font-weight:700; color:#475569;">Tap the glowing purple points to analyze the diagram.</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>`;

        const drawer = container.querySelector('#hs-drawer');
        
        // TAP OUTSIDE TO DISMISS
        container.querySelector('#hs-trigger').onclick = () => {
            drawer.classList.remove('open');
            container.querySelectorAll('.pin-2d').forEach(p => p.classList.remove('active'));
        };

        container.querySelectorAll('.pin-2d').forEach(pin => {
            pin.onclick = (e) => {
                e.stopPropagation();
                container.querySelectorAll('.pin-2d').forEach(p => p.classList.remove('active'));
                pin.classList.add('active');

                const hs = hotspots.find(h => h.id === pin.dataset.id);
                container.querySelector('#hs-drawer-content').innerHTML = `
                    <span style="padding:5px 12px; background:#F5F3FF; color:#7c3aed; font-size:10px; font-weight:900; border-radius:10px;">${hs.label.toUpperCase()}</span>
                    <h2 style="margin:10px 0 0; font-weight:900; font-size:24px;">Part Analysis</h2>
                    <p style="font-weight:700; color:#1E293B; font-size:18px; margin-top:15px;">${hs.info}</p>
                    <p style="color:#64748B; font-weight:600; line-height:1.6; margin-top:10px;">${hs.description || "Crucial component for the system's function."}</p>
                    ${hs.examTip ? `<div style="background:#FFFBEB; border:2.5px solid #FBBF24; padding:20px; border-radius:24px; margin-top:25px; display:flex; gap:15px;"><span style="font-size:24px">💡</span><div><div style="font-weight:900; font-size:11px; color:#92400E;">PLE STRATEGY</div><div style="font-weight:700; font-size:14px; color:#B45309;">${hs.examTip}</div></div></div>` : ''}
                `;
                drawer.classList.add('open');
            };
        });
    },

    // --- 3. RENDER LABELING MODE (QUIZ) ---
    renderLabeling: async (container, data) => {
        ImageHotspotEngine.injectStyles();
        const user = await ManyaDB.getCurrentUser();
        const hotspots = data.hotspots || [];
        const wordBank = data.wordBank || hotspots.map(h => h.label);
        let selectedPinId = null;

        container.innerHTML = `
            <div class="hotspot-root animate-in">
                <header class="app-header-master">
                    <div class="header-shell" style="border: 2px solid #7c3aed">
                        <button class="uni-back-btn" style="background:#7c3aed" onclick="ViewManager.goBack()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <div class="uni-title-box" style="margin-left:15px">
                            <span class="uni-main-title">DIAGRAM QUIZ</span>
                            <span class="uni-sub-title">SELECT THE NAME</span>
                        </div>
                        <div class="uni-stats">
                            <span class="diamond-sparkle">💎</span>
                            <span class="uni-count">${user.diamonds}</span>
                        </div>
                    </div>
                </header>

                <main class="hotspot-stage">
                    <div class="hotspot-viewport-bento">
                        <div class="hotspot-img-wrapper">
                            <img src="${data.imageUrl}">
                            ${hotspots.map(hs => `
                                <div class="pin-2d quiz-pin" id="p2d-${hs.id}" data-id="${hs.id}" style="left:${hs.x}%; top:${hs.y}%;">
                                    <div class="pin-dot"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="hotspot-quiz-bank">
                        ${wordBank.map(w => `<button class="q-btn-elite" onclick="window.HandleHotspotQuiz(this, '${w}')">${w}</button>`).join('')}
                    </div>
                </main>
            </div>`;

        container.querySelectorAll('.quiz-pin').forEach(pin => {
            pin.onclick = (e) => {
                e.stopPropagation();
                container.querySelectorAll('.quiz-pin').forEach(p => p.classList.remove('active'));
                pin.classList.add('active');
                selectedPinId = pin.dataset.id;
                ManyaNotify.show("What is the name of this part?", "info");
            };
        });

        window.HandleHotspotQuiz = (btn, word) => {
            if (!selectedPinId) return ManyaNotify.show("Tap a pulsing pin on the diagram first!", "info");
            
            const correctHS = hotspots.find(h => h.id === selectedPinId);
            if (correctHS.label.toLowerCase() === word.toLowerCase()) {
                ManyaNotify.show("Correct! Great job Hero.", "success");
                btn.classList.add('correct');
                const pin = document.getElementById('p2d-' + selectedPinId);
                pin.classList.replace('active', 'correct');
                selectedPinId = null;
            } else {
                ManyaNotify.show("Not quite. Check the location again!", "error");
            }
        };
    }
};

window.ImageHotspotEngine = ImageHotspotEngine;