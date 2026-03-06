/**
 * MANYA PROCEDURAL ENGINE (v27.0 - THE HAND-SAFE VERTICALITY)
 * -----------------------------------------------------------
 * 
 * CORE RECONSTRUCTION:
 * 1. VERTICAL CLEARANCE: Shoulder dropped to 75% Y-axis so the flexed 
 *    arm stays within the upper viewport boundaries.
 * 2. 15% X-ANCHOR: Maintains horizontal runway for extension.
 * 3. DYNAMIC ENVELOPE SCALE: Scales based on the "Bent" height of the arm.
 * 4. BRANDED PALETTE: Bicep (Pink) vs Tricep (Purple) identity.
 */

export const ProceduralCanvasEngine = {
    state: {
        flexion: 0,
        targetFlexion: 0,
        joints: {},
        selectedJointId: null,
        hitRegions: [],
        ctx: null,
        canvas: null,
        data: null,
        animationFrame: null,
        scale: 1,
        // The definitive Manya Science Palette
        palette: {
            flexor: "#DB2777",   // Bicep (Pink)
            extensor: "#7C3AED", // Tricep (Purple)
            bone: "#F1F5F9",
            skin: "#FFFFFF",
            accent: "#06B6D4"    // Cyan highlight
        }
    },

    // --- 1. THE PREMIUM SCIENCE STYLES ---
    injectStyles: () => {
        if (document.getElementById('manya-proc-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-proc-styles';
        style.innerHTML = `
            .proc-engine-root { 
                width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; 
                background: #FDFBF7; padding: 10px; box-sizing: border-box; font-family: 'Nunito', sans-serif;
            }

            .proc-game-card {
                width: 100%; max-width: 420px; height: 95%; max-height: 660px;
                background: white; border-radius: 40px; box-shadow: 0 20px 60px rgba(30, 41, 59, 0.12); 
                border: 2.5px solid #F1EFE9; display: flex; flex-direction: column; overflow: hidden; position: relative;
            }

            /* THE BIOMETRIC POD */
            .proc-viewport { 
                height: 48%; width: 100%; position: relative; 
                background: #F8FAFC; border-bottom: 3px solid #F1F5F9; 
                display: flex; align-items: center; justify-content: center; overflow: hidden;
            }
            /* Lab Grid Overlay */
            .proc-viewport::before {
                content: ''; position: absolute; inset: 0;
                background-image: linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px);
                background-size: 25px 25px; opacity: 0.3; pointer-events: none;
            }

            canvas { display: block; width: 100%; height: 100%; position: relative; z-index: 5; }

            .proc-badge { 
                position: absolute; top: 18px; left: 18px; z-index: 10;
                background: #DB2777; color: white; font-size: 9px; font-weight: 900; 
                padding: 6px 14px; border-radius: 30px; text-transform: uppercase; 
                letter-spacing: 1.5px; box-shadow: 0 4px 10px rgba(219, 39, 119, 0.2);
            }

            /* CONTROL CONSOLE */
            .proc-hud {
                flex: 1; background: #F8FAFC; padding: 18px 24px; 
                display: flex; flex-direction: column; justify-content: space-between;
            }

            .proc-controls-pod { background: white; padding: 15px; border-radius: 26px; border: 2px solid #F1F5F9; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
            .proc-status-row { display: flex; justify-content: space-between; font-weight: 900; font-size: 10px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; }
            
            input[type=range] { width: 100%; accent-color: #DB2777; height: 10px; cursor: pointer; border-radius: 10px; margin: 10px 0; background: #F1F5F9; border: 1px solid #E2E8F0; }

            .proc-btn-group { display: grid; grid-template-columns: 1fr 1fr 50px; gap: 10px; }
            .proc-btn { padding: 14px; border-radius: 16px; border: none; font-weight: 900; cursor: pointer; font-size: 11px; text-transform: uppercase; transition: 0.2s; letter-spacing: 0.5px; }
            .btn-main { background: white; color: #7C3AED; border: 2.5px solid #F1F5F9; box-shadow: 0 4px 0 #F1F5F9; }
            .btn-main:active { transform: translateY(2px); box-shadow: none; }
            .btn-reset { background: #E2E8F0; color: #64748B; font-size: 18px; display: flex; align-items: center; justify-content: center; padding: 0; }

            /* BIOMETRIC INFO CARD */
            .proc-info-card { 
                background: white; padding: 20px; border-radius: 28px; border: 2px solid #F1EFE9; 
                box-shadow: 0 8px 20px rgba(0,0,0,0.02); margin-top: 5px;
                animation: procSlideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            @keyframes procSlideIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

            .proc-info-title { font-size: 1.1rem; font-weight: 900; color: #7C3AED; margin-bottom: 4px; }
            .proc-info-desc { font-size: 14px; line-height: 1.5; color: #475569; margin: 0; font-weight: 600; }
            .proc-tip { margin-top: 12px; background: #FFFBEB; border-left: 5px solid #F59E0B; padding: 12px; border-radius: 12px; color: #B45309; font-size: 12px; font-weight: 800; line-height: 1.4; }
        `;
        document.head.appendChild(style);
    },

    renderStudy: async (container, data) => {
        ProceduralCanvasEngine.injectStyles();
        ProceduralCanvasEngine.state.data = data;
        
        // Load External Math Script
        const modulePath = `../../../assets/science/scripts/${data.renderScript}`;
        try {
            const module = await import(modulePath);
            ProceduralCanvasEngine.subEngine = Object.values(module)[0];
        } catch (e) {
            container.innerHTML = `<div style="padding:40px; color:red;">Simulation Data Missing.</div>`;
            return;
        }

        container.innerHTML = `
            <div class="proc-engine-root">
                <div class="proc-game-card">
                    <div class="proc-viewport">
                        <div class="proc-badge">${data.topic}</div>
                        <canvas id="procCanvas"></canvas>
                    </div>

                    <div class="proc-hud">
                        <div class="proc-controls-pod">
                            <div class="proc-status-row">
                                <span>RELAXED</span>
                                <span id="proc-target-id" style="color:#DB2777">ACTIVE SCAN</span>
                                <span>FLEXED</span>
                            </div>
                            <input type="range" id="procSlider" min="0" max="100" value="0">
                            <div class="proc-btn-group">
                                ${data.actions ? data.actions.map(a => `<button class="proc-btn btn-main" id="act-${a.id}">${a.label}</button>`).join('') : ''}
                                <button class="proc-btn btn-reset" id="btn-reset">↺</button>
                            </div>
                        </div>
                        <div id="proc-data-mount"></div>
                    </div>
                </div>
            </div>`;

        const canvas = container.querySelector('#procCanvas');
        ProceduralCanvasEngine.canvas = canvas;
        ProceduralCanvasEngine.ctx = canvas.getContext('2d');
        const slider = container.querySelector('#procSlider');

        const resize = () => {
            if(!canvas.parentElement) return;
            const rect = canvas.parentElement.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 2;
            canvas.width = rect.width * dpr; 
            canvas.height = rect.height * dpr;
            ProceduralCanvasEngine.state.scale = dpr;
            ProceduralCanvasEngine.ctx.scale(dpr, dpr);
            ProceduralCanvasEngine.draw();
        };
        new ResizeObserver(resize).observe(canvas.parentElement);

        slider.oninput = (e) => {
            ProceduralCanvasEngine.state.targetFlexion = parseFloat(e.target.value) / 100;
        };

        if(data.actions) {
            data.actions.forEach(a => {
                container.querySelector(`#act-${a.id}`).onclick = () => {
                    if (a.id === 'flex') { ProceduralCanvasEngine.state.targetFlexion = 1; slider.value = 100; }
                    if (a.id === 'extend') { ProceduralCanvasEngine.state.targetFlexion = 0; slider.value = 0; }
                };
            });
        }
        container.querySelector('#btn-reset').onclick = () => {
            ProceduralCanvasEngine.state.targetFlexion = 0;
            slider.value = 0;
        };

        ProceduralCanvasEngine.startLoop();
        ProceduralCanvasEngine.showInfo(Object.keys(data.parts)[0]);
    },

    showInfo: (id) => {
        const part = ProceduralCanvasEngine.state.data.parts[id];
        if (!part) return;
        const mount = document.getElementById('proc-data-mount');
        mount.innerHTML = `
            <div class="proc-info-card">
                <div class="proc-info-title">${part.title}</div>
                <p class="proc-info-desc">${part.desc}</p>
                ${part.tip ? `<div class="proc-tip"><b>💡 Exam Insight:</b> ${part.tip}</div>` : ''}
            </div>`;
        document.getElementById('proc-target-id').innerText = id.toUpperCase();
    },

    startLoop: () => {
        if (ProceduralCanvasEngine.animationFrame) cancelAnimationFrame(ProceduralCanvasEngine.animationFrame);
        const tick = () => {
            const diff = ProceduralCanvasEngine.state.targetFlexion - ProceduralCanvasEngine.state.flexion;
            ProceduralCanvasEngine.state.flexion += diff * 0.12;
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
        
        // --- DYNAMIC POSITIONING MATH (THE VERTICAL FIX) ---
        const logWidth = canvas.width / ProceduralCanvasEngine.state.scale;
        const logHeight = canvas.height / ProceduralCanvasEngine.state.scale;
        
        /**
         * PRECISION VERTICAL POSITIONING:
         * We anchor the shoulder at 15% width and 75% height.
         * This creates a large 'Upward Arc' space for the hand to bend into.
         */
        const pivotX = logWidth * 0.15; 
        const pivotY = logHeight * 0.75; // LOWERED PIVOT

        // Dynamic Scale: ensure arm (reach ~350) fits both Width and Height
        const fitScale = Math.min(logWidth / 380, logHeight / 300, 1.0);

        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.scale(fitScale, fitScale);
        
        // PASS THE VIBRANT PALETTE TO SUB-ENGINE
        ProceduralCanvasEngine.subEngine.draw(
            ctx, 
            0, 0, 
            ProceduralCanvasEngine.state, 
            []
        );
        ctx.restore();
    }
};

window.ProceduralCanvasEngine = ProceduralCanvasEngine;