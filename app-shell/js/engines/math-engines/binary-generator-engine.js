/**
 * Manya Binary Generator Engine
 * Visualizes exponents (2^n) as a "Power Plant".
 * Users add "cells" to increase the output power.
 */
export const BinaryGeneratorEngine = {
    state: {
        ctx: null, width: 0, height: 0,
        n: 0, // Current exponent
        target: 0, // Target value (e.g., 16)
        rotation: 0,
        isResolved: false,
        animId: null
    },

    injectStyles: () => {
        if (document.getElementById('binary-gen-styles')) return;
        const style = document.createElement('style');
        style.id = 'binary-gen-styles';
        style.innerHTML = `
            .gen-root { display: flex; flex-direction: column; height: 100dvh; width: 100%; background: #0f172a; overflow: hidden; position: relative; }
            .canvas-wrapper { flex: 1; position: relative; }
            canvas { width: 100%; height: 100%; display: block; }
            
            /* CONTROL PANEL */
            .hud { 
                flex-shrink: 0; background: #1e293b; padding: 20px; 
                border-top: 1px solid #334155; display: flex; flex-direction: column; gap: 15px; 
                z-index: 10; box-shadow: 0 -5px 20px rgba(0,0,0,0.5);
            }
            
            /* DIGITAL SCREEN */
            .screen {
                background: #0f172a; border: 2px solid #334155; border-radius: 12px;
                padding: 15px; display: flex; justify-content: space-between; align-items: center;
                box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
            }
            .screen-label { font-size: 0.7rem; color: #94a3b8; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
            .screen-val { font-family: 'Courier New', monospace; font-size: 1.8rem; font-weight: 700; color: #4ade80; text-shadow: 0 0 10px rgba(74, 222, 128, 0.5); }
            .screen-val.off { color: #64748b; text-shadow: none; }
            
            /* BUTTONS */
            .controls-row { display: flex; gap: 10px; }
            .btn-adj {
                flex: 1; padding: 15px; border-radius: 12px; border: none;
                font-weight: 800; font-size: 1.2rem; cursor: pointer;
                background: #334155; color: white; transition: 0.1s;
                box-shadow: 0 4px 0 #1e293b;
            }
            .btn-adj:active { transform: translateY(4px); box-shadow: none; }
            
            .btn-fire {
                width: 100%; padding: 16px; border-radius: 12px; border: none;
                background: #7c3aed; color: white; font-weight: 800; font-size: 1rem;
                text-transform: uppercase; letter-spacing: 1px; cursor: pointer;
                box-shadow: 0 4px 0 #5b21b6; transition: 0.2s;
            }
            .btn-fire:active { transform: translateY(4px); box-shadow: none; }
            .btn-fire:disabled { background: #22c55e; box-shadow: none; transform: none; cursor: default; }

            .instruction { text-align: center; color: #94a3b8; font-size: 0.9rem; margin-bottom: 5px; }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        BinaryGeneratorEngine.injectStyles();
        
        // Init State
        BinaryGeneratorEngine.state.target = data.questions[0].targetVal; // e.g. 16
        BinaryGeneratorEngine.state.n = 0;
        BinaryGeneratorEngine.state.isResolved = false;

        container.innerHTML = `
            <div class="gen-root">
                <div class="canvas-wrapper"><canvas id="gen-canvas"></canvas></div>
                <div class="hud">
                    <div class="instruction">${data.questions[0].prompt}</div>
                    
                    <div class="screen">
                        <div>
                            <div class="screen-label">Elements (n)</div>
                            <div class="screen-val" id="disp-n" style="color:#cbd5e1">0</div>
                        </div>
                        <div style="text-align:right">
                            <div class="screen-label">Subsets (2ⁿ)</div>
                            <div class="screen-val" id="disp-out">1</div>
                        </div>
                    </div>

                    <div class="controls-row">
                        <button class="btn-adj" onclick="ManyaGenMod(-1)">-</button>
                        <button class="btn-adj" onclick="ManyaGenMod(1)">+</button>
                    </div>
                    
                    <button class="btn-fire" onclick="ManyaGenCheck()">⚡ IGNITE GENERATOR</button>
                </div>
            </div>
        `;

        const canvas = document.getElementById('gen-canvas');
        BinaryGeneratorEngine.state.ctx = canvas.getContext('2d');
        
        const resize = () => {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width * 2;
            canvas.height = (rect.height - 250) * 2; // Reserve space for HUD
            BinaryGeneratorEngine.state.width = canvas.width;
            BinaryGeneratorEngine.state.height = canvas.height;
        };
        window.addEventListener('resize', resize);
        setTimeout(resize, 50);

        BinaryGeneratorEngine.loop();
    },

    modify: (delta) => {
        if(BinaryGeneratorEngine.state.isResolved) return;
        let newN = BinaryGeneratorEngine.state.n + delta;
        if (newN < 0) newN = 0;
        if (newN > 8) newN = 8; // Cap at 2^8 = 256
        
        BinaryGeneratorEngine.state.n = newN;
        
        // Update Screen
        document.getElementById('disp-n').innerText = newN;
        document.getElementById('disp-out').innerText = Math.pow(2, newN);
    },

    check: () => {
        const { n, target } = BinaryGeneratorEngine.state;
        const currentPower = Math.pow(2, n);
        const btn = document.querySelector('.btn-fire');

        if (currentPower === target) {
            BinaryGeneratorEngine.state.isResolved = true;
            btn.innerText = "✅ SYSTEM STABLE";
            btn.disabled = true;
            btn.style.background = "#22c55e";
            // Success Effect
            BinaryGeneratorEngine.state.rotationSpeed = 0.2; // Spin faster
        } else {
            btn.innerText = "⚠️ ERROR: POWER MISMATCH";
            btn.style.background = "#ef4444";
            setTimeout(() => {
                btn.innerText = "⚡ IGNITE GENERATOR";
                btn.style.background = "#7c3aed";
            }, 1000);
        }
    },

    loop: () => {
        BinaryGeneratorEngine.draw();
        BinaryGeneratorEngine.state.animId = requestAnimationFrame(BinaryGeneratorEngine.loop);
    },

    draw: () => {
        const { ctx, width, height, n, rotation, isResolved } = BinaryGeneratorEngine.state;
        if(!ctx || width === 0) return;

        ctx.clearRect(0, 0, width, height);
        const cx = width / 2;
        const cy = height / 2;
        
        // Rotation Logic
        const speed = isResolved ? 0.1 : 0.02;
        BinaryGeneratorEngine.state.rotation += speed;

        // 1. Draw Orbit Rings
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 180, 0, Math.PI*2); ctx.stroke();

        // 2. Draw Core
        const coreSize = 60 + (n * 5); // Grows with n
        const coreColor = isResolved ? '#22c55e' : '#7c3aed';
        
        // Glow
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, coreSize + 20);
        grad.addColorStop(0, coreColor);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, coreSize + 20, 0, Math.PI*2); ctx.fill();

        // Solid Core
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI*2); ctx.fill();
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = coreColor;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText("2ⁿ", cx, cy);

        // 3. Draw Orbiting "Cells" (Electrons)
        for(let i=0; i<n; i++) {
            const angle = rotation + (i / n) * (Math.PI * 2);
            const dist = 100 + (Math.sin(rotation + i) * 20); // Wobbly orbit
            
            const x = cx + Math.cos(angle) * dist;
            const y = cy + Math.sin(angle) * dist;
            
            // Cell Glow
            ctx.shadowBlur = 15; ctx.shadowColor = '#4ade80';
            
            ctx.fillStyle = '#4ade80';
            ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI*2); ctx.fill();
            
            // Label
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#064e3b'; ctx.font = 'bold 12px sans-serif';
            ctx.fillText(i+1, x, y);
        }
    }
};

// Global Handlers
window.ManyaGenMod = (d) => BinaryGeneratorEngine.modify(d);
window.ManyaGenCheck = () => BinaryGeneratorEngine.check();