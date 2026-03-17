/**
 * Manya Venn Probability Engine (v3.0 - Mobile Geometry Fix)
 * Fixes:
 * - "Tiny Circles": Tray height is now fixed, not percentage-based, giving circles more room.
 * - "Squashed Layout": Geometry math updated to maximize circle size in available space.
 * - Mobile Layout: CSS padding optimized for compact mobile screens.
 */
export const VennProbEngine = {
    state: {
        ctx: null, width: 0, height: 0, scale: 1,
        currentStep: 0, isResolved: false, data: null,
        chips: [], // { id, region: 'storage'|'left'|'center'|'right'|'outside' }
        dragging: null, dragOffset: {x:0,y:0},
        phase: 'setup', // 'setup', 'calc'
        inputs: { num: '', den: '' }
    },

    injectStyles: () => {
        if (document.getElementById('prob-styles')) return;
        const style = document.createElement('style');
        style.id = 'prob-styles';
        style.innerHTML = `
            .prob-root { 
                position: absolute; inset: 0; 
                display: flex; flex-direction: column; 
                background: #fff; overflow: hidden; user-select: none; 
            }
            .canvas-wrapper { 
                flex: 1 1 auto; min-height: 0; 
                position: relative; width: 100%; 
                background: #f8fafc; touch-action: none; 
            }
            canvas { display: block; width: 100%; height: 100%; object-fit: contain; }
            
            .hud { 
                flex: 0 0 auto; background: white; 
                padding: 12px 16px; /* Compact padding */
                padding-bottom: calc(16px + env(safe-area-inset-bottom)); 
                border-top: 1px solid #e2e8f0; 
                display: flex; flex-direction: column; gap: 10px; 
                z-index: 100; box-shadow: 0 -5px 20px rgba(0,0,0,0.05); 
            }
            
            .story-box { background: #f0fdfa; border: 1px solid #ccfbf1; padding: 10px; border-radius: 8px; font-size: 0.85rem; color: #115e59; font-weight: 600; line-height: 1.3; }
            
            .status-bar { display: flex; gap: 8px; font-size: 0.75rem; font-family: monospace; color: #64748b; justify-content: center; flex-wrap: wrap; margin-bottom: 5px; }
            .status-item.ok { color: #16a34a; font-weight: 800; }
            
            .fraction-input { display: flex; flex-direction: column; align-items: center; width: 60px; gap: 4px; }
            .frac-field { width: 100%; text-align: center; border: 2px solid #cbd5e1; border-radius: 6px; font-weight: 700; font-size: 1.2rem; padding: 4px; outline: none; }
            .frac-field:focus { border-color: #9333ea; }
            .frac-line { width: 100%; height: 2px; background: #cbd5e1; }
            
            .calc-area { display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 5px; }
            .calc-label { font-weight: 800; color: #475569; }

            .btn-action { width: 100%; padding: 14px; background: #9333ea; color: white; border: none; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; transition: 0.2s; }
            .btn-action:disabled { background: #22c55e; cursor: default; }

            .feedback { text-align: center; font-weight: 700; font-size: 0.9rem; min-height: 20px; color: #ef4444; }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        VennProbEngine.injectStyles();
        VennProbEngine.state.data = data;
        VennProbEngine.state.currentStep = 0;

        container.innerHTML = `
            <div class="prob-root">
                <div class="canvas-wrapper" id="canvas-mount"><canvas id="prob-canvas"></canvas></div>
                <div class="hud">
                    <div class="story-box" id="story-text">...</div>
                    <div class="status-bar" id="status-bar"></div>
                    <div id="controls-area"></div>
                    <div class="feedback" id="feedback"></div>
                </div>
            </div>
        `;

        const canvas = document.getElementById('prob-canvas');
        VennProbEngine.state.ctx = canvas.getContext('2d');
        VennProbEngine.initInput(canvas);

        const resize = () => {
            const mount = document.getElementById('canvas-mount');
            if(!mount) return;
            const rect = mount.getBoundingClientRect();
            if(rect.width===0) return;
            const dpr = window.devicePixelRatio || 2;
            
            canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
            VennProbEngine.state.scale = dpr;
            VennProbEngine.state.width = canvas.width; VennProbEngine.state.height = canvas.height;
            
            if(VennProbEngine.state.chips.length > 0) VennProbEngine.layoutChips();
            VennProbEngine.draw();
        };

        new ResizeObserver(resize).observe(document.getElementById('canvas-mount'));
        setTimeout(() => { resize(); VennProbEngine.loadLevel(0); }, 100);
    },

    loadLevel: (idx) => {
        if(idx >= VennProbEngine.state.data.questions.length) return;
        const q = VennProbEngine.state.data.questions[idx];
        VennProbEngine.state.currentStep = idx;
        VennProbEngine.state.phase = 'setup';
        VennProbEngine.state.isResolved = false;
        VennProbEngine.state.inputs = { num: '', den: '' };

        const total = q.setup.aOnly + q.setup.bOnly + q.setup.intersection + q.setup.outside;
        VennProbEngine.state.chips = Array.from({length: total}, (_, i) => ({
            id: i, region: 'storage', x: 0, y: 0, radius: 14 // Logic radius
        }));

        document.getElementById('story-text').innerHTML = q.story;
        document.getElementById('feedback').innerText = "";
        VennProbEngine.updateUI();
        VennProbEngine.layoutChips();
        VennProbEngine.draw();
    },

    updateUI: () => {
        const { phase, chips, data, currentStep } = VennProbEngine.state;
        const q = data.questions[currentStep];
        const controls = document.getElementById('controls-area');
        const status = document.getElementById('status-bar');

        const counts = { left: 0, right: 0, center: 0, outside: 0 };
        chips.forEach(c => { if(c.region!=='storage') counts[c.region]++; });

        if (phase === 'setup') {
            status.innerHTML = `
                <span class="status-item ${counts.left===q.setup.aOnly?'ok':''}">A:${counts.left}/${q.setup.aOnly}</span>
                <span class="status-item ${counts.center===q.setup.intersection?'ok':''}">Both:${counts.center}/${q.setup.intersection}</span>
                <span class="status-item ${counts.right===q.setup.bOnly?'ok':''}">B:${counts.right}/${q.setup.bOnly}</span>
                <span class="status-item ${counts.outside===q.setup.outside?'ok':''}">Out:${counts.outside}/${q.setup.outside}</span>
            `;
            controls.innerHTML = `<button class="btn-action" onclick="ManyaProbCheck()">CHECK SETUP</button>`;
        } else {
            status.innerHTML = "";
            controls.innerHTML = `
                <div class="story-box" style="background:#f3e8ff; border-color:#d8b4fe; color:#6b21a8; margin-bottom:10px;">${q.question}</div>
                <div class="calc-area">
                    <span class="calc-label">Prob = </span>
                    <div class="fraction-input">
                        <input type="number" class="frac-field" id="in-num" placeholder="?">
                        <div class="frac-line"></div>
                        <input type="number" class="frac-field" id="in-den" placeholder="?">
                    </div>
                </div>
                <button class="btn-action" onclick="ManyaProbCheck()" style="margin-top:10px;">CHECK PROBABILITY</button>
            `;
        }
    },

    check: () => {
        const { phase, chips, data, currentStep } = VennProbEngine.state;
        const q = data.questions[currentStep];
        const fb = document.getElementById('feedback');

        if (phase === 'setup') {
            const counts = { left: 0, right: 0, center: 0, outside: 0 };
            chips.forEach(c => { if(c.region!=='storage') counts[c.region]++; });
            
            if (counts.left === q.setup.aOnly && counts.right === q.setup.bOnly && 
                counts.center === q.setup.intersection && counts.outside === q.setup.outside) {
                VennProbEngine.state.phase = 'calc';
                fb.innerText = "";
                VennProbEngine.updateUI();
            } else {
                fb.innerText = "Diagram doesn't match the story yet.";
            }
        } else {
            const num = parseInt(document.getElementById('in-num').value);
            const den = parseInt(document.getElementById('in-den').value);
            
            if (num === q.expectedNumerator && den === q.expectedDenominator) {
                const btn = document.querySelector('.btn-action');
                fb.innerText = "Correct!"; fb.style.color = "#16a34a";
                btn.style.background = "#22c55e";
                
                if (currentStep < data.questions.length - 1) {
                    btn.innerText = "NEXT LEVEL";
                    btn.onclick = () => VennProbEngine.loadLevel(currentStep + 1);
                } else {
                    btn.innerText = "🎉 QUEST COMPLETE"; btn.disabled = true;
                }
            } else {
                fb.innerText = `Hint: ${q.hint}`; fb.style.color = "#ef4444";
            }
        }
    },

    layoutChips: () => {
        const { width, height, chips, scale } = VennProbEngine.state;
        if(width===0) return;
        
        // --- NEW GEOMETRY ---
        // Fixed Height Tray (85px scaled) - Keeps more room for diagram
        const trayH = 85 * scale;
        const playH = height - trayH;
        
        const pad = 15 * scale;
        const cx = width / 2;
        
        // Maximize Radius within Play Area
        // Increase factors to use more space (0.35 width, 0.45 height)
        const r = Math.min((width - pad*2) * 0.35, (playH - pad*2) * 0.45);
        const offset = r * 0.65;
        const c1x = cx - offset; 
        const c2x = cx + offset;
        const cy = (playH / 2); // Center vertical in play area
        
        const jitter = () => (Math.random() - 0.5) * (r * 0.4);

        chips.forEach(c => {
            if (VennProbEngine.state.dragging === c) return;
            
            if (c.region === 'left') { c.x = c1x - (r*0.4) + jitter(); c.y = cy + jitter(); }
            else if (c.region === 'right') { c.x = c2x + (r*0.4) + jitter(); c.y = cy + jitter(); }
            else if (c.region === 'center') { c.x = cx + jitter()/2; c.y = cy + jitter()/2; }
            else if (c.region === 'outside') { 
                const corners = [
                    {x: pad+20*scale, y: pad+20*scale}, {x: width-pad-20*scale, y: pad+20*scale},
                    {x: pad+20*scale, y: playH-20*scale}, {x: width-pad-20*scale, y: playH-20*scale}
                ];
                const corner = corners[c.id % 4];
                c.x = corner.x + jitter(); c.y = corner.y + jitter();
            }
            else { 
                // Storage Area Layout
                const itemsPerRow = 8;
                const row = Math.floor(c.id / itemsPerRow);
                const col = c.id % itemsPerRow;
                const startX = (width - ((itemsPerRow-1) * 35*scale)) / 2;
                c.x = startX + (col * 35 * scale);
                c.y = (height - trayH) + 30*scale + (row * 35 * scale);
            }
        });
    },

    initInput: (canvas) => {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const cx = e.touches ? e.touches[0].clientX : e.clientX;
            const cy = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: (cx - rect.left) * (VennProbEngine.state.width / rect.width), y: (cy - rect.top) * (VennProbEngine.state.height / rect.height) };
        };

        const start = (e) => {
            if(VennProbEngine.state.phase !== 'setup') return;
            const p = getPos(e);
            const chip = [...VennProbEngine.state.chips].reverse().find(c => Math.hypot(c.x - p.x, c.y - p.y) < 30 * VennProbEngine.state.scale);
            if(chip) { VennProbEngine.state.dragging = chip; VennProbEngine.state.dragOffset = { x: p.x - chip.x, y: p.y - chip.y }; }
        };

        const move = (e) => {
            if(!VennProbEngine.state.dragging) return;
            e.preventDefault(); const p = getPos(e);
            VennProbEngine.state.dragging.x = p.x - VennProbEngine.state.dragOffset.x;
            VennProbEngine.state.dragging.y = p.y - VennProbEngine.state.dragOffset.y;
            VennProbEngine.draw();
        };

        const end = () => {
            if(!VennProbEngine.state.dragging) return;
            const chip = VennProbEngine.state.dragging;
            const { width, height, scale } = VennProbEngine.state;
            
            // Hit Test Zones (Must match layout geometry)
            const pad = 15 * scale;
            const trayH = 85 * scale; // MATCH LAYOUT
            const playH = height - trayH;
            const cx = width / 2;
            const cy = playH / 2;
            const r = Math.max(10, Math.min((width-pad*2)*0.28, (playH*0.45))); // MATCH LAYOUT
            const offset = r * 0.65;
            const c1x = cx - offset; const c2x = cx + offset;

            const d1 = Math.hypot(chip.x - c1x, chip.y - cy);
            const d2 = Math.hypot(chip.x - c2x, chip.y - cy);

            if (d1 < r && d2 < r) chip.region = 'center';
            else if (d1 < r) chip.region = 'left';
            else if (d2 < r) chip.region = 'right';
            else if (chip.y < playH) chip.region = 'outside';
            else chip.region = 'storage';

            VennProbEngine.state.dragging = null;
            VennProbEngine.layoutChips(); 
            VennProbEngine.draw();
            VennProbEngine.updateUI(); 
        };

        canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); canvas.addEventListener('mouseup', end);
        canvas.addEventListener('touchstart', start, {passive: false}); canvas.addEventListener('touchmove', move, {passive: false}); canvas.addEventListener('touchend', end);
    },

    draw: () => {
        const { ctx, width, height, scale, chips } = VennProbEngine.state;
        if(!ctx || width === 0) return;
        ctx.clearRect(0,0,width,height);
        
        const s = scale; const pad = 15 * s;
        const trayH = 85 * s; // MATCH LAYOUT
        const playH = height - trayH;
        
        const cx = width / 2;
        const cy = playH / 2; 
        const r = Math.max(10, Math.min((width-pad*2)*0.35, (playH*0.45))); // MATCH LAYOUT
        const offset = r * 0.65;
        const c1x = cx - offset; const c2x = cx + offset;

        // Draw Box Area
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, playH);
        ctx.strokeStyle="#cbd5e1"; ctx.lineWidth=2; 
        ctx.strokeRect(pad, pad, width-pad*2, playH-(pad*2)); 
        ctx.fillStyle="#64748b"; ctx.font=`800 ${18*s}px sans-serif`; ctx.fillText("ξ", pad+15*s, pad+25*s);

        // Draw Tray
        ctx.fillStyle = "#f1f5f9"; ctx.fillRect(0, playH, width, trayH);
        ctx.beginPath(); ctx.moveTo(0, playH); ctx.lineTo(width, playH); ctx.strokeStyle="#e2e8f0"; ctx.stroke();

        // Draw Circles
        ctx.lineWidth=3*s; ctx.strokeStyle="#9333ea"; ctx.beginPath(); ctx.arc(c1x, cy, r, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle="#9333ea"; ctx.textAlign="right"; ctx.fillText("A", c1x-r*0.6, cy-r*0.8);

        ctx.strokeStyle="#db2777"; ctx.beginPath(); ctx.arc(c2x, cy, r, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle="#db2777"; ctx.textAlign="left"; ctx.fillText("B", c2x+r*0.6, cy-r*0.8);

        // Draw Chips
        chips.forEach(c => {
            const x = (VennProbEngine.state.dragging === c) ? c.x : c.x;
            const y = (VennProbEngine.state.dragging === c) ? c.y : c.y;
            
            ctx.save(); ctx.translate(x, y);
            ctx.beginPath(); ctx.arc(0, 0, c.radius*s, 0, Math.PI*2);
            
            if (c.region === 'left') ctx.fillStyle = "#d8b4fe";
            else if (c.region === 'right') ctx.fillStyle = "#fbcfe8";
            else if (c.region === 'center') ctx.fillStyle = "#fde047";
            else if (c.region === 'outside') ctx.fillStyle = "#e2e8f0";
            else ctx.fillStyle = "#fff"; 
            
            ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "#475569"; ctx.stroke();
            
            ctx.fillStyle = "#334155"; ctx.font = `${16*s}px serif`; 
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("👤", 0, 0);
            
            ctx.restore();
        });
    }
};

window.ManyaProbCheck = () => VennProbEngine.check();