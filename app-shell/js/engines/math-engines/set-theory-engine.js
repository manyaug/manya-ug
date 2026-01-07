/**
 * Manya Set Theory Engine (Final Polish)
 * Fixes: Cluttered text, overlapping labels, and ensures mobile readability.
 */
export const SetTheoryEngine = {
    state: {
        ctx: null, width: 0, height: 0,
        currentStep: 0, isResolved: false, data: null, scale: 1, activeHighlight: null
    },

    injectStyles: () => {
        if (document.getElementById('set-theory-styles')) return;
        const style = document.createElement('style');
        style.id = 'set-theory-styles';
        style.innerHTML = `
            .set-root { display: flex; flex-direction: column; height: 100dvh; width: 100%; background: #f8fafc; overflow: hidden; position: relative; }
            .canvas-wrapper { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; position: relative; background: radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%); padding: 10px; }
            canvas { box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-radius: 20px; background: white; max-width: 100%; max-height: 100%; object-fit: contain; }
            
            .hint-pill { position: absolute; top: 15px; right: 15px; background: white; border: 1px solid #e2e8f0; padding: 6px 14px; border-radius: 30px; font-size: 11px; font-weight: 800; color: var(--manya-purple); box-shadow: 0 4px 12px rgba(0,0,0,0.05); cursor: pointer; transition: 0.2s; z-index: 20; display: flex; align-items: center; gap: 6px; }
            
            .control-card { flex-shrink: 0; background: white; padding: 20px 20px 30px 20px; border-top-left-radius: 24px; border-top-right-radius: 24px; box-shadow: 0 -10px 40px rgba(0,0,0,0.08); z-index: 30; display: flex; flex-direction: column; gap: 14px; }
            .q-text { font-size: 1.15rem; font-weight: 700; color: var(--text-dark); text-align: center; margin-bottom: 4px; }
            .feedback-msg { text-align: center; font-size: 0.95rem; font-weight: 700; min-height: 20px; margin-top: 4px; }

            .input-group { display: flex; flex-direction: column; gap: 12px; width: 100%; }
            .set-input { width: 100%; height: 54px; font-size: 1.4rem; text-align: center; font-weight: 700; border: 2px solid #e2e8f0; border-radius: 14px; outline: none; color: var(--text-dark); background: #f8fafc; transition: all 0.2s; }
            .set-input:focus { border-color: var(--manya-purple); background: white; box-shadow: 0 0 0 4px var(--manya-purple-light); }
            .check-btn { width: 100%; height: 54px; background: var(--manya-purple); color: white; border: none; border-radius: 14px; font-weight: 700; font-size: 1.1rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
            .check-btn:active { transform: scale(0.98); opacity: 0.9; }

            .btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; }
            .btn-choice { padding: 16px 10px; border-radius: 16px; border: 2px solid transparent; font-weight: 800; font-size: 0.95rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: 0.2s; box-shadow: 0 4px 0 rgba(0,0,0,0.05); }
            .btn-choice:active { transform: translateY(2px); box-shadow: none; }
            .btn-choice span { font-size: 0.7rem; opacity: 0.8; font-weight: 600; text-transform: uppercase; }
            .btn-yes { background: #dcfce7; color: #16a34a; border-color: #bbf7d0; }
            .btn-no { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        SetTheoryEngine.injectStyles();
        SetTheoryEngine.state.data = data;
        SetTheoryEngine.state.currentStep = 0;

        container.innerHTML = `
            <div class="set-root">
                <div class="canvas-wrapper" id="canvas-mount">
                    <button id="btn-hint" class="hint-pill"><span>💡</span> <span>HINT</span></button>
                    <canvas id="set-canvas"></canvas>
                </div>
                <div class="control-card">
                    <div id="q-display" class="q-text">Loading...</div>
                    <div id="dynamic-controls"></div>
                    <div id="feedback" class="feedback-msg"></div>
                </div>
            </div>
        `;

        const canvas = document.getElementById('set-canvas');
        SetTheoryEngine.state.ctx = canvas.getContext('2d');
        SetTheoryEngine.initResize();
        document.getElementById('btn-hint').onclick = SetTheoryEngine.toggleHint;
        SetTheoryEngine.loadQuestion();
    },

    loadQuestion: () => {
        const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
        document.getElementById('q-display').innerHTML = q.prompt;
        document.getElementById('feedback').innerText = "";
        SetTheoryEngine.state.activeHighlight = null;
        SetTheoryEngine.state.isResolved = false;
        
        const controls = document.getElementById('dynamic-controls');
        controls.innerHTML = ''; 

        if (q.interaction === 'BINARY') {
            controls.innerHTML = `
                <div class="btn-grid">
                    <button class="btn-choice btn-yes" onclick="ManyaSetHandler('yes')">SUBSET <span>Inside S</span></button>
                    <button class="btn-choice btn-no" onclick="ManyaSetHandler('no')">NOT SUBSET <span>Has Outsider</span></button>
                </div>`;
        } else {
            controls.innerHTML = `
                <div class="input-group">
                    <input type="text" id="user-ans" class="set-input" placeholder="?" autocomplete="off" inputmode="text">
                    <button class="check-btn" onclick="ManyaSetHandler()">CHECK ANSWER</button>
                </div>`;
        }
        
        SetTheoryEngine.draw();
    },

    handleInput: (val) => {
        if (SetTheoryEngine.state.isResolved) {
            if (SetTheoryEngine.state.currentStep < SetTheoryEngine.state.data.questions.length - 1) {
                SetTheoryEngine.state.currentStep++;
                SetTheoryEngine.loadQuestion();
            } else {
                document.getElementById('q-display').innerHTML = "🎉 Quest Complete!";
                document.getElementById('dynamic-controls').style.display = 'none';
                document.getElementById('feedback').innerHTML = "Mastery Achieved!";
            }
            return;
        }

        const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
        let isCorrect = false;
        
        if (q.interaction === 'BINARY') {
            isCorrect = val === q.expected;
        } else {
            const input = document.getElementById('user-ans').value.trim();
            const zones = SetTheoryEngine.state.data.zones;
            let correctData = [];

            if(q.targetRegion === 'intersection') correctData = zones.center;
            else if(q.targetRegion === 'left_only') correctData = zones.left;
            else if(q.targetRegion === 'right_only') correctData = zones.right;
            else if(q.targetRegion === 'universal_only') correctData = zones.outside;
            else if(q.targetRegion === 'right_total') correctData = [...zones.center, ...zones.right];
            else if(q.targetRegion === 'left_total') correctData = [...zones.center, ...zones.left];
            else if(q.targetRegion === 'symmetric_difference') correctData = [...zones.left, ...zones.right];


             

            if (q.type === 'LIST') {
                const cleanInput = input.replace(/[{}]/g, '').split(/[\s,]+/).map(n => isNaN(parseInt(n)) ? n : parseInt(n)).sort();
                const correctArr = [...correctData].sort();
                isCorrect = JSON.stringify(cleanInput) === JSON.stringify(correctArr);
            } else if (q.type === 'COUNT') {
                isCorrect = parseInt(input) === correctData.length;
            } else if (q.type === 'SUBSET_COUNT') {
                isCorrect = parseInt(input) === Math.pow(2, correctData.length);
            } else if (q.type === 'IS_SUBSET') {
                isCorrect = input.toLowerCase() === q.expected;
            } else if (q.type === 'COUNT_SUM') {
                    // Advanced Summation that handles Algebra strings
                    const sum = correctData.reduce((acc, val) => {
                        // If it's a plain number "20", parse it
                        if (!isNaN(val)) return acc + parseInt(val);
                        
                        // If it's algebra "2y+8", evaluate it if x_val is provided
                        if (q.x_val !== undefined) {
                            // Replace 'y' or 'x' with the value
                            const expr = val.replace(/[a-z]/g, `*${q.x_val}`).replace(/^\*/, '');
                            try {
                                return acc + new Function(`return ${expr}`)();
                            } catch(e) { return acc; }
                        }
                        return acc;
                    }, 0);
                    
                    isCorrect = parseInt(input) === sum;
                }  else if (q.type === 'ALGEBRA_SOLVE') {
                // If JSON provides expected_x, use it. Otherwise try to calculate (simple cases).
                let targetX = q.expected_x;
                
                if (targetX === undefined) {
                    // Fallback for simple "x + 10 = 25" cases
                    const intersectionVal = parseInt(zones.center[0]) || 0;
                    targetX = q.equation_target - intersectionVal;
                }
                
                isCorrect = parseInt(input) === targetX;
            } else if (q.type === 'ALGEBRA_SUBSTITUTE') {
                // Evaluating expression: "2x + 10" with x=15
                // We can use a safe evaluator
                const x = q.x_val;
                // sanitized eval for simple math "2*x + 10"
                const cleanExpr = q.expression.replace(/x/g, `*${x}`).replace(/^\*/, ''); // "2*15"
                // Use Function constructor for safe math eval
                const result = new Function(`return ${cleanExpr}`)();
                
                isCorrect = parseInt(input) === result;
            }
        }

        const fb = document.getElementById('feedback');
        if (isCorrect) {
            fb.innerText = "Correct!";
            fb.style.color = "var(--success-color)";
            SetTheoryEngine.state.isResolved = true;
            if(q.interaction === 'BINARY') {
                 setTimeout(() => {
                    document.getElementById('dynamic-controls').innerHTML = `<button class="check-btn" onclick="ManyaSetHandler()" style="background:var(--success-color)">NEXT QUESTION</button>`;
                 }, 500);
            } else {
                const btn = document.querySelector('.check-btn');
                if(btn) { btn.innerText = "NEXT"; btn.style.background = "var(--success-color)"; }
            }
        } else {
            fb.innerText = "Try again.";
            fb.style.color = "#ef4444";
        }
    },

    toggleHint: () => {
        const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
        SetTheoryEngine.state.activeHighlight = SetTheoryEngine.state.activeHighlight ? null : q.targetRegion;
        SetTheoryEngine.draw();
    },

    initResize: () => {
        const handleResize = () => {
            const parent = document.getElementById('canvas-mount');
            if(!parent || parent.clientWidth === 0) return;
            const dpr = window.devicePixelRatio || 2;
            const rect = parent.getBoundingClientRect();
            let targetW = rect.width * 0.95;
            let targetH = rect.height * 0.95;
            
            if (targetW / targetH > 1.6) targetW = targetH * 1.6;
            if (targetH / targetW > 1.1) targetH = targetW * 1.1;

            const canvas = document.getElementById('set-canvas');
            canvas.width = targetW * dpr; canvas.height = targetH * dpr;
            canvas.style.width = `${targetW}px`; canvas.style.height = `${targetH}px`;
            
            SetTheoryEngine.state.ctx.scale(dpr, dpr);
            SetTheoryEngine.state.width = targetW; SetTheoryEngine.state.height = targetH;
            SetTheoryEngine.state.scale = Math.min(targetW / 400, 1.4);
            SetTheoryEngine.draw();
        };
        new ResizeObserver(() => requestAnimationFrame(handleResize)).observe(document.getElementById('canvas-mount'));
    },

    // --- UPDATED DRAWING LOGIC ---
    draw: () => {
        const { ctx, width, height, data, activeHighlight, scale } = SetTheoryEngine.state;
        if (width <= 0) return;
        ctx.clearRect(0, 0, width, height);
        const s = scale; 
        const pad = 20 * s; // Reduced padding
        const cx = width / 2; 
        const cy = height / 2 + (15 * s); 
        
        const availW = width - (pad*2); const availH = height - (pad*2);
        const r = Math.max(10, Math.min(availW * 0.28, availH * 0.35)); 
        const offset = r * 0.65;

        const isSingleSet = data.sets.B.label === "";
        
        const c1 = { x: isSingleSet ? cx : cx - offset, y: cy, r: r, color: data.sets.A.color };
        const c2 = { x: cx + offset, y: cy, r: r, color: data.sets.B.color };

        // 1. HIGHLIGHTS
        if (activeHighlight) {
            ctx.save();
            ctx.fillStyle = "#fef9c3";
            if (activeHighlight === 'intersection') { ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.clip(); ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill(); }
            else if (activeHighlight === 'left_only') { ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill(); }
            else if (activeHighlight === 'right_only') { ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.fill(); }
            else if (activeHighlight === 'right_total') { ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill(); }
            else if (activeHighlight === 'left_total') { ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.fill(); }
            else if (activeHighlight === 'union') { ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill(); }
            ctx.restore();
        }

        // 2. UNIVERSAL SET
        ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 2;
        ctx.strokeRect(pad, pad, width - pad*2, height - pad*2);
        ctx.fillStyle = "#64748b"; ctx.font = `800 ${18 * s}px sans-serif`; 
        ctx.fillText("ξ", pad + 15*s, pad + 25*s);

        // 3. CIRCLES & LABELS
        ctx.lineWidth = 3.5 * s;
        ctx.strokeStyle = c1.color; ctx.beginPath(); ctx.arc(c1.x, c1.y, c1.r, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = c1.color; ctx.font = `800 ${22 * s}px sans-serif`;
        ctx.textAlign = isSingleSet ? "right" : "right"; 
        // Label anchored to top-left corner of bounding box
        ctx.fillText(data.sets.A.label, c1.x - (r*0.6), c1.y - (r*0.8));

        if(!isSingleSet) {
            ctx.strokeStyle = c2.color; ctx.beginPath(); ctx.arc(c2.x, c2.y, c2.r, 0, Math.PI*2); ctx.stroke();
            ctx.fillStyle = c2.color; ctx.textAlign = "left"; 
            // Label anchored to top-right corner
            ctx.fillText(data.sets.B.label, c2.x + (r*0.6), c2.y - (r*0.8));
        }

        // 4. IMPROVED SCATTER LOGIC
        ctx.font = `600 ${18 * s}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#1e293b";
        
        const drawScatter = (nums, cx, cy, radius, spreadFactor = 0.5) => {
             if(!nums || nums.length === 0) return;
             
             // Dynamic Spread: Push items further apart if there are many
             const spread = radius * (nums.length > 2 ? 0.7 : spreadFactor);
             
             // Defined Positions (Grid-like to prevent overlap)
             const pos = [
                 {x:0, y:0},
                 {x:0, y:-0.5}, {x:0, y:0.5},
                 {x:-0.5, y:-0.4}, {x:0.5, y:-0.4}, {x:0, y:0.6}, // Triangle
                 {x:-0.5, y:-0.5}, {x:0.5, y:-0.5}, {x:-0.5, y:0.5}, {x:0.5, y:0.5} // Box
             ];
             
             let layout = pos.slice(0, 1);
             if(nums.length === 2) layout = pos.slice(1, 3);
             if(nums.length === 3) layout = pos.slice(3, 6);
             if(nums.length >= 4) layout = pos.slice(6, 10);

             nums.forEach((n, i) => {
                 const p = layout[i] || {x:0, y:0};
                 ctx.fillText(n, cx + (p.x * spread), cy + (p.y * spread)); 
             });
        };

        if(isSingleSet) {
             drawScatter(data.zones.center, cx, cy, r, 0.6);
        } else {
             // Left & Right Sets
             drawScatter(data.zones.left, c1.x - (r*0.45), cy, r*0.55);
             drawScatter(data.zones.right, c2.x + (r*0.45), cy, r*0.55);
             // Intersection: Tighter spread
             drawScatter(data.zones.center, cx, cy, r*0.4);
        }
        
        if(data.zones.outside) {
             drawScatter(data.zones.outside, width - (50*s), height - (50*s), 40*s);
        }
    }
};

window.ManyaSetHandler = (val) => SetTheoryEngine.handleInput(val);