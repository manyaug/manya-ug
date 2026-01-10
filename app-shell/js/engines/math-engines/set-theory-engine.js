export const SetTheoryEngine = {
    state: {
        ctx: null, width: 0, height: 0,
        currentStep: 0, isResolved: false, data: null, scale: 1, activeHighlight: null,
        chips: [], dragging: null, dragOffset: {x:0, y:0}
    },

    injectStyles: () => {
        
        if (document.getElementById('set-theory-styles')) return;
        const style = document.createElement('style');
        style.id = 'set-theory-styles';
        style.innerHTML = `
        
    body, html { height: 100%; overflow: hidden; position: fixed; width: 100%; }
    .set-root { 
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        display: flex; flex-direction: column; background: #f8fafc; 
    }
    .canvas-wrapper { 
        flex: 1; position: relative; width: 100%;
        background: radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%); 
        touch-action: none;
    }
    /* Control Card pinned to bottom */
    .control-card { 
        flex-shrink: 0; background: white; 
        padding: 16px 20px;
        padding-bottom: max(20px, env(safe-area-inset-bottom)); /* SAFE AREA FIX */
        border-top-left-radius: 24px; border-top-right-radius: 24px; 
        box-shadow: 0 -10px 40px rgba(0,0,0,0.08); 
        z-index: 30; display: flex; flex-direction: column; gap: 12px; 
    }
   
            /* 100dvh fixes the "Hidden behind address bar" issue */
            .set-root { display: flex; flex-direction: column; height: 100dvh; width: 100%; background: #f8fafc; overflow: hidden; position: relative; }
            
            /* min-height: 0 is CRITICAL for flex containers to shrink */
            .canvas-wrapper { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; position: relative; background: radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%); padding: 5px; touch-action: none; }
            
            canvas { box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-radius: 20px; background: white; max-width: 100%; max-height: 100%; object-fit: contain; }
            .hint-pill { position: absolute; top: 15px; right: 15px; background: white; border: 1px solid #e2e8f0; padding: 6px 14px; border-radius: 30px; font-size: 11px; font-weight: 800; color: var(--manya-purple); box-shadow: 0 4px 12px rgba(0,0,0,0.05); cursor: pointer; transition: 0.2s; z-index: 20; display: flex; align-items: center; gap: 6px; }
            
            /* SAFE AREA PADDING for iPhones */
            .control-card { 
                flex-shrink: 0; background: white; 
                padding: 16px 20px;
                padding-bottom: max(20px, env(safe-area-inset-bottom)); /* Pushes button up */
                border-top-left-radius: 24px; border-top-right-radius: 24px; 
                box-shadow: 0 -10px 40px rgba(0,0,0,0.08); 
                z-index: 30; display: flex; flex-direction: column; gap: 12px; 
            }
            
            .q-text { font-size: 1.1rem; font-weight: 700; color: var(--text-dark); text-align: center; margin-bottom: 2px; }
            .feedback-msg { text-align: center; font-size: 0.9rem; font-weight: 700; min-height: 18px; margin-top: 2px; }
            .input-group { display: flex; flex-direction: column; gap: 10px; width: 100%; }
            .set-input { width: 100%; height: 50px; font-size: 1.3rem; text-align: center; font-weight: 700; border: 2px solid #e2e8f0; border-radius: 14px; outline: none; color: var(--text-dark); background: #f8fafc; transition: all 0.2s; }
            .set-input:focus { border-color: var(--manya-purple); background: white; box-shadow: 0 0 0 4px var(--manya-purple-light); }
            .check-btn { width: 100%; height: 50px; background: var(--manya-purple); color: white; border: none; border-radius: 14px; font-weight: 700; font-size: 1.05rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
            .check-btn:active { transform: scale(0.98); opacity: 0.9; }
            .btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
            .btn-choice { padding: 14px 10px; border-radius: 16px; border: 2px solid transparent; font-weight: 800; font-size: 0.9rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: 0.2s; box-shadow: 0 4px 0 rgba(0,0,0,0.05); }
            .btn-choice:active { transform: translateY(2px); box-shadow: none; }
            .btn-yes { background: #dcfce7; color: #16a34a; border-color: #bbf7d0; }
            .btn-no { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
        `;
        document.head.appendChild(style);
    },

    // ... (Keep the rest of the JavaScript logic exactly the same)
    // Just replace the styles above, and ensuring renderLabeling uses them.
    // The logic below is identical to the "Complete Edition" provided previously.

    renderLabeling: (container, data) => {
        SetTheoryEngine.injectStyles();
        
        SetTheoryEngine.state.data = data;
        SetTheoryEngine.state.currentStep = 0;
        SetTheoryEngine.state.chips = []; 
        SetTheoryEngine.state.dragging = null;
        SetTheoryEngine.state.isResolved = false;

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
        SetTheoryEngine.initInputListeners(canvas);
        
        // Use ResizeObserver for accurate sizing
        const resizeObserver = new ResizeObserver(() => {
             // Logic to resize canvas to container
             const parent = document.getElementById('canvas-mount');
             if(!parent) return;
             const rect = parent.getBoundingClientRect();
             if(rect.width === 0) return;
             
             const dpr = window.devicePixelRatio || 2;
             canvas.width = rect.width * dpr;
             canvas.height = rect.height * dpr;
             canvas.style.width = '100%';
             canvas.style.height = '100%';
             
             SetTheoryEngine.state.ctx.scale(dpr, dpr);
             SetTheoryEngine.state.width = rect.width;
             SetTheoryEngine.state.height = rect.height;
             SetTheoryEngine.state.scale = Math.min(rect.width / 400, 1.4);
             
             if(SetTheoryEngine.state.chips.length > 0) {
                 // Check interactions
                 const q = SetTheoryEngine.state.data?.questions[SetTheoryEngine.state.currentStep];
                 if(q && q.interaction === 'DRAG_SETS') SetTheoryEngine.layoutSets();
                 else SetTheoryEngine.layoutChips();
             }
             SetTheoryEngine.draw();
        });
        resizeObserver.observe(document.getElementById('canvas-mount'));

        document.getElementById('btn-hint').onclick = SetTheoryEngine.toggleHint;
        SetTheoryEngine.loadQuestion();
    },
    
    // ... (Paste the rest of the Logic functions: loadQuestion, layoutChips, layoutSets, handleInput, toggleHint, initInputListeners, draw) ...
    // Be sure to include the layoutSets, layoutChips and handleInput functions from the previous "Final Master" response.
    
    // (I am omitting the logic block here to save space, but you must keep the logic from the previous answer, only the CSS changed)
    
    loadQuestion: () => {
        const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
        document.getElementById('q-display').innerHTML = q.prompt;
        document.getElementById('feedback').innerText = "";
        SetTheoryEngine.state.activeHighlight = null;
        SetTheoryEngine.state.isResolved = false;
        
        const controls = document.getElementById('dynamic-controls');
        controls.innerHTML = ''; 

        if (q.interaction === 'DRAG_SORT' || q.interaction === 'DRAG_SETS') {
            SetTheoryEngine.state.chips = q.items.map(item => ({
                val: item.val, target: item.target, x: 0, y: 0, 
                isPlaced: false, radius: item.radius || 22, 
                customColor: item.color, isLocked: item.locked || false, currentRegion: null
            }));
            if (q.interaction === 'DRAG_SETS') setTimeout(SetTheoryEngine.layoutSets, 50);
            else setTimeout(SetTheoryEngine.layoutChips, 50);

            controls.innerHTML = `<button class="check-btn" onclick="ManyaSetHandler()">CHECK PLACEMENT</button>`;
        } 
        else if (q.retain_visuals) {
            SetTheoryEngine.state.chips.forEach(c => c.isLocked = true);
            controls.innerHTML = `<div class="input-group"><input type="text" id="user-ans" class="set-input" placeholder="?" autocomplete="off" inputmode="text"><button class="check-btn" onclick="ManyaSetHandler()">CHECK ANSWER</button></div>`;
        }
        else {
            SetTheoryEngine.state.chips = []; 
            if (q.interaction === 'BINARY') {
                controls.innerHTML = `<div class="btn-grid"><button class="btn-choice btn-yes" onclick="ManyaSetHandler('yes')">SUBSET <span>Inside S</span></button><button class="btn-choice btn-no" onclick="ManyaSetHandler('no')">NOT SUBSET <span>Has Outsider</span></button></div>`;
            } else {
                controls.innerHTML = `<div class="input-group"><input type="text" id="user-ans" class="set-input" placeholder="?" autocomplete="off" inputmode="text"><button class="check-btn" onclick="ManyaSetHandler()">CHECK ANSWER</button></div>`;
            }
        }
        SetTheoryEngine.draw();
    },

    layoutChips: () => {
        const { width, height, chips, scale } = SetTheoryEngine.state;
        if(width === 0) return;

        const pad = 10 * scale;
        const availW = width - (pad*2);
        const availH = height - (pad*2);
        const r = Math.max(10, Math.min(availW * 0.28, availH * 0.35)); 
        const offset = r * 0.65;
        const vennLeftX = (width/2) - offset - r;
        const vennRightX = (width/2) + offset + r;
        const chipsToPlace = chips.filter(c => !c.isPlaced);
        if(chipsToPlace.length === 0) return;

        const leftSpace = vennLeftX;
        const rightSpace = width - vennRightX;
        const canUseSides = leftSpace > (40 * scale) && rightSpace > (40 * scale);

        if (canUseSides) {
            const centerY = height / 2;
            const stepY = 55 * scale;
            chipsToPlace.forEach((c, i) => {
                const isLeft = i % 2 === 0;
                c.x = isLeft ? (vennLeftX / 2) : (width - (rightSpace/2));
                const idx = Math.floor(i/2);
                const itemsInCol = Math.ceil(chipsToPlace.length / 2);
                const startY = centerY - ((itemsInCol - 1) * stepY) / 2;
                c.y = startY + (idx * stepY);
            });
        } else {
            const chipGap = 50 * scale;
            const startX = (width - ((chipsToPlace.length-1)*chipGap))/2;
            const rowY = height - (30 * scale);
            chipsToPlace.forEach((c, i) => {
                c.x = startX + (i * chipGap);
                c.y = rowY;
            });
        }
    },

    layoutSets: () => {
        const { width, height, chips } = SetTheoryEngine.state;
        chips.forEach((c, i) => {
            if(c.isLocked) { c.x = width * 0.35; c.y = height / 2; } 
            else if (!c.isPlaced) { c.x = width * 0.7; c.y = height / 2; }
        });
    },

    handleInput: (val) => {
        if (SetTheoryEngine.state.isResolved) {
            if (SetTheoryEngine.state.currentStep < SetTheoryEngine.state.data.questions.length - 1) {
                SetTheoryEngine.state.currentStep++;
                SetTheoryEngine.loadQuestion();
            } else {
                document.getElementById('q-display').innerHTML = "🎉 Quest Complete!";
                document.getElementById('dynamic-controls').style.display = 'none';
            }
            return;
        }

        const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
        let isCorrect = false;
        const zones = SetTheoryEngine.state.data.zones;
        
        if (q.interaction === 'DRAG_SETS') {
            const c1 = SetTheoryEngine.state.chips[0];
            const c2 = SetTheoryEngine.state.chips[1];
            if (!c1 || !c2) return;
            const dist = Math.sqrt(Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2));
            const s = SetTheoryEngine.state.scale;
            const r1 = c1.radius * s; 
            const r2 = c2.radius * s; 

            if (c2.target === 'inside_F' || c1.target === 'inside_F') {
                const rBig = r1 > r2 ? r1 : r2;
                const rSmall = r1 > r2 ? r2 : r1;
                isCorrect = (dist + rSmall) <= (rBig * 1.15); 
            } else if (c1.target === 'disjoint') {
                isCorrect = dist > (r1 + r2 - 10);
            } else if (c1.target === 'overlap') {
                isCorrect = (dist < r1 + r2) && (dist > Math.abs(r1 - r2) + 15);
            }
            if(isCorrect) { c1.isPlaced = true; c2.isPlaced = true; }
        } 
        else if (q.interaction === 'DRAG_SORT') {
            isCorrect = SetTheoryEngine.state.chips.every(c => c.isPlaced && c.currentRegion === c.target);
        } else if (q.interaction === 'BINARY') {
            isCorrect = val === q.expected;
        } else {
            const input = document.getElementById('user-ans').value.trim();
            let correctData = [];
            
            if(q.targetRegion === 'intersection') correctData = zones.center;
            else if(q.targetRegion === 'left_only') correctData = zones.left;
            else if(q.targetRegion === 'right_only') correctData = zones.right;
            else if(q.targetRegion === 'universal_only') correctData = zones.outside;
            else if(q.targetRegion === 'right_total') correctData = [...zones.center, ...zones.right];
            else if(q.targetRegion === 'left_total') correctData = [...zones.center, ...zones.left];
            else if(q.targetRegion === 'symmetric_difference') correctData = [...zones.left, ...zones.right];
            else if(q.targetRegion === 'union') correctData = [...zones.left, ...zones.center, ...zones.right];

            if (q.type === 'LIST') {
                const cleanInput = input.replace(/[{}]/g, '').split(/[\s,]+/).map(n => isNaN(parseInt(n)) ? n : parseInt(n)).sort((a,b)=>a-b);
                const correctArr = correctData.map(n => isNaN(parseInt(n)) ? n : parseInt(n)).sort((a,b)=>a-b);
                isCorrect = JSON.stringify(cleanInput) === JSON.stringify(correctArr);
            } 
            else if (q.type === 'COUNT') {
                isCorrect = parseInt(input) === correctData.length;
            } 
            else if (q.type === 'SUBSET_COUNT') {
                isCorrect = parseInt(input) === Math.pow(2, correctData.length);
            } 
            else if (q.type === 'IS_SUBSET') {
                isCorrect = input.toLowerCase() === q.expected;
            }
            else if (q.type === 'COUNT_SUM') {
                const sum = correctData.reduce((acc, v) => {
                    if (!isNaN(v)) return acc + parseInt(v);
                    if (q.x_val !== undefined) {
                        const expr = v.replace(/[a-z]/g, `*${q.x_val}`).replace(/^\*/, '');
                        try { return acc + new Function(`return ${expr}`)(); } catch(e) { return acc; }
                    }
                    return acc;
                }, 0);
                isCorrect = parseInt(input) === sum;
            } 
            else if (q.type === 'ALGEBRA_SOLVE') {
                let targetX = q.expected_x;
                if (targetX === undefined) {
                    const intersectionVal = parseInt(zones.center[0]) || 0;
                    targetX = q.equation_target - intersectionVal;
                }
                isCorrect = parseInt(input) === targetX;
            } 
            else if (q.type === 'ALGEBRA_SUBSTITUTE') {
                const x = q.x_val;
                const cleanExpr = q.expression.replace(/x/g, `*${x}`).replace(/^\*/, '');
                const result = new Function(`return ${cleanExpr}`)();
                isCorrect = parseInt(input) === result;
            }
        }

        const fb = document.getElementById('feedback');
        if (isCorrect) {
            fb.innerText = "Correct!";
            fb.style.color = "var(--success-color)";
            SetTheoryEngine.state.isResolved = true;
            if(q.interaction === 'BINARY' || q.interaction === 'DRAG_SORT' || q.interaction === 'DRAG_SETS') {
                 setTimeout(() => { document.getElementById('dynamic-controls').innerHTML = `<button class="check-btn" onclick="ManyaSetHandler()" style="background:var(--success-color)">NEXT QUESTION</button>`; }, 500);
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

    initInputListeners: (canvas) => {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const scaleX = SetTheoryEngine.state.width / rect.width;
            const scaleY = SetTheoryEngine.state.height / rect.height;
            return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
        };

        const start = (e) => {
            if(SetTheoryEngine.state.isResolved) return;
            const pos = getPos(e);
            const chip = SetTheoryEngine.state.chips.find(c => !c.isLocked && Math.hypot(c.x - pos.x, c.y - pos.y) < (c.radius * SetTheoryEngine.state.scale * 1.3));
            if(chip) {
                SetTheoryEngine.state.dragging = chip;
                SetTheoryEngine.state.dragOffset = { x: pos.x - chip.x, y: pos.y - chip.y };
            }
        };

        const move = (e) => {
            if(!SetTheoryEngine.state.dragging) return;
            e.preventDefault(); 
            const pos = getPos(e);
            const chip = SetTheoryEngine.state.dragging;
            chip.x = pos.x - SetTheoryEngine.state.dragOffset.x;
            chip.y = pos.y - SetTheoryEngine.state.dragOffset.y;
            SetTheoryEngine.draw();
        };

        const end = () => {
            if(!SetTheoryEngine.state.dragging) return;
            const chip = SetTheoryEngine.state.dragging;
            const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];

            if (q.interaction === 'DRAG_SORT') {
                const { width, height, scale, data } = SetTheoryEngine.state;
                const cx = width/2; const cy = height/2 + (15*scale);
                const r = Math.max(10, Math.min((width-40*scale)*0.28, (height-40*scale)*0.35));
                const offset = r * 0.65;
                const c1x = (data.sets.B.label === "") ? cx : cx - offset;
                const c2x = cx + offset;
                const dist1 = Math.sqrt(Math.pow(chip.x - c1x, 2) + Math.pow(chip.y - cy, 2));
                const dist2 = Math.sqrt(Math.pow(chip.x - c2x, 2) + Math.pow(chip.y - cy, 2));

                if (dist1 < r && dist2 < r) chip.currentRegion = 'center';
                else if (dist1 < r) chip.currentRegion = 'left';
                else if (dist2 < r) chip.currentRegion = 'right';
                else chip.currentRegion = 'outside';
                chip.isPlaced = true;
            }
            SetTheoryEngine.state.dragging = null;
            SetTheoryEngine.draw();
        };

        canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); canvas.addEventListener('mouseup', end);
        canvas.addEventListener('touchstart', start, {passive: false}); canvas.addEventListener('touchmove', move, {passive: false}); canvas.addEventListener('touchend', end);
    },

    draw: () => {
        const { ctx, width, height, data, activeHighlight, scale, chips } = SetTheoryEngine.state;
        if (width <= 0) return;
        ctx.clearRect(0, 0, width, height);
        const s = scale; const pad = 20 * s; 
        const cx = width / 2; const cy = height / 2 + (15 * s); 
        const availW = width - (pad*2); const availH = height - (pad*2);
        const r = Math.max(10, Math.min(availW * 0.28, availH * 0.35)); 
        const offset = r * 0.65;

        const q = data.questions[SetTheoryEngine.state.currentStep];
        const isVisualDrag = q.interaction === 'DRAG_SETS';

        if (!isVisualDrag) {
            const isSingleSet = data.sets.B.label === "";
            const c1 = { x: isSingleSet ? cx : cx - offset, y: cy, r: r, color: data.sets.A.color };
            const c2 = { x: cx + offset, y: cy, r: r, color: data.sets.B.color };

            if (activeHighlight) {
                ctx.save(); ctx.fillStyle = "#fef9c3";
                if (activeHighlight === 'intersection') { ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.clip(); ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill(); }
                else if (activeHighlight === 'left_only') { ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill(); }
                else if (activeHighlight === 'right_only') { ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.fill(); }
                else if (activeHighlight === 'right_total') { ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill(); }
                else if (activeHighlight === 'left_total') { ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.fill(); }
                else if (activeHighlight === 'union') { ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill(); }
                ctx.restore();
            }

            ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 2;
            ctx.strokeRect(pad, pad, width - pad*2, height - pad*2);
            ctx.fillStyle = "#64748b"; ctx.font = `800 ${18 * s}px sans-serif`; 
            ctx.fillText("ξ", pad + 15*s, pad + 25*s);

            ctx.lineWidth = 3.5 * s;
            ctx.strokeStyle = c1.color; ctx.beginPath(); ctx.arc(c1.x, c1.y, c1.r, 0, Math.PI*2); ctx.stroke();
            ctx.fillStyle = c1.color; ctx.font = `800 ${22 * s}px sans-serif`;
            ctx.textAlign = isSingleSet ? "right" : "right"; 
            ctx.fillText(data.sets.A.label, c1.x - (r*0.6), c1.y - (r*0.8));

            if(!isSingleSet) {
                ctx.strokeStyle = c2.color; ctx.beginPath(); ctx.arc(c2.x, c2.y, c2.r, 0, Math.PI*2); ctx.stroke();
                ctx.fillStyle = c2.color; ctx.textAlign = "left"; 
                ctx.fillText(data.sets.B.label, c2.x + (r*0.6), c2.y - (r*0.8));
            }
            
            if(SetTheoryEngine.state.chips.length === 0) { 
                ctx.font = `600 ${18 * s}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#1e293b";
                const drawScatter = (nums, cx, cy, radius) => {
                     if(!nums || nums.length === 0) return;
                     const spread = radius * 0.5;
                     nums.forEach((n, i) => { ctx.fillText(String(n), cx + (Math.sin(i)*spread), cy + (Math.cos(i)*spread)); });
                };
                if(isSingleSet) { drawScatter(data.zones.center, cx, cy, r); } 
                else { drawScatter(data.zones.left, c1.x - (r*0.45), cy, r*0.55); drawScatter(data.zones.right, c2.x + (r*0.45), cy, r*0.55); drawScatter(data.zones.center, cx, cy, r*0.4); }
            }
        }

        if(chips.length > 0) {
            chips.forEach(c => {
                // Safety re-layout if positions are 0
                if(c.x === 0 && c.y === 0 && !c.isPlaced) {
                     if (isVisualDrag) SetTheoryEngine.layoutSets(); else SetTheoryEngine.layoutChips();
                }

                ctx.save();
                ctx.translate(c.x, c.y);
                if (c.customColor) {
                    ctx.beginPath(); ctx.arc(0, 0, c.radius * s, 0, Math.PI*2);
                    ctx.fillStyle = c.customColor; ctx.fill();
                    ctx.strokeStyle = '#9333ea'; ctx.lineWidth = 3; ctx.stroke();
                    ctx.fillStyle = '#9333ea'; ctx.font = `bold ${24*s}px sans-serif`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(String(c.val), 0, 0);
                } 
                else if (c.isLocked) {
                    ctx.fillStyle = '#1e293b'; ctx.font = `bold ${20*s}px sans-serif`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(String(c.val), 0, 0);
                } else {
                    ctx.beginPath(); ctx.arc(0, 0, c.radius * s, 0, Math.PI*2);
                    if(c.isPlaced) { ctx.fillStyle = '#dcfce7'; ctx.strokeStyle = '#15803d'; } 
                    else { ctx.fillStyle = '#f3e8ff'; ctx.strokeStyle = '#9333ea'; }
                    ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
                    ctx.fillStyle = '#0f172a'; ctx.font = `bold ${16*s}px sans-serif`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(String(c.val), 0, 1);
                }
                ctx.restore();
            });
        }
    }
};

window.ManyaSetHandler = (val) => SetTheoryEngine.handleInput(val);