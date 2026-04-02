/**
 * Manya Venn Spotlight Engine (v2.0 - Mobile & Themed)
 * Theme: Light (Matches App Shell)
 * Interaction: Tap regions to Shade them.
 * Layout: 100% Mobile Responsive (Inset: 0).
 */
export const VennSpotlightEngine = {
    state: {
        ctx: null, width: 0, height: 0, scale: 1,
        currentStep: 0, isResolved: false, data: null,
        litRegions: new Set(), // 'left', 'center', 'right', 'outside'
        tempCanvas: null, tempCtx: null // Off-screen buffer for clean shapes
    },

    injectStyles: () => {
        if (document.getElementById('spotlight-styles')) return;
        const style = document.createElement('style');
        style.id = 'spotlight-styles';
        style.innerHTML = `
            /* ROOT: Locks to viewport */
            .spotlight-root { 
                position: absolute; inset: 0; 
                display: flex; flex-direction: column; 
                background: #f8fafc; overflow: hidden; 
                user-select: none; font-family: 'Plus Jakarta Sans', sans-serif;
            }
            
            /* CANVAS: Fills space, handles resize */
            .canvas-wrapper { 
                flex: 1 1 auto; min-height: 0; 
                position: relative; width: 100%; 
                background: radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%);
                touch-action: none;
            }
            canvas { display: block; width: 100%; height: 100%; object-fit: contain; }

            /* HUD: Pinned to bottom */
            .hud { 
                flex-shrink: 0; background: white; 
                padding: 16px 20px; 
                padding-bottom: calc(20px + env(safe-area-inset-bottom));
                border-top: 1px solid #e2e8f0;
                display: flex; flex-direction: column; gap: 12px; 
                z-index: 10; box-shadow: 0 -5px 20px rgba(0,0,0,0.05);
            }

            /* CHALLENGE CARD */
            .challenge-card {
                background: #fdf4ff; border: 1px solid #f0abfc; border-radius: 16px;
                padding: 12px; text-align: center; position: relative; overflow: hidden;
            }
            .challenge-card::before { content:''; position:absolute; top:0; left:0; width:6px; height:100%; background:#d946ef; }
            
            .notation { font-family: monospace; font-size: 1.8rem; font-weight: 800; color: #86198f; letter-spacing: 1px; }
            .desc { color: #64748b; font-size: 0.9rem; font-weight: 600; margin-top: 2px; }

            /* BUTTON */
            .btn-check {
                width: 100%; padding: 14px; border-radius: 12px; border: none;
                background: var(--manya-purple); color: white; 
                font-weight: 800; font-size: 1rem; cursor: pointer;
                box-shadow: 0 4px 0 #6d28d9; transition: transform 0.1s;
                text-transform: uppercase; letter-spacing: 1px;
            }
            .btn-check:active { transform: translateY(3px); box-shadow: none; }
            .btn-check:disabled { background: #22c55e; box-shadow: none; cursor: default; }

            .feedback { text-align: center; color: #ef4444; font-size: 0.85rem; font-weight: 700; min-height: 20px; }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        VennSpotlightEngine.injectStyles();
        VennSpotlightEngine.state.data = data;
        VennSpotlightEngine.state.currentStep = 0;
        VennSpotlightEngine.state.litRegions = new Set();
        VennSpotlightEngine.state.isResolved = false;

        // Init Buffer
        VennSpotlightEngine.state.tempCanvas = document.createElement('canvas');
        VennSpotlightEngine.state.tempCtx = VennSpotlightEngine.state.tempCanvas.getContext('2d');

        container.innerHTML = `
            <div class="spotlight-root">
                <div class="canvas-wrapper" id="canvas-mount">
                    <canvas id="spot-canvas"></canvas>
                </div>
                <div class="hud">
                    <div class="challenge-card">
                        <div class="notation" id="q-notation">...</div>
                        <div class="desc" id="q-desc">...</div>
                    </div>
                    <div class="feedback" id="feedback"></div>
                    <button class="btn-check" onclick="ManyaSpotCheck()">CHECK SHADING</button>
                </div>
            </div>
        `;

        const canvas = document.getElementById('spot-canvas');
        VennSpotlightEngine.state.ctx = canvas.getContext('2d');
        VennSpotlightEngine.initInput(canvas);

        const resize = () => {
            const mount = document.getElementById('canvas-mount');
            if(!mount) return;
            const rect = mount.getBoundingClientRect();
            if(rect.width === 0) return;
            
            const dpr = window.devicePixelRatio || 2;
            canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
            
            // Sync Buffer
            VennSpotlightEngine.state.tempCanvas.width = canvas.width;
            VennSpotlightEngine.state.tempCanvas.height = canvas.height;

            VennSpotlightEngine.state.scale = dpr;
            VennSpotlightEngine.state.width = canvas.width; 
            VennSpotlightEngine.state.height = canvas.height;
            VennSpotlightEngine.draw();
        };

        new ResizeObserver(resize).observe(document.getElementById('canvas-mount'));
        setTimeout(() => { resize(); VennSpotlightEngine.loadLevel(0); }, 50);
    },

    loadLevel: (idx) => {
        if(idx >= VennSpotlightEngine.state.data.questions.length) return;
        const q = VennSpotlightEngine.state.data.questions[idx];
        VennSpotlightEngine.state.currentStep = idx;
        VennSpotlightEngine.state.litRegions.clear();
        VennSpotlightEngine.state.isResolved = false;

        document.getElementById('q-notation').innerText = q.notation;
        document.getElementById('q-desc').innerText = q.description;
        document.getElementById('feedback').innerText = "Tap regions to shade them";
        document.getElementById('feedback').style.color = "#64748b";
        
        const btn = document.querySelector('.btn-check');
        btn.innerText = "CHECK SHADING"; btn.disabled = false; btn.style.background = "var(--manya-purple)";

        VennSpotlightEngine.draw();
    },

    check: () => {
        if(VennSpotlightEngine.state.isResolved) {
            VennSpotlightEngine.loadLevel(VennSpotlightEngine.state.currentStep + 1);
            return;
        }

        const q = VennSpotlightEngine.state.data.questions[VennSpotlightEngine.state.currentStep];
        const userSet = VennSpotlightEngine.state.litRegions;
        const targetSet = q.targetRegions;

        let isCorrect = userSet.size === targetSet.length;
        if(isCorrect) {
            targetSet.forEach(r => { if(!userSet.has(r)) isCorrect = false; });
        }

        const fb = document.getElementById('feedback');
        const btn = document.querySelector('.btn-check');

        if(isCorrect) {
            fb.innerText = "CORRECT!"; fb.style.color = "#16a34a"; 
            if (VennSpotlightEngine.state.currentStep < VennSpotlightEngine.state.data.questions.length - 1) {
                btn.innerText = "NEXT QUESTION ➔"; btn.style.background = "#22c55e";
                VennSpotlightEngine.state.isResolved = true;
            } else {
                btn.innerText = "🎉 QUEST COMPLETE"; btn.disabled = true;
            }
        } else {
            fb.innerText = `Hint: ${q.hint}`; fb.style.color = "#ef4444";
            // Shake
            const card = document.querySelector('.challenge-card');
            card.style.transform = "translateX(5px)";
            setTimeout(() => card.style.transform = "translateX(0)", 100);
        }
    },

    initInput: (canvas) => {
        const handleTap = (e) => {
            if(VennSpotlightEngine.state.isResolved) return;
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const x = (clientX - rect.left) * (VennSpotlightEngine.state.width / rect.width);
            const y = (clientY - rect.top) * (VennSpotlightEngine.state.height / rect.height);
            
            const { width, height, scale } = VennSpotlightEngine.state;
            const s = scale; const pad = 15 * s;
            const cx = width / 2;
            const cy = Math.min(height/2, width*0.45) + 10*s; // Layout match
            const availW = width - (pad*2); const availH = height - (pad*2);
            const r = Math.max(10, Math.min(availW * 0.25, availH * 0.35)); 
            const offset = r * 0.65;
            
            const c1x = cx - offset; const c2x = cx + offset;

            const d1 = Math.hypot(x - c1x, y - cy);
            const d2 = Math.hypot(x - c2x, y - cy);

            let region = null;
            if (d1 < r && d2 < r) region = 'center';
            else if (d1 < r) region = 'left';
            else if (d2 < r) region = 'right';
            else if (x > pad && x < width-pad && y > pad && y < height-pad) region = 'outside';

            if (region) {
                const set = VennSpotlightEngine.state.litRegions;
                if (set.has(region)) set.delete(region); else set.add(region);
                VennSpotlightEngine.draw();
            }
        };

        canvas.addEventListener('pointerdown', handleTap);
    },

    draw: () => {
        const { ctx, width, height, scale, litRegions, tempCtx, tempCanvas } = VennSpotlightEngine.state;
        if(!ctx || width === 0) return;

        ctx.clearRect(0,0,width,height);
        
        const s = scale; const pad = 15 * s;
        // Logic height to match touch hit areas
        const cx = width / 2;
        const cy = Math.min(height/2, width*0.45) + 10*s;
        
        const availW = width - (pad*2); const availH = height - (pad*2);
        const r = Math.max(10, Math.min(availW * 0.25, availH * 0.35)); 
        const offset = r * 0.65;
        
        const c1 = { x: cx - offset, y: cy, r: r };
        const c2 = { x: cx + offset, y: cy, r: r };

        // Helper: Draw Atomic Shape to Temp Canvas
        const drawShape = (reg) => {
            tempCtx.save();
            tempCtx.clearRect(0,0,width,height);
            tempCtx.fillStyle = "#fef08a"; // Highlight Yellow
            
            if (reg === 'center') {
                tempCtx.beginPath(); tempCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tempCtx.clip();
                tempCtx.beginPath(); tempCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tempCtx.fill();
            } else if (reg === 'left') {
                tempCtx.beginPath(); tempCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tempCtx.fill();
                tempCtx.globalCompositeOperation = 'destination-out';
                tempCtx.beginPath(); tempCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tempCtx.fill();
            } else if (reg === 'right') {
                tempCtx.beginPath(); tempCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tempCtx.fill();
                tempCtx.globalCompositeOperation = 'destination-out';
                tempCtx.beginPath(); tempCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tempCtx.fill();
            } else if (reg === 'outside') {
                tempCtx.beginPath(); tempCtx.rect(pad,pad,width-pad*2,height-pad*2); tempCtx.fill();
                tempCtx.globalCompositeOperation = 'destination-out';
                tempCtx.beginPath(); tempCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tempCtx.fill();
                tempCtx.beginPath(); tempCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tempCtx.fill();
            }
            tempCtx.restore();
            // Stamp temp canvas onto main
            ctx.drawImage(tempCanvas, 0, 0);
        };

        // Draw Lit Regions (Layered)
        if(litRegions.has('outside')) drawShape('outside');
        if(litRegions.has('left')) drawShape('left');
        if(litRegions.has('right')) drawShape('right');
        if(litRegions.has('center')) drawShape('center');

        // Draw Outlines (Overlay)
        ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2;
        ctx.strokeRect(pad,pad,width-pad*2,height-pad*2); // Box
        
        ctx.strokeStyle = "#9333ea"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.stroke();
        
        ctx.strokeStyle = "#db2777"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.stroke();

        // Labels
        ctx.fillStyle = "#9333ea"; ctx.font = `bold ${24*scale}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline="middle";
        ctx.fillText("A", c1.x - (r*0.6), c1.y - (r*0.8));
        
        ctx.fillStyle = "#db2777";
        ctx.fillText("B", c2.x + (r*0.6), c2.y - (r*0.8));
        
        ctx.fillStyle = "#64748b"; ctx.font = `bold ${18*scale}px sans-serif`;
        ctx.fillText("ξ", pad + 20*scale, pad + 30*scale);
    }
};

window.ManyaSpotCheck = () => VennSpotlightEngine.check();