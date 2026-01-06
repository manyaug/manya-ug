/**
 * Manya 2D Engine (Final Repaired Version)
 * Handles: renderStudy (Learning) & renderLabeling (Quiz)
 */
export const ImageHotspotEngine = {
    injectStyles: () => {
        if (document.getElementById('manya-2d-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-2d-styles';
        style.innerHTML = `
            .manya-2d-root { display: flex; flex-direction: column; height: 100%; width: 100%; max-height: calc(100dvh - 60px); overflow: hidden; background: #fdfdfd; }
            .quest-header-mini { padding: 12px; text-align: center; flex-shrink: 0; }
            .img-viewport { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; margin: 0 8px; background: #ffffff; border-radius: 24px; border: 1px solid #edf2f7; overflow: hidden; }
            .manya-img-wrapper { position: relative; display: inline-block; }
            .manya-img-wrapper img { display: block; max-width: 100%; max-height: 55vh; width: auto; height: auto; transform: scale(1.05); }

            /* PINS */
            .pin-2d { position: absolute; width: 24px; height: 24px; transform: translate(-50%, -50%); cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; }
            .pin-dot { width: 12px; height: 12px; background: var(--quiz-color); border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.2); transition: all 0.3s ease; }
            .pin-2d.study-pin .pin-dot { background: var(--manya-purple); }
            .pin-2d::after { content: ''; position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid var(--quiz-color); animation: pinPulse 2s infinite; opacity: 0; }
            .pin-2d.study-pin::after { border-color: var(--manya-purple); }
            @keyframes pinPulse { 0% { transform: scale(0.5); opacity: 0.8; } 100% { transform: scale(1.8); opacity: 0; } }
            .pin-2d.active { 
                transform: translate(-50%, -50%) scale(2); /* Make it much larger when selected */
                z-index: 1000; 
                border-color: white;
            }
            .pin-2d.active .pin-dot { transform: scale(1.8); }
            .pin-2d.correct .pin-dot { background: var(--success-color); transform: scale(1.2); }
            
            /* INFO CARD (Study Mode) */
            .study-info-card { 
                position: absolute; bottom: 20px; left: 10px; right: 10px; 
                background: white; padding: 15px; border-radius: 16px; 
                border-left: 6px solid var(--manya-purple); box-shadow: 0 -5px 20px rgba(0,0,0,0.1);
                display: none; z-index: 100; animation: slideUp 0.3s ease;
            }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

            /* WORD BANK (Quiz Mode) */
            .word-bank-2d { padding: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; background: white; border-top: 1px solid #f1f5f9; }
            .word-btn-2d { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 700; font-size: 0.85rem; cursor: pointer; text-align: center; }
            .word-btn-2d.used { background: #f1f5f9; color: #cbd5e1; border-color: transparent; pointer-events: none; }
        `;
        document.head.appendChild(style);
    },

    renderStudy: (container, data) => {
        ImageHotspotEngine.injectStyles();
        container.innerHTML = `
            <div class="manya-2d-root">
                <div class="quest-header-mini">
                    <h3>${data.topic}</h3>
                    <p>Tap the purple points to learn.</p>
                </div>
                <div class="img-viewport">
                    <div class="manya-img-wrapper">
                        <img src="${data.imageUrl}">
                        ${data.hotspots.map(hs => `
                            <div class="pin-2d study-pin" data-id="${hs.id}" style="left:${hs.x}%; top:${hs.y}%;">
                                <div class="pin-dot"></div>
                            </div>
                        `).join('')}
                    </div>
                    <div id="study-card" class="study-info-card"></div>
                </div>
            </div>
        `;

        const card = container.querySelector('#study-card');
        container.querySelectorAll('.pin-2d').forEach(pin => {
            pin.onclick = () => {
                const hs = data.hotspots.find(h => h.id === pin.dataset.id);
                container.querySelectorAll('.pin-2d').forEach(p => p.classList.remove('active'));
                pin.classList.add('active');
                card.style.display = 'block';
                card.innerHTML = `<b>${hs.label}</b><p style="margin:5px 0 0 0; font-size:14px; color:#475569;">${hs.info}</p>`;
            };
        });
    },

    renderLabeling: (container, data) => {
        ImageHotspotEngine.injectStyles();
        let selectedId = null;
        container.innerHTML = `
            <div class="manya-2d-root">
                <div class="quest-header-mini">
                    <h3>${data.variantTitle}</h3>
                    <p id="hint-2d">Tap a pulsing point to identify</p>
                </div>
                <div class="img-viewport">
                    <div class="manya-img-wrapper">
                        <img src="${data.imageUrl}">
                        ${data.hotspots.map(hs => `
                            <div class="pin-2d quiz" id="pin2d-${hs.id}" style="left:${hs.x}%; top:${hs.y}%;" data-id="${hs.id}">
                                <div class="pin-dot"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="word-bank-2d">
                    ${data.wordBank.map(w => `<button class="word-btn-2d" data-word="${w}">${w}</button>`).join('')}
                </div>
            </div>
        `;
        const pins = container.querySelectorAll('.pin-2d');
        const hint = container.querySelector('#hint-2d');
        pins.forEach(pin => {
            pin.onclick = () => {
                pins.forEach(p => p.classList.remove('active'));
                pin.classList.add('active');
                selectedId = pin.dataset.id;
                hint.innerText = "Select the correct name below";
            };
        });
        container.querySelectorAll('.word-btn-2d').forEach(btn => {
            btn.onclick = () => {
                if (!selectedId) return;
                const target = data.hotspots.find(h => h.id === selectedId);
                if (btn.dataset.word === target.label) {
                    const activePin = container.querySelector(`#pin2d-${selectedId}`);
                    activePin.classList.add('correct');
                    activePin.classList.remove('active', 'quiz');
                    btn.classList.add('used');
                    selectedId = null;
                    hint.innerText = "Correct!";
                } else { alert("Try again!"); }
            };
        });
    }
};