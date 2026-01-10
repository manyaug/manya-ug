/**
 * Manya Set Theory Engine (Final Master)
 * Features:
 * 1. Logic: Algebra (x), Sums, Counts, Subsets, Binary Choice.
 * 2. Interaction: Drag Chips (Sorting) AND Drag Sets (Visual Relations).
 * 3. Physics: Circle-Circle Collision detection for Subset/Disjoint verification.
 * 4. UI: Mobile-First, Responsive, State Retention.
 */
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
            .set-root { display: flex; flex-direction: column; height: 100dvh; width: 100%; background: #f8fafc; overflow: hidden; position: relative; }
            .canvas-wrapper { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; position: relative; background: radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%); padding: 5px; touch-action: none; }
            canvas { box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-radius: 20px; background: white; max-width: 100%; max-height: 100%; object-fit: contain; }
            .hint-pill { position: absolute; top: 15px; right: 15px; background: white; border: 1px solid #e2e8f0; padding: 6px 14px; border-radius: 30px; font-size: 11px; font-weight: 800; color: var(--manya-purple); box-shadow: 0 4px 12px rgba(0,0,0,0.05); cursor: pointer; transition: 0.2s; z-index: 20; display: flex; align-items: center; gap: 6px; }
            .control-card { flex-shrink: 0; background: white; padding: 16px 20px 24px 20px; padding-bottom: max(20px, env(safe-area-inset-bottom)); border-top-left-radius: 24px; border-top-right-radius: 24px; box-shadow: 0 -10px 40px rgba(0,0,0,0.08); z-index: 30; display: flex; flex-direction: column; gap: 12px; }
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

    renderLabeling: (container, data) => {
        SetTheoryEngine.injectStyles();
        
        // Reset State
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

        // --- INTERACTION LOGIC ---
        if (q.interaction === 'DRAG_SORT' || q.interaction === 'DRAG_SETS') {
            // Load items as chips
            // Map JSON properties to Chip State
            SetTheoryEngine.state.chips = q.items.map(item => ({
                val: item.val, 
                target: item.target, 
                x: 0, y: 0, 
                isPlaced: false, 
                radius: item.radius || 22, // Default small, override for big sets
                customColor: item.color,   // For big sets
                isLocked: item.locked || false, // Static sets
                currentRegion: null
            }));

            // Trigger Layout
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

    // --- LAYOUT LOGIC FOR SMALL CHIPS ---
    layoutChips: () => {
        const { width, height, chips, scale } = SetTheoryEngine.state;
        if(width === 0) return;

        const pad = 10 * scale;
        const r = Math.max(10, Math.min((width-pad*2)*0.28, (height-pad*2)*0.35)); 
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

    // --- LAYOUT LOGIC FOR BIG SETS (DRAG_SETS) ---
    layoutSets: () => {
        const { width, height, chips } = SetTheoryEngine.state;
        // Place locked item on left, draggable on right (responsive)
        chips.forEach((c, i) => {
            if(c.isLocked) {
                c.x = width * 0.35; 
                c.y = height / 2;
            } else if (!c.isPlaced) {
                c.x = width * 0.7; 
                c.y = height / 2;
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
        
        // --- DRAG SETS LOGIC (Math Verification) ---
        // ... inside handleInput ...
        
        // --- DRAG SETS LOGIC (Math Verification) ---
        if (q.interaction === 'DRAG_SETS') {
            // FIX: Don't rely on 'isLocked'. Just take the two circles.
            const c1 = SetTheoryEngine.state.chips[0];
            const c2 = SetTheoryEngine.state.chips[1];
            
            if (!c1 || !c2) return; // Safety check

            // Calculate Euclidean Distance between centers
            const dist = Math.sqrt(Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2));
            
            // Get visual radii (must apply scale to match what user sees)
            const s = SetTheoryEngine.state.scale;
            const r1 = c1.radius * s; 
            const r2 = c2.radius * s; 

            // 1. SUBSET LOGIC (One inside another)
            // Look for specific target flag, or check both ways
            if (c2.target === 'inside_F' || c1.target === 'inside_F') {
                // Determine which is the container (larger radius)
                const container = r1 > r2 ? c1 : c2;
                const content = r1 > r2 ? c2 : c1;
                const rBig = r1 > r2 ? r1 : r2;
                const rSmall = r1 > r2 ? r2 : r1;
                
                // Logic: Distance + SmallRadius must be <= BigRadius
                // Added 15% buffer (* 1.15) to make it easier to drop
                isCorrect = (dist + rSmall) <= (rBig * 1.15); 
            } 
            
            // 2. DISJOINT LOGIC (Separate)
            else if (c1.target === 'disjoint') {
                // Distance must be greater than sum of radii (they don't touch)
                // Subtract 10px buffer so they can barely touch and still pass
                isCorrect = dist > (r1 + r2 - 10);
            } 
            
            // 3. INTERSECTION LOGIC (Overlap)
            else if (c1.target === 'overlap') {
                // Must overlap: Distance < Sum of Radii
                const overlaps = dist < (r1 + r2);
                // Must NOT be subset: Distance > Abs(Diff of Radii)
                // (One circle shouldn't be fully inside the other)
                const notSubset = dist > Math.abs(r1 - r2) + 15; // +15px safety buffer
                
                isCorrect = overlaps && notSubset;
            }
            
            // Visual feedback: If correct, snap them to "Placed" state
            if(isCorrect) {
                c1.isPlaced = true;
                c2.isPlaced = true;
            }
        } 
        
        
        else if (q.interaction === 'DRAG_SORT') {
            isCorrect = SetTheoryEngine.state.chips.every(c => c.isPlaced && c.currentRegion === c.target);
        } 
        else if (q.interaction === 'BINARY') {
            isCorrect = val === q.expected;
        } 
        else {
            // ... (Standard Algebra/Count Logic as before) ...
            const input = document.getElementById('user-ans').value.trim();
            const zones = SetTheoryEngine.state.data.zones;
            let correctData = [];
            
            // Map regions...
            if(q.targetRegion === 'intersection') correctData = zones.center;
            else if(q.targetRegion === 'left_only') correctData = zones.left;
            else if(q.targetRegion === 'right_only') correctData = zones.right;
            else if(q.targetRegion === 'union') correctData = [...zones.left, ...zones.center, ...zones.right];
            else if(q.targetRegion === 'left_total') correctData = [...zones.center, ...zones.left];
            else if(q.targetRegion === 'right_total') correctData = [...zones.center, ...zones.right];
            else if(q.targetRegion === 'symmetric_difference') correctData = [...zones.left, ...zones.right];

            if (q.type === 'COUNT') isCorrect = parseInt(input) === correctData.length;
            else if (q.type === 'LIST') {
                const cleanInput = input.replace(/[{}]/g, '').split(/[\s,]+/).map(n => isNaN(parseInt(n)) ? n : parseInt(n)).sort();
                const correctArr = correctData.map(n => isNaN(parseInt(n)) ? n : parseInt(n)).sort();
                isCorrect = JSON.stringify(cleanInput) === JSON.stringify(correctArr);
            }
            else if (q.type === 'SUBSET_COUNT') isCorrect = parseInt(input) === Math.pow(2, correctData.length);
            else if (q.type === 'IS_SUBSET') isCorrect = input.toLowerCase() === q.expected;
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
            else if (q.type === 'PROPER_SUBSET_COUNT') {
                // Formula: (2^n) - 1
                isCorrect = parseInt(input) === (Math.pow(2, correctData.length) - 1);
            }
            else if (q.type === 'REVERSE_SUBSET') {
                // Basic number comparison for "Find n" questions
                isCorrect = parseInt(input) === q.expected_val;
            }
                else if (q.type === 'REVERSE_PROPER_SUBSET') {
                // Formula: (2^n) - 1 = InputValue -> 2^n = InputValue + 1
                // We expect user to input 'n'.
                // Logic: isCorrect = parseInt(input) === expected_val
                // This is mathematically identical to REVERSE_SUBSET logic-wise (comparing against expected N)
                // but semantically different.
                isCorrect = parseInt(input) === q.expected_val;
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
            
            // Find Top-Most Clicked Item
            // Reverse iteration to find top item first
            const chip = [...SetTheoryEngine.state.chips].reverse().find(c => {
                if (c.isLocked) return false;
                // Hit detection considers scale and specific radius
                return Math.hypot(c.x - pos.x, c.y - pos.y) < (c.radius * SetTheoryEngine.state.scale * 1.3); // 1.3x Hit Area
            });

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

            // Only snap to zones if it's DRAG_SORT (not free visual relations)
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
                chip.isPlaced = true; // Snap attempt
            }
            
            SetTheoryEngine.state.dragging = null;
            SetTheoryEngine.draw();
        };

        canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); canvas.addEventListener('mouseup', end);
        canvas.addEventListener('touchstart', start, {passive: false}); canvas.addEventListener('touchmove', move, {passive: false}); canvas.addEventListener('touchend', end);
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
            
            const q = SetTheoryEngine.state.data?.questions[SetTheoryEngine.state.currentStep];
            if(SetTheoryEngine.state.chips.length > 0) {
                if (q && q.interaction === 'DRAG_SETS') SetTheoryEngine.layoutSets();
                else SetTheoryEngine.layoutChips();
            }
            SetTheoryEngine.draw();
        };
        new ResizeObserver(() => requestAnimationFrame(handleResize)).observe(document.getElementById('canvas-mount'));
    },

    toggleHint: () => {
        const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
        SetTheoryEngine.state.activeHighlight = SetTheoryEngine.state.activeHighlight ? null : q.targetRegion;
        SetTheoryEngine.draw();
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

        // --- DRAW BACKGROUND CIRCLES (Only if NOT DRAG_SETS) ---
        // DRAG_SETS draws its own circles via chips
        const q = data.questions[SetTheoryEngine.state.currentStep];
        const isVisualDrag = q.interaction === 'DRAG_SETS';

        if (!isVisualDrag) {
            const isSingleSet = data.sets.B.label === "";
            const c1 = { x: isSingleSet ? cx : cx - offset, y: cy, r: r, color: data.sets.A.color };
            const c2 = { x: cx + offset, y: cy, r: r, color: data.sets.B.color };

            if (activeHighlight) {
                ctx.save(); ctx.fillStyle = "#fef9c3";
                // ... (Highlight Logic from previous versions) ...
                if (activeHighlight === 'intersection') { ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.clip(); ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill(); }
                // ... (abbreviated for length, paste previously correct highlight logic here) ...
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
            
            // Draw Static Numbers
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

        // --- DRAW CHIPS ---
        if(chips.length > 0) {
            chips.forEach(c => {
                if(c.x === 0 && c.y === 0 && !c.isPlaced && !q.items[0].x) {
                    if (isVisualDrag) SetTheoryEngine.layoutSets(); else SetTheoryEngine.layoutChips();
                }
                
                ctx.save();
                ctx.translate(c.x, c.y);
                
                // 1. VISUAL SETS (Big Circles)
                if (c.customColor) {
                    ctx.beginPath(); ctx.arc(0, 0, c.radius * s, 0, Math.PI*2);
                    ctx.fillStyle = c.customColor; ctx.fill();
                    ctx.strokeStyle = '#9333ea'; ctx.lineWidth = 3; ctx.stroke();
                    ctx.fillStyle = '#9333ea'; ctx.font = `bold ${24*s}px sans-serif`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(String(c.val), 0, 0);
                } 
                // 2. LOCKED TEXT (Persistent)
                else if (c.isLocked) {
                    ctx.fillStyle = '#1e293b'; ctx.font = `bold ${20*s}px sans-serif`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(String(c.val), 0, 0);
                } 
                // 3. DRAGGABLE CHIPS
                else {
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