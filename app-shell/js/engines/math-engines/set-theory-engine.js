/**
 * Manya Set Theory Engine (v15.0 - Layout Layout Fix)
 * Fixes:
 * - Changed height to 100% to fit inside App Shell (prevents button cutoff).
 * - Clamped diagram vertical centering to prevent "tall screen" stretching.
 */
export const SetTheoryEngine = {
    state: { 
        ctx: null, width: 0, height: 0, scale: 1,
        currentStep: 0, isResolved: false, data: null, activeHighlight: null,
        chips: [], dragging: null, dragOffset: {x:0,y:0},
        theme: 'default',
        inputs: []
    },

    injectStyles: () => {
        if (document.getElementById('set-theory-styles')) return;
        const style = document.createElement('style');
        style.id = 'set-theory-styles';
        style.innerHTML = `
            /* ROOT: Use 100% to fill the parent #view-mount exactly */
            .set-root { 
                position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
                display: flex; flex-direction: column; 
                background: #f8fafc; overflow: hidden; user-select: none; 
            }
            
            /* CANVAS WRAPPER: Grows to fill space, but allowed to shrink */
            .canvas-wrapper { 
                flex: 1 1 auto; 
                min-height: 0; /* CRITICAL FIX for flexbox overflow */
                position: relative; width: 100%; 
                background: radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%); 
                touch-action: none; 
            }
            canvas { display: block; width: 100%; height: 100%; object-fit: contain; }
            
            /* INPUTS: Scaled for mobile readability */
            .venn-input {
                position: absolute; transform: translate(-50%, -50%);
                width: 48px; height: 32px; 
                border: 2px solid #e2e8f0; border-radius: 8px;
                text-align: center; font-weight: 700; font-size: 0.9rem; color: #1e293b;
                background: rgba(255, 255, 255, 0.95);
                box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                outline: none; transition: all 0.2s; z-index: 10;
            }
            .venn-input:focus { border-color: #9333ea; box-shadow: 0 0 0 3px #f3e8ff; transform: translate(-50%, -50%) scale(1.1); }
            .venn-input.correct { border-color: #22c55e; background: #f0fdf4; color: #15803d; }
            .venn-input.wrong { border-color: #ef4444; background: #fef2f2; animation: shake 0.3s; }
            
            .hint-pill { position: absolute; top: 10px; right: 10px; background: white; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 30px; font-size: 10px; font-weight: 800; color: var(--manya-purple); box-shadow: 0 4px 12px rgba(0,0,0,0.05); cursor: pointer; z-index: 20; display: flex; align-items: center; gap: 4px; }
            
            /* HUD: Pinned to bottom with extra safe space */
            .hud { 
                flex: 0 0 auto; background: white; 
                padding: 12px 16px; 
                /* Add 20px extra padding for browser bottom bars */
                padding-bottom: calc(20px + env(safe-area-inset-bottom)); 
                border-top: 1px solid #e2e8f0; 
                display: flex; flex-direction: column; gap: 8px; 
                z-index: 100; box-shadow: 0 -5px 20px rgba(0,0,0,0.05); 
            }
            
            .q-text { font-size: 1rem; font-weight: 700; color: var(--text-dark); text-align: center; margin-bottom: 0px; line-height: 1.3; }
            .feedback-msg { text-align: center; font-size: 0.85rem; font-weight: 700; min-height: 16px; margin-top: 0px; }
            
            .input-group { display: flex; flex-direction: column; gap: 8px; width: 100%; }
            .set-input { width: 100%; height: 48px; font-size: 1.2rem; text-align: center; font-weight: 700; border: 2px solid #e2e8f0; border-radius: 12px; outline: none; color: var(--text-dark); background: #f8fafc; transition: all 0.2s; }
            .set-input:focus { border-color: var(--manya-purple); background: white; box-shadow: 0 0 0 4px var(--manya-purple-light); }
            .check-btn { width: 100%; height: 48px; background: var(--manya-purple); color: white; border: none; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
            
            .btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
            .btn-choice { padding: 12px 10px; border-radius: 12px; border: 2px solid transparent; font-weight: 800; font-size: 0.85rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: 0.2s; box-shadow: 0 4px 0 rgba(0,0,0,0.05); }
            .btn-yes { background: #dcfce7; color: #16a34a; border-color: #bbf7d0; }
            .btn-no { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
            
            @keyframes shake { 0%, 100% { transform: translate(-50%, -50%); } 25% { transform: translate(calc(-50% - 5px), -50%); } 75% { transform: translate(calc(-50% + 5px), -50%); } }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        SetTheoryEngine.injectStyles();
        SetTheoryEngine.state.data = data;
        SetTheoryEngine.state.currentStep = 0;
        SetTheoryEngine.state.chips = []; 
        SetTheoryEngine.state.dragging = null;
        SetTheoryEngine.state.isResolved = false;
        SetTheoryEngine.state.inputs = [];

        container.innerHTML = `
            <div class="set-root">
                <div class="canvas-wrapper" id="canvas-mount">
                    <button id="btn-hint" class="hint-pill"><span>💡</span> <span>HINT</span></button>
                    <canvas id="set-canvas"></canvas>
                    <div id="diagram-inputs"></div>
                </div>
                <div class="hud">
                    <div id="q-display" class="q-text">Loading...</div>
                    <div id="dynamic-controls"></div>
                    <div id="feedback" class="feedback-msg"></div>
                </div>
            </div>
        `;

        const canvas = document.getElementById('set-canvas');
        SetTheoryEngine.state.ctx = canvas.getContext('2d');
        SetTheoryEngine.initInputListeners(canvas);
        
        const resize = () => {
            const wrapper = document.getElementById('canvas-mount');
            if(!wrapper) return;
            const rect = wrapper.getBoundingClientRect();
            if(rect.width === 0) return;
            
            const dpr = window.devicePixelRatio || 2;
            
            canvas.width = rect.width * dpr; 
            canvas.height = rect.height * dpr;
            
            SetTheoryEngine.state.scale = dpr;
            SetTheoryEngine.state.width = rect.width * dpr; 
            SetTheoryEngine.state.height = rect.height * dpr;
            
            const q = SetTheoryEngine.state.data?.questions[SetTheoryEngine.state.currentStep];
            if(SetTheoryEngine.state.chips.length > 0 && q) {
                if(q.interaction === 'DRAG_SETS') SetTheoryEngine.layoutSets();
                else if (q.interaction === 'DRAG_SORT') SetTheoryEngine.layoutChips();
            }
            
            SetTheoryEngine.draw();
            SetTheoryEngine.updateInputPositions();
        };

        new ResizeObserver(resize).observe(document.getElementById('canvas-mount'));
        setTimeout(resize, 100);

        document.getElementById('btn-hint').onclick = SetTheoryEngine.toggleHint;
        SetTheoryEngine.loadQuestion();
    },

    loadQuestion: () => {
        const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
        document.getElementById('q-display').innerHTML = q.prompt;
        document.getElementById('feedback').innerText = "";
        SetTheoryEngine.state.activeHighlight = null;
        SetTheoryEngine.state.isResolved = false;
        
        const inputContainer = document.getElementById('diagram-inputs');
        inputContainer.innerHTML = '';
        SetTheoryEngine.state.inputs = [];
        
        const controls = document.getElementById('dynamic-controls');
        controls.innerHTML = ''; 

        if (q.interaction === 'DIAGRAM_FILL') {
            q.inputs.forEach((def) => {
                const el = document.createElement('input');
                el.className = 'venn-input';
                el.placeholder = '?';
                el.dataset.region = def.region;
                el.setAttribute('inputmode', 'text'); // Mobile keyboard logic
                inputContainer.appendChild(el);
                SetTheoryEngine.state.inputs.push(el);
            });
            controls.innerHTML = `<button class="check-btn" onclick="ManyaSetHandler()">CHECK DIAGRAM</button>`;
            setTimeout(SetTheoryEngine.updateInputPositions, 50);
        }
        else if (q.interaction === 'DRAG_SORT' || q.interaction === 'DRAG_SETS') {
            SetTheoryEngine.state.chips = q.items.map(item => ({
                val: item.val, target: item.target, x: 0, y: 0, 
                isPlaced: false, radius: item.radius || 22, 
                customColor: item.color, isLocked: item.locked || false, currentRegion: null
            }));
            if(q.interaction === 'DRAG_SETS') setTimeout(SetTheoryEngine.layoutSets, 50);
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

    parseExpression: (exprString, variableValue) => {
        let expr = String(exprString);
        expr = expr.replace(/(\d)([a-zA-Z])/g, '$1*$2').replace(/[a-zA-Z]+/g, variableValue);
        try { return new Function(`return ${expr}`)(); } catch (e) { return NaN; }
    },

    updateZonesWithValue: (solvedVal) => {
        const zones = SetTheoryEngine.state.data.zones;
        ['left', 'center', 'right', 'outside'].forEach(key => {
            if (!zones[key]) return;
            zones[key] = zones[key].map(item => {
                if (typeof item === 'number') return item;
                const result = SetTheoryEngine.parseExpression(item, solvedVal);
                return isNaN(result) ? item : result;
            });
        });
        SetTheoryEngine.draw();
    },

    updateInputPositions: () => {
        const { width, height, scale } = SetTheoryEngine.state;
        if (!width) return;
        const s = scale; 
        // Logic coordinates for CSS positioning
        const cx = (width / 2) / s; 
        
        // --- STRETCH FIX ---
        // Instead of height/2, we clamp the center Y to ensure it doesn't drift too low on tall screens
        // Math.min(height/2, width*0.4) keeps it somewhat square relative to width
        const logicH = height / s;
        const cy = Math.min(logicH / 2, (width/s) * 0.45) + 10;
        
        const pad = 15 * s;
        const availW = (width/s) - (pad*2/s);
        // Constrain radius calculation by WIDTH primarily on mobile to avoid vertical stretch
        const r = Math.max(10, availW * 0.25); 
        const offset = r * 0.65;
        const c1x = cx - offset; const c2x = cx + offset;

        SetTheoryEngine.state.inputs.forEach(el => {
            if (el.dataset.region === 'left') { el.style.left = `${c1x - (r * 0.4)}px`; el.style.top = `${cy}px`; }
            else if (el.dataset.region === 'right') { el.style.left = `${c2x + (r * 0.4)}px`; el.style.top = `${cy}px`; }
            else if (el.dataset.region === 'outside') { 
                // Anchor outside input relative to circle bottom, not screen bottom
                el.style.left = `${cx + r + 20}px`; 
                el.style.top = `${cy + r + 20}px`; 
            }
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
        
        if (q.interaction === 'DIAGRAM_FILL') {
            let allGood = true;
            SetTheoryEngine.state.inputs.forEach(el => {
                const def = q.inputs.find(d => d.region === el.dataset.region);
                const val = el.value.replace(/\s/g, '').toLowerCase();
                const expected = def.expected.replace(/\s/g, '').toLowerCase();
                if (val === expected) {
                    el.classList.add('correct'); el.classList.remove('wrong'); el.disabled = true;
                    if(def.region === 'left') zones.left = [def.expected];
                    if(def.region === 'right') zones.right = [def.expected];
                    if(def.region === 'outside') zones.outside = [def.expected];
                } else {
                    el.classList.add('wrong'); allGood = false;
                }
            });
            isCorrect = allGood;
            if (isCorrect) {
                setTimeout(() => { document.getElementById('diagram-inputs').innerHTML = ''; SetTheoryEngine.draw(); }, 1000);
            }
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
            else if(q.targetRegion === 'union') correctData = [...zones.left, ...zones.center, ...zones.right];
            else if(q.targetRegion === 'left_total') correctData = [...zones.left, ...zones.center];
            else if(q.targetRegion === 'right_total') correctData = [...zones.right, ...zones.center];
            else if(q.targetRegion === 'symmetric_difference') correctData = [...zones.left, ...zones.right];

            if (q.type === 'ALGEBRA_SOLVE') {
                let targetX = q.expected_x;
                if (targetX === undefined) {
                     const centerVal = parseInt(zones.center[0]) || 0;
                     targetX = q.equation_target - centerVal; 
                }
                if (parseInt(input) === targetX) { isCorrect = true; SetTheoryEngine.updateZonesWithValue(targetX); }
            }
            else if (q.type === 'PROBABILITY') {
                const numerator = SetTheoryEngine.parseExpression(q.expression, q.x_val);
                const parts = input.split('/');
                if(parts.length===2) isCorrect = Math.abs((parts[0]/parts[1]) - (numerator/q.total)) < 0.0001;
            }
            else if (q.type === 'COUNT_SUM') {
                const sum = correctData.reduce((acc, v) => acc + (SetTheoryEngine.parseExpression(v, q.x_val)||0), 0);
                isCorrect = parseInt(input) === sum;
            }
            else if (q.type === 'COUNT') isCorrect = parseInt(input) === correctData.length;
            else if (q.type === 'LIST') {
                 const clean = input.replace(/[{}]/g, '').split(/[\s,]+/).map(n=>isNaN(parseInt(n))?n:parseInt(n)).sort();
                 const targ = correctData.map(n=>isNaN(parseInt(n))?n:parseInt(n)).sort();
                 isCorrect = JSON.stringify(clean) === JSON.stringify(targ);
            }
            else if (q.type === 'SUBSET_COUNT') isCorrect = parseInt(input) === Math.pow(2, correctData.length);
            else if (q.type === 'PROPER_SUBSET_COUNT') isCorrect = parseInt(input) === Math.pow(2, correctData.length) - 1;
            else if (q.type === 'REVERSE_SUBSET') isCorrect = parseInt(input) === q.expected_val;
            else if (q.type === 'REVERSE_PROPER_SUBSET') isCorrect = parseInt(input) === q.expected_val;
            else if (q.type === 'IS_SUBSET') isCorrect = input.toLowerCase() === q.expected;
            else if (q.type === 'ALGEBRA_SUBSTITUTE') {
                const res = SetTheoryEngine.parseExpression(q.expression, q.x_val);
                isCorrect = parseInt(input) === res;
            }
        }

        const fb = document.getElementById('feedback');
        if (isCorrect) {
            fb.innerText = "Correct!";
            fb.style.color = "var(--success-color)";
            SetTheoryEngine.state.isResolved = true;
            const btn = document.querySelector('.check-btn');
            if(btn) { btn.innerText = "NEXT"; btn.style.background = "var(--success-color)"; if(document.getElementById('user-ans')) document.getElementById('user-ans').disabled = true; }
        } else {
            fb.innerText = "Try again."; fb.style.color = "#ef4444";
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
            const cx = e.touches ? e.touches[0].clientX : e.clientX;
            const cy = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: (cx - rect.left) * (SetTheoryEngine.state.width / rect.width), y: (cy - rect.top) * (SetTheoryEngine.state.height / rect.height) };
        };
        const start = (e) => {
            if(SetTheoryEngine.state.isResolved) return;
            const p = getPos(e);
            const chip = [...SetTheoryEngine.state.chips].reverse().find(c => !c.isLocked && Math.hypot(c.x-p.x, c.y-p.y) < c.radius*1.3*SetTheoryEngine.state.scale);
            if(chip) { SetTheoryEngine.state.dragging=chip; SetTheoryEngine.state.dragOffset={x:p.x-chip.x, y:p.y-chip.y}; }
        };
        const move = (e) => {
            if(!SetTheoryEngine.state.dragging) return;
            e.preventDefault();
            const p = getPos(e);
            SetTheoryEngine.state.dragging.x = p.x - SetTheoryEngine.state.dragOffset.x;
            SetTheoryEngine.state.dragging.y = p.y - SetTheoryEngine.state.dragOffset.y;
            SetTheoryEngine.draw();
        };
        const end = () => {
            if(!SetTheoryEngine.state.dragging) return;
            const chip = SetTheoryEngine.state.dragging;
            const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
            if (q.interaction === 'DRAG_SORT') {
                 const { width, height, scale, data } = SetTheoryEngine.state;
                 // REPLICATE GEOMETRY CALCULATIONS HERE FOR HIT DETECTION
                 const s = scale; const pad = 15*s; 
                 // Important: Use logic height logic
                 const cy = Math.min(height/2, width*0.45) + 10*s;
                 const cx = width/2;
                 
                 const r = Math.max(10, Math.min((width-pad*2)*0.25, (height-pad*2)*0.35));
                 const offset = r*0.65;
                 
                 const c1x = (data.sets.B.label === "") ? cx : cx - offset; const c2x = cx + offset;
                 const d1 = Math.hypot(chip.x-c1x, chip.y-cy); const d2 = Math.hypot(chip.x-c2x, chip.y-cy);
                 if(d1<r && d2<r) chip.currentRegion='center'; else if(d1<r) chip.currentRegion='left'; else if(d2<r) chip.currentRegion='right'; else chip.currentRegion='outside';
                 chip.isPlaced=true;
            } else if (q.interaction === 'DRAG_SETS') {
                const c1 = SetTheoryEngine.state.chips[0]; const c2 = SetTheoryEngine.state.chips[1];
                if(c1 && c2) {
                    const dist = Math.sqrt(Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2));
                    const s = SetTheoryEngine.state.scale;
                    const r1 = c1.radius * s; const r2 = c2.radius * s; 
                    let ok = false;
                    if (c2.target === 'inside_F' || c1.target === 'inside_F') {
                        const rBig = r1 > r2 ? r1 : r2; const rSmall = r1 > r2 ? r2 : r1;
                        ok = (dist + rSmall) <= (rBig * 1.15); 
                    } else if (c1.target === 'disjoint') ok = dist > (r1 + r2 - 10);
                    else if (c1.target === 'overlap') ok = (dist < r1 + r2) && (dist > Math.abs(r1 - r2) + 15);
                    if(ok) { c1.isPlaced = true; c2.isPlaced = true; }
                }
            }
            SetTheoryEngine.state.dragging = null; SetTheoryEngine.draw();
        };
        canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); canvas.addEventListener('mouseup', end);
        canvas.addEventListener('touchstart', start, {passive: false}); canvas.addEventListener('touchmove', move, {passive: false}); canvas.addEventListener('touchend', end);
    },

    layoutChips: () => {
        const { width, height, chips, scale } = SetTheoryEngine.state;
        if(width===0) return;
        const gap = 55*scale; const startX = (width - ((chips.length-1)*gap))/2;
        chips.forEach((c,i) => { if(!c.isPlaced) { c.x = startX + i*gap; c.y = height - 40*scale; } });
    },
    
    layoutSets: () => {
        const { width, height, chips } = SetTheoryEngine.state;
        chips.forEach((c, i) => { if(c.isLocked) { c.x = width*0.3; c.y = height/2; } else if (!c.isPlaced) { c.x = width*0.7; c.y = height/2; } });
    },

    draw: () => {
        const { ctx, width, height, data, activeHighlight, scale, chips, inputs } = SetTheoryEngine.state;
        if(width<=0) return;
        ctx.clearRect(0,0,width,height);
        const s = scale; const pad = 15*s; 
        
        // --- GEOMETRY CLAMP ---
        // Prevent drawing too low on tall screens
        const cx = width/2; 
        const cy = Math.min(height/2, width*0.45) + 10*s; 

        // Responsive Radius
        const r = Math.max(10, Math.min((width-pad*2)*0.25, (height-pad*2)*0.35)); 
        const offset = r*0.65;
        
        const q = data.questions[SetTheoryEngine.state.currentStep];
        const isVisualDrag = q.interaction === 'DRAG_SETS';
        const isFilling = q.interaction === 'DIAGRAM_FILL';

        if (!isVisualDrag) {
            const isSingleSet = data.sets.B.label === "";
            const c1 = { x: isSingleSet ? cx : cx - offset, y: cy, r: r, color: data.sets.A.color };
            const c2 = { x: cx + offset, y: cy, r: r, color: data.sets.B.color };
            
            if(activeHighlight) {
                ctx.save(); ctx.fillStyle = "#fef9c3";
                if(activeHighlight==='intersection') { ctx.beginPath(); ctx.arc(c1.x,c1.y,r,0,Math.PI*2); ctx.clip(); ctx.beginPath(); ctx.arc(c2.x,c2.y,r,0,Math.PI*2); ctx.fill(); }
                else if(activeHighlight==='left_only') { ctx.beginPath(); ctx.arc(c1.x,c1.y,r,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='destination-out'; ctx.beginPath(); ctx.arc(c2.x,c2.y,r,0,Math.PI*2); ctx.fill(); }
                else if(activeHighlight==='right_only') { ctx.beginPath(); ctx.arc(c2.x,c2.y,r,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='destination-out'; ctx.beginPath(); ctx.arc(c1.x,c1.y,r,0,Math.PI*2); ctx.fill(); }
                else if(activeHighlight==='right_total') { ctx.beginPath(); ctx.arc(c2.x,c2.y,r,0,Math.PI*2); ctx.fill(); }
                else if(activeHighlight==='left_total') { ctx.beginPath(); ctx.arc(c1.x,c1.y,r,0,Math.PI*2); ctx.fill(); }
                else if(activeHighlight==='union') { ctx.beginPath(); ctx.arc(c1.x,c1.y,r,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(c2.x,c2.y,r,0,Math.PI*2); ctx.fill(); }
                ctx.restore();
            }

            ctx.strokeStyle="#cbd5e1"; ctx.lineWidth=2; ctx.strokeRect(pad,pad,width-pad*2,height-pad*2);
            ctx.fillStyle="#64748b"; ctx.font=`800 ${18*s}px sans-serif`; 
            const eps = (q.type === 'ALGEBRA_SOLVE' || isFilling) ? q.equation_target || 60 : '';
            ctx.fillText(eps ? `ξ=${eps}` : "ξ", pad+15*s, pad+25*s);

            ctx.lineWidth=3.5*s; ctx.strokeStyle=c1.color; ctx.beginPath(); ctx.arc(c1.x,c1.y,r,0,Math.PI*2); ctx.stroke();
            ctx.fillStyle=c1.color; ctx.textAlign="right"; ctx.fillText(data.sets.A.label, c1.x-r*0.6, c1.y-r*0.8);
            if(!isSingleSet) { ctx.strokeStyle=c2.color; ctx.beginPath(); ctx.arc(c2.x,c2.y,r,0,Math.PI*2); ctx.stroke(); ctx.fillStyle=c2.color; ctx.textAlign="left"; ctx.fillText(data.sets.B.label, c2.x+r*0.6, c2.y-r*0.8); }

            // DRAW STATIC TEXT 
            if(chips.length === 0) {
                ctx.font=`600 ${18*s}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillStyle="#1e293b";
                
                const drawZone = (arr, bx, by, regionName) => {
                    if(!arr || arr.length===0) return;
                    if (isFilling && q.inputs.some(i => i.region === regionName)) return;
                    
                    arr.forEach((v,i) => {
                        const shift = (arr.length > 1) ? ((i-(arr.length-1)/2) * 15 * s) : 0;
                        ctx.fillText(String(v), bx, by+shift);
                    });
                };

                if(isSingleSet) drawZone(data.zones.center, cx, cy, 'center');
                else {
                    drawZone(data.zones.left, c1.x-r*0.4, cy, 'left');
                    drawZone(data.zones.right, c2.x+r*0.4, cy, 'right');
                    drawZone(data.zones.center, cx, cy, 'center');
                }
                // Anchor "Outside" text relative to circles, not bottom of screen
                drawZone(data.zones.outside, cx + r + 30*s, cy + r + 30*s, 'outside');
            }
        }

        if(chips.length > 0) {
            chips.forEach(c => {
                 if(c.x===0 && c.y===0 && !c.isPlaced) { if(isVisualDrag) SetTheoryEngine.layoutSets(); else SetTheoryEngine.layoutChips(); }
                 ctx.save(); ctx.translate(c.x, c.y);
                 ctx.beginPath(); ctx.arc(0,0,c.radius*s,0,Math.PI*2);
                 if(c.customColor) { ctx.fillStyle=c.customColor; ctx.fill(); ctx.lineWidth=3; ctx.stroke(); }
                 else { if(c.isPlaced) { ctx.fillStyle='#dcfce7'; ctx.strokeStyle='#15803d'; } else { ctx.fillStyle='#f3e8ff'; ctx.strokeStyle='#9333ea'; } ctx.fill(); ctx.lineWidth=2; ctx.stroke(); }
                 ctx.fillStyle=c.customColor?'#9333ea':'#0f172a'; ctx.font=`bold ${c.customColor?24*s:16*s}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(c.val), 0, 0);
                 ctx.restore();
            });
        }
    }
};

window.ManyaSetHandler = (val) => SetTheoryEngine.handleInput(val);