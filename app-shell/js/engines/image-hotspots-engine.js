/**
 * MANYA 2D IMAGE HOTSPOT ENGINE (v4.0 - THE UNABRIDGED MASTER)
 * -----------------------------------------------------------
 * FEATURES:
 * - Handheld Card Layout: Fits strictly inside view-mount.
 * - Dual Mode: Study (Drawer info) & Labeling (Word Bank quiz).
 * - Responsive Pinning: Pins stay anchored via % coordinates.
 * - Theme: Manya Purple Pins & Pink Status Accents.
 */

export const ImageHotspotEngine = {
    state: {
        data: null,
        selectedPinId: null,
        isResolved: false
    },

    // --- 1. GLOBAL STYLES (PINK/PURPLE CARD THEME) ---
    injectStyles: () => {
        if (document.getElementById('manya-2d-master-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-2d-master-styles';
        style.innerHTML = `
            /* CONTAINER */
            .manya-2d-actor-root { 
                width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; 
                background: #FDFBF7; padding: 10px; box-sizing: border-box; font-family: 'Nunito', sans-serif;
            }

            /* THE HANDHELD CARD */
            .manya-2d-card {
                width: 100%; max-width: 420px; height: 92%; max-height: 660px;
                background: white; border-radius: 40px; box-shadow: 0 20px 60px rgba(30, 41, 59, 0.12); 
                border: 2.5px solid #F1EFE9; display: flex; flex-direction: column; overflow: hidden; position: relative;
                animation: cardPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            @keyframes cardPop { from { opacity:0; transform:translateY(30px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }

            /* VIEWPORT */
            .img-viewport { 
                flex: 1; position: relative; display: flex; align-items: center; justify-content: center; 
                background: #fff; overflow: hidden;
            }
            .manya-img-wrapper { position: relative; display: inline-block; width: 90%; }
            .manya-img-wrapper img { display: block; width: 100%; height: auto; border-radius: 12px; }

            /* --- PINS --- */
            .pin-2d { position: absolute; width: 26px; height: 26px; transform: translate(-50%, -50%); cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; }
            .pin-dot { width: 14px; height: 14px; background: #7C3AED; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.2); transition: 0.3s; }
            
            .pin-2d::after { content: ''; position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid #7C3AED; animation: pinPulse 2s infinite; }
            .pin-2d.active .pin-dot { background: #DB2777; transform: scale(1.4); }
            .pin-2d.correct .pin-dot { background: #22C55E !important; transform: scale(1); }
            .pin-2d.correct::after { display: none; }

            @keyframes pinPulse { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }

            /* --- INFO DRAWER (STUDY) --- */
            .info-drawer-2d {
                position: absolute; bottom: 0; left: 0; right: 0; height: 40%;
                background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(15px);
                z-index: 400; transform: translateY(105%);
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                border-top: 2.5px solid #F1F5F9; display: flex; flex-direction: column;
            }
            .info-drawer-2d.open { transform: translateY(0); }
            .drawer-header { padding: 15px 20px; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; }
            .drawer-title { font-size: 14px; font-weight: 900; color: #7C3AED; margin: 0; text-transform: uppercase; }

            /* --- HUD (QUIZ) --- */
            .hud-2d { flex: 0 0 auto; background: #F8FAFC; padding: 20px 25px; border-top: 2.5px solid #F1F5F9; display: flex; flex-direction: column; gap: 12px; }
            .word-bank-2d { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .word-btn { 
                padding: 12px; background: white; border: 2px solid #E2E8F0; border-radius: 14px; 
                font-weight: 800; color: #475569; font-size: 12px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 0 #F1F5F9;
            }
            .word-btn.correct { background: #dcfce7 !important; border-color: #22c55e !important; color: #15803d !important; }
            .word-btn.wrong { background: #fee2e2 !important; border-color: #ef4444 !important; }

            .status-banner { font-size: 13px; font-weight: 900; text-align: center; color: #7C3AED; min-height: 18px; }
            .badge-2d { position: absolute; top: 15px; left: 15px; background: #DB2777; color: white; padding: 5px 12px; border-radius: 20px; font-size: 9px; font-weight: 900; z-index: 100; }
        `;
        document.head.appendChild(style);
    },

    // --- 2. RENDER STUDY MODE ---
    renderStudy: (container, data) => {
        ImageHotspotEngine.injectStyles();
        const hotspots = data.hotspots || [];

        container.innerHTML = `
            <div class="manya-2d-actor-root">
                <div class="manya-2d-card">
                    <div class="badge-2d">LEARNING MODE</div>
                    
                    <div class="img-viewport">
                        <div class="manya-img-wrapper">
                            <img src="${data.imageUrl}">
                            ${hotspots.map(hs => `
                                <div class="pin-2d" data-id="${hs.id}" style="left:${hs.x}%; top:${hs.y}%;">
                                    <div class="pin-dot"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="info-drawer-2d" id="drawer2d">
                        <div class="drawer-header">
                            <span class="drawer-title" id="d-title-2d">Select a Point</span>
                            <button onclick="document.getElementById('drawer2d').classList.remove('open')" style="border:none; background:none; font-size:24px; font-weight:900; color:#94A3B8;">×</button>
                        </div>
                        <div class="drawer-content" id="d-content-2d" style="padding:20px; color:#475569; line-height:1.6; font-size:14px;">
                            <h3 style="margin:0 0 10px 0; color:#DB2777;">${data.topic}</h3>
                            <p>Tap the purple pulsing points on the diagram to see more information about each part.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const drawer = container.querySelector('#drawer2d');
        container.querySelectorAll('.pin-2d').forEach(pin => {
            pin.onclick = () => {
                const hs = hotspots.find(h => h.id === pin.dataset.id);
                container.querySelectorAll('.pin-2d').forEach(p => p.classList.remove('active'));
                pin.classList.add('active');

                container.querySelector('#d-title-2d').innerText = hs.label;
                container.querySelector('#d-content-2d').innerHTML = `
                    <p style="font-weight:800; color:#1E293B; font-size:1.1rem; margin-bottom:10px;">${hs.info || "Information"}</p>
                    <p>${hs.description || "No further details available for this part."}</p>
                    ${hs.examTip ? `<div style="margin-top:15px; background:#FFFBEB; border-left:4px solid #F59E0B; padding:12px; border-radius:12px; color:#B45309; font-weight:600;">💡 PLE TIP: ${hs.examTip}</div>` : ''}
                `;
                drawer.classList.add('open');
            };
        });
    },

    // --- 3. RENDER LABELING MODE (QUIZ) ---
    renderLabeling: (container, data) => {
        ImageHotspotEngine.injectStyles();
        const hotspots = data.hotspots || [];
        const wordBank = data.wordBank || hotspots.map(h => h.label);
        let selectedPinId = null;

        container.innerHTML = `
            <div class="manya-2d-actor-root">
                <div class="manya-2d-card">
                    <div class="badge-2d" style="background:#7C3AED;">CHALLENGE</div>

                    <div class="img-viewport">
                        <div class="manya-img-wrapper">
                            <img src="${data.imageUrl}">
                            ${hotspots.map(hs => `
                                <div class="pin-2d quiz-pin" id="p2d-${hs.id}" data-id="${hs.id}" style="left:${hs.x}%; top:${hs.y}%;">
                                    <div class="pin-dot"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="hud-2d">
                        <div id="q-status-2d" class="status-banner">Tap a pin to identify!</div>
                        <div class="word-bank-2d">
                            ${wordBank.map(w => `<button class="word-btn" onclick="window.ManyaQuiz2D(this, '${w}')">${w}</button>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.querySelectorAll('.quiz-pin').forEach(pin => {
            pin.onclick = () => {
                container.querySelectorAll('.quiz-pin').forEach(p => p.classList.remove('active'));
                pin.classList.add('active');
                selectedPinId = pin.dataset.id;
                document.getElementById('q-status-2d').innerText = "What is the name of this part?";
            };
        });

        window.ManyaQuiz2D = (btn, word) => {
            if (!selectedPinId) {
                document.getElementById('q-status-2d').innerText = "⚠️ Tap a pin on the diagram first!";
                return;
            }

            const correctHS = hotspots.find(h => h.id === selectedPinId);
            const isCorrect = correctHS.label.toLowerCase() === word.toLowerCase();

            if (isCorrect) {
                document.getElementById('q-status-2d').innerHTML = `<span style="color:#22C55E">🌟 CORRECT! IT IS ${word.toUpperCase()}</span>`;
                btn.classList.add('correct');
                const pin = document.getElementById('p2d-' + selectedPinId);
                pin.classList.remove('active');
                pin.classList.add('correct');
                selectedPinId = null;
            } else {
                document.getElementById('q-status-2d').innerHTML = `<span style="color:#EF4444">❌ NOT QUITE. TRY AGAIN!</span>`;
                btn.classList.add('wrong');
                setTimeout(() => btn.classList.remove('wrong'), 800);
            }
        };
    }
};

// Global export for router
window.ImageHotspotEngine = ImageHotspotEngine;