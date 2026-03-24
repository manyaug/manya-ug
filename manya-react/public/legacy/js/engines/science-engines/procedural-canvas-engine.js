/**
 * MANYA MASTER PROCEDURAL ENGINE v28.0 (ELITE MASTER)
 * -----------------------------------------------------------
 * FEATURES:
 * - HUD TAKEOVER: Science-themed header with Elite Chevron and ManyaDB gems.
 * - FIXED-GRID STAGE: Blocks HUD (80px) and Nav (95px) for 100% viewport safety.
 * - TACTILE BIOMETRIC CONTROLS: High-fidelity slider and physical-press buttons.
 * - BENTO DATA CARD: Muscle analysis cards using the "Hero Lab" aesthetic.
 * - ASYNC RENDERER: Dynamically imports simulation math for muscles/joints.
 */



export const ProceduralCanvasEngine = {
    state: {
        flexion: 0, targetFlexion: 0,
        data: null, animationFrame: null,
        scale: 1, fitScale: 1, pivot: { x: 0, y: 0 },
        selectedPartId: 'bicep',
        palette: { flexor: "#DB2777", extensor: "#7C3AED", bone: "#F1F5F9" }
    },

    injectStyles: () => {
        if (document.getElementById('manya-proc-v17-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-proc-v17-styles';
        style.innerHTML = `
            .proc-root { position: relative; width: 100%; height: 100%; background: #FDFBF7; display: grid; grid-template-rows: 1fr; z-index: 10; }
            .proc-stage { grid-row: 1; display: flex; flex-direction: column; padding: 10px 15px; }
            
            .proc-viewport-bento { 
                flex: 1; background: white; border-radius: 35px; border: 2.5px solid #F1F5F9; 
                position: relative; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.03); 
            }
/* ... rest of existing styles ... */
            .proc-viewport-bento::before { content: ''; position: absolute; inset: 0; background-image: linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px); background-size: 30px 30px; opacity: 0.2; }
            
            canvas { display: block; width: 100%; height: 100%; position: relative; z-index: 5; }
            
            .proc-console { margin-top: 15px; background: white; padding: 20px; border-radius: 30px; border: 2px solid #F1F5F9; display: flex; flex-direction: column; gap: 12px; }
            
            .manya-range { width: 100%; -webkit-appearance: none; height: 10px; border-radius: 10px; background: #F1F5F9; border: 1.5px solid #E2E8F0; }
            .manya-range::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%; background: #7c3aed; border: 4px solid white; box-shadow: 0 4px 10px rgba(124, 58, 237, 0.3); }

            .proc-action-grid { display: grid; grid-template-columns: 1fr 1fr 50px; gap: 10px; }
            .proc-btn-elite { padding: 15px; border-radius: 18px; border: none; font-weight: 900; background: white; color: #7c3aed; border: 2.5px solid #F1F5F9; box-shadow: 0 4px 0 #F1F5F9; }
            .proc-btn-elite:active { transform: translateY(2px); box-shadow: none; }

            .proc-data-card { background: #F8FAFC; padding: 18px; border-radius: 24px; border: 1.5px solid #F1EFE9; margin-top: 10px; animation: procPop 0.4s both; }
            @keyframes procPop { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        `;
        document.head.appendChild(style);
    },

        renderLabeling: async (container, data) => {
        ProceduralCanvasEngine.injectStyles();
        ProceduralCanvasEngine.state.data = data;

        // Load Render Logic
        try {
            const module = await import(`../../../../assets/science/scripts/${data.renderScript}`);
            ProceduralCanvasEngine.subEngine = Object.values(module)[0];
        } catch (e) { 
            if(window.addToast) window.addToast({message: "Render logic missing", type: "error"});
            return;
        }

        container.innerHTML = `
            <div class="proc-root animate-in">
                <main class="proc-stage">
                    <div class="proc-viewport-bento">
                        <canvas id="procCanvas"></canvas>
                    </div>

                    <div class="proc-console">
                        <div style="display:flex; justify-content:space-between; font-weight:900; font-size:10px; color:#94A3B8;">
                            <span>RELAXED</span>
                            <span id="proc-label" style="color:#7c3aed">SCANNING...</span>
                            <span>FLEXED</span>
                        </div>
                        <input type="range" id="procSlider" class="manya-range" min="0" max="100" value="0">
                        <div class="proc-action-grid">
                            <button class="proc-btn-elite" onclick="ProceduralCanvasEngine.state.targetFlexion=1; document.getElementById('procSlider').value=100">Flex</button>
                            <button class="proc-btn-elite" onclick="ProceduralCanvasEngine.state.targetFlexion=0; document.getElementById('procSlider').value=0">Extend</button>
                            <button class="proc-btn-elite" style="color:#94A3B8" onclick="ProceduralCanvasEngine.state.targetFlexion=0; document.getElementById('procSlider').value=0">↺</button>
                        </div>
                        <div id="proc-info-mount"></div>
                    </div>
                </main>
            </div>`;

        const canvas = container.querySelector('#procCanvas');
        ProceduralCanvasEngine.canvas = canvas;
        ProceduralCanvasEngine.ctx = canvas.getContext('2d');

        // Robust Resize Fix
        const resize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            if(rect.width === 0) return setTimeout(resize, 50);
            const dpr = window.devicePixelRatio || 2;
            canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
            ProceduralCanvasEngine.state.scale = dpr;
            ProceduralCanvasEngine.ctx.scale(dpr, dpr);
            ProceduralCanvasEngine.draw();
        };
        new ResizeObserver(resize).observe(canvas.parentElement);

        // HIT DETECTION
        canvas.onclick = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - ProceduralCanvasEngine.state.pivot.x) / ProceduralCanvasEngine.state.fitScale;
            const y = (e.clientY - rect.top - ProceduralCanvasEngine.state.pivot.y) / ProceduralCanvasEngine.state.fitScale;
            const hit = ProceduralCanvasEngine.subEngine.checkHit?.(x, y, ProceduralCanvasEngine.state);
            if(hit) ProceduralCanvasEngine.updateInfo(hit);
        };

        ProceduralCanvasEngine.startLoop();
        ProceduralCanvasEngine.updateInfo('bicep');
    },

    updateInfo: (id) => {
        const part = ProceduralCanvasEngine.state.data.parts[id];
        if (!part) return;
        document.getElementById('proc-info-mount').innerHTML = `
            <div class="proc-data-card">
                <div class="proc-data-title">${part.title}</div>
                <p class="proc-data-desc">${part.desc}</p>
            </div>`;
        document.getElementById('proc-label').innerText = id.toUpperCase();

        // DB Bridge: Mark as completed once an interaction occurs
        if (!ProceduralCanvasEngine.state.hasInteracted) {
            ProceduralCanvasEngine.state.hasInteracted = true;
            if (window.captureSimulationResult) window.captureSimulationResult(true, 1, 1);
            if (window.onSimulationSubmit) window.onSimulationSubmit({ isCorrect: true, score: 1, total: 1, type: 'simulation' });
        }
    },

    startLoop: () => {
        if (ProceduralCanvasEngine.animationFrame) cancelAnimationFrame(ProceduralCanvasEngine.animationFrame);
        const tick = () => {
            if (!document.getElementById('procCanvas')) return;
            ProceduralCanvasEngine.state.flexion += (ProceduralCanvasEngine.state.targetFlexion - ProceduralCanvasEngine.state.flexion) * 0.1;
            ProceduralCanvasEngine.draw();
            ProceduralCanvasEngine.animationFrame = requestAnimationFrame(tick);
        };
        tick();
    },

    draw: () => {
        const ctx = ProceduralCanvasEngine.ctx;
        const canvas = ProceduralCanvasEngine.canvas;
        if (!ctx) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        const logW = canvas.width / ProceduralCanvasEngine.state.scale;
        const logH = canvas.height / ProceduralCanvasEngine.state.scale;
        ProceduralCanvasEngine.state.pivot = { x: logW * 0.15, y: logH * 0.75 };
        ProceduralCanvasEngine.state.fitScale = Math.min(logW / 380, logH / 300, 1.0);

        ctx.save();
        ctx.translate(ProceduralCanvasEngine.state.pivot.x, ProceduralCanvasEngine.state.pivot.y);
        ctx.scale(ProceduralCanvasEngine.state.fitScale, ProceduralCanvasEngine.state.fitScale);
        ProceduralCanvasEngine.subEngine.draw(ctx, 0, 0, ProceduralCanvasEngine.state);
        ctx.restore();
    }
};

window.ProceduralCanvasEngine = ProceduralCanvasEngine;