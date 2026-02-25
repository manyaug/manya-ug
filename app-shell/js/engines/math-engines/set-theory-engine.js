/**
 * MANYA SET THEORY ENGINE (v36.0 - The Complete Unabridged Master)
 * 
 * CORE FEATURES:
 * - SHADING ENGINE: Precise region coloring (Union, Intersection, etc.) via Atomic Masking.
 * - MATH BRAIN: Algebra solving, 2^n Subsets, Fraction-aware Probability.
 * - INTERACTIONS: Choice, Binary, Diagram Fill, Drag Sort (Elements), Drag Sets (Circles).
 * - UI: Auto-scaling, Anti-Clipping Labels, Mobile HUD Integration.
 */

export const SetTheoryEngine = {
    state: { 
        ctx: null, width: 0, height: 0, scale: 1,
        currentStep: 0, isResolved: false, data: null, activeHighlight: null,
        chips: [], dragging: null, dragOffset: {x:0,y:0},
        inputs: [], selectedRegions: new Set(), currentSum: 0,
        tempCanvas: null, tempCtx: null 
    },

    // --- 1. GLOBAL STYLES ---
    injectStyles: () => {
        if (document.getElementById('set-theory-styles')) return;
        const style = document.createElement('style');
        style.id = 'set-theory-styles';
        style.innerHTML = `
            .set-root { position: absolute; inset: 0; display: flex; flex-direction: column; background: #f8fafc; overflow: hidden; user-select: none; }
            .canvas-wrapper { flex: 1; min-height: 0; position: relative; width: 100%; background: #fff; touch-action: none; }
            canvas { display: block; width: 100%; height: 100%; }
            
            .venn-input { 
                position: absolute; transform: translate(-50%, -50%); 
                width: 58px; height: 38px; border: 2.5px solid #cbd5e1; 
                border-radius: 12px; text-align: center; font-weight: 900; 
                font-size: 16px; background: white; z-index: 50; outline: none; 
            }
            .venn-input:focus { border-color: #7c3aed; box-shadow: 0 0 15px rgba(124, 58, 237, 0.3); }
            .venn-input.correct { border-color: #22c55e; background: #f0fdf4; color: #16a34a; pointer-events: none; }
            .venn-input.wrong { border-color: #ef4444; background: #fef2f2; animation: set-shake 0.3s; }

            .hud { flex: 0 0 auto; background: white; padding: 20px; border-top: 2px solid #f1f5f9; display: flex; flex-direction: column; gap: 12px; z-index: 100; box-shadow: 0 -10px 40px rgba(0,0,0,0.05); }
            .q-text { font-size: 1.1rem; font-weight: 800; color: #1e293b; text-align: center; line-height: 1.4; margin-bottom: 5px; }
            .feedback-msg { text-align: center; font-size: 14px; font-weight: 800; height: 20px; }
            
            .set-entry-box { width: 100%; height: 54px; font-size: 1.6rem; text-align: center; font-weight: 900; border: 3px solid #e2e8f0; border-radius: 16px; outline: none; color: #1e293b; background: #f8fafc; transition: all 0.2s; user-select: text; -webkit-user-select: text; }
            .set-entry-box:focus { border-color: #7c3aed; background: white; box-shadow: 0 0 0 5px rgba(124, 58, 237, 0.1); }

            .set-check-btn { width: 100%; height: 56px; background: #7c3aed; color: white; border: none; border-radius: 18px; font-weight: 800; font-size: 17px; cursor: pointer; box-shadow: 0 5px 0 #5b21b6; }
            .set-check-btn.success { background: #22c55e; box-shadow: 0 5px 0 #16a34a; }
            .set-check-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 #5b21b6; }

            .btn-choice { width: 100%; padding: 14px; border-radius: 14px; border: 2.5px solid #e2e8f0; background: #f8fafc; color: #475569; font-weight: 800; font-size: 1rem; cursor: pointer; transition: 0.2s; outline: none; }
            .btn-choice.correct { background: #dcfce7 !important; border-color: #22c55e !important; color: #15803d !important; }
            .btn-choice.wrong { background: #fee2e2 !important; border-color: #ef4444 !important; color: #b91c1c !important; }

            .hint-tag { position: absolute; top: 15px; right: 15px; background: white; border: 2px solid #e2e8f0; padding: 8px 15px; border-radius: 30px; font-size: 11px; font-weight: 800; color: #7c3aed; cursor: pointer; z-index: 200; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .sum-display { text-align: center; font-size: 1.2rem; font-weight: 900; color: #7c3aed; background: #f3e8ff; padding: 10px; border-radius: 12px; }

            @keyframes set-shake { 0%, 100% { transform: translate(-50%, -50%); } 25% { transform: translate(-55%, -50%); } 75% { transform: translate(-45%, -50%); } }
        `;
        document.head.appendChild(style);
    },

    // --- 2. ENGINE INITIALIZATION ---
    renderLabeling: (container, data) => {
        SetTheoryEngine.injectStyles();
        SetTheoryEngine.state.data = JSON.parse(JSON.stringify(data)); 
        SetTheoryEngine.state.currentStep = 0;
        SetTheoryEngine.state.isResolved = false;
        
        SetTheoryEngine.state.tempCanvas = document.createElement('canvas');
        SetTheoryEngine.state.tempCtx = SetTheoryEngine.state.tempCanvas.getContext('2d');

        container.innerHTML = `
            <div class="set-root">
                <div class="canvas-wrapper" id="set-canvas-mount">
                    <button class="hint-tag" onclick="window.ManyaSetHint()">💡 HINT</button>
                    <canvas id="set-canvas"></canvas>
                    <div id="diagram-inputs"></div>
                </div>
                <div class="hud">
                    <div id="set-q-display" class="q-text"></div>
                    <div id="set-dynamic-controls"></div>
                    <div id="set-feedback" class="feedback-msg"></div>
                </div>
            </div>
        `;

        const canvas = document.getElementById('set-canvas');
        SetTheoryEngine.state.ctx = canvas.getContext('2d');
        SetTheoryEngine.initInputListeners(canvas);
        
        const resize = () => {
            const wrapper = document.getElementById('set-canvas-mount');
            if(!wrapper) return;
            const rect = wrapper.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 2;
            canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
            SetTheoryEngine.state.tempCanvas.width = canvas.width;
            SetTheoryEngine.state.tempCanvas.height = canvas.height;
            SetTheoryEngine.state.scale = dpr;
            SetTheoryEngine.state.width = canvas.width; 
            SetTheoryEngine.state.height = canvas.height;
            SetTheoryEngine.draw();
            SetTheoryEngine.updateInputPositions();
        };

        new ResizeObserver(resize).observe(document.getElementById('set-canvas-mount'));
        SetTheoryEngine.loadQuestion();
    },

    // --- 3. QUESTION LOADER ---
    loadQuestion: () => {
        const s = SetTheoryEngine.state;
        const q = s.data.questions[s.currentStep];
        
        document.getElementById('set-q-display').innerHTML = q.prompt;
        document.getElementById('set-feedback').innerText = "";
        
        const controls = document.getElementById('set-dynamic-controls');
        const inputContainer = document.getElementById('diagram-inputs');
        
        inputContainer.innerHTML = '';
        controls.innerHTML = ''; 
        s.inputs = [];
        s.isResolved = false;
        s.selectedRegions.clear();

        // Shading Logic: Pre-highlight regions if specified in JSON
        if (q.targetRegion && q.interaction !== 'CLICK_SUM') {
            s.activeHighlight = q.targetRegion;
        } else {
            s.activeHighlight = null;
        }

        // Branch 1: Visual Intersection (DRAG_SETS)
        if (q.interaction === 'DRAG_SETS') {
            s.chips = [
                { val: s.data.sets.A.label, target: "overlap", x: s.width * 0.35, y: s.height * 0.45, radius: 60, isLocked: false, color: s.data.sets.A.color },
                { val: s.data.sets.B.label, target: "overlap", x: s.width * 0.65, y: s.height * 0.45, radius: 60, isLocked: false, color: s.data.sets.B.color }
            ];
            controls.innerHTML = `<div style="text-align:center; color:#64748b; font-size:14px; font-weight:700;">Drag the sets together to show overlap!</div>`;
        } 
        // Branch 2: Choice Buttons
        else if (q.interaction === 'CHOICE') {
            controls.innerHTML = `<div style="display:grid; gap:8px;">${q.options.map((o, i) => `
                <button class="btn-choice" id="set-opt-${i}" onclick="window.ManyaSetHandler(${i})">${o}</button>
            `).join('')}</div>`;
        }
        // Branch 3: Binary Yes/No
        else if (q.interaction === 'BINARY') {
            controls.innerHTML = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button class="btn-choice" onclick="window.ManyaSetHandler('yes')">YES</button>
                <button class="btn-choice" onclick="window.ManyaSetHandler('no')">NO</button>
            </div>`;
        }
        // Branch 4: Region Click to Sum
        else if (q.interaction === 'CLICK_SUM') {
            controls.innerHTML = `
                <div class="sum-display" id="sum-val-display">Sum: 0</div>
                <button class="set-check-btn" onclick="window.ManyaSetHandler()" style="margin-top:10px;">CHECK SUM</button>
            `;
        }
        // Branch 5: Input Fields inside Diagram
        else if (q.interaction === 'DIAGRAM_FILL') {
            q.inputs.forEach(inputDef => {
                const el = document.createElement('input');
                el.className = 'venn-input';
                el.dataset.region = inputDef.region;
                el.placeholder = "?";
                inputContainer.appendChild(el);
                s.inputs.push(el);
            });
            controls.innerHTML = `<button class="set-check-btn" onclick="window.ManyaSetHandler()">CHECK DIAGRAM</button>`;
        }
        // Branch 6: Standard Entry
        else {
            controls.innerHTML = `
                <input type="text" id="set-user-entry" class="set-entry-box" placeholder="Enter answer..." autocomplete="off">
                <button class="set-check-btn" onclick="window.ManyaSetHandler()" style="margin-top:10px;">CHECK ANSWER</button>
            `;
            setTimeout(() => { const inp = document.getElementById('set-user-entry'); if(inp) inp.focus(); }, 100);
        }

        // Draggable items setup
        if (q.items && q.interaction !== 'DRAG_SETS') {
            s.chips = q.items.map(it => ({
                ...it, x: 0, y: 0, isPlaced: false, radius: 24, isLocked: false, currentRegion: null
            }));
        } else if (!q.retain_visuals && q.interaction !== 'DRAG_SETS') {
            s.chips = [];
        }
        
        SetTheoryEngine.draw();
        SetTheoryEngine.updateInputPositions();
    },

    // --- 4. SHADING & DRAWING ENGINE ---
    
    // ATOMIC SHADING: The fix for precise region coloring
    drawAtomicRegion: (tCtx, region, c1, c2, r, w, h, pad) => {
        tCtx.save(); tCtx.clearRect(0,0,w,h); 
        tCtx.fillStyle = "rgba(124, 58, 237, 0.2)"; // Soft purple shading
        
        if (region === 'center') {
            tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tCtx.clip();
            tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tCtx.fill();
        } else if (region === 'left') {
            tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tCtx.fill();
            tCtx.globalCompositeOperation = 'destination-out';
            tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tCtx.fill();
        } else if (region === 'right') {
            tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tCtx.fill();
            tCtx.globalCompositeOperation = 'destination-out';
            tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tCtx.fill();
        } else if (region === 'outside') {
            tCtx.beginPath(); tCtx.rect(pad, pad, w-pad*2, h-pad*2); tCtx.fill();
            tCtx.globalCompositeOperation = 'destination-out';
            tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tCtx.fill();
        }
        tCtx.restore();
    },

    calculateLayout: () => {
        const { width, height, scale, data } = SetTheoryEngine.state;
        const s = scale; const pad = 25 * s;
        const cx = width / 2; const cy = height * 0.42; 
        const isSingleSet = !data.sets.B || data.sets.B.label === "";
        const r = Math.min(width * 0.22, height * 0.32);
        const offset = isSingleSet ? 0 : r * 0.75;
        return { c1: { x: cx - offset, y: cy, r, color: data.sets.A.color }, c2: { x: cx + offset, y: cy, r, color: data.sets.B.color }, cx, cy, r, pad, s, isSingleSet };
    },

    draw: () => {
        const { ctx, data, chips, scale, width, height, currentStep, selectedRegions, activeHighlight } = SetTheoryEngine.state;
        if (!ctx || width <= 0) return;
        
        const q = data.questions[currentStep];
        const layout = SetTheoryEngine.calculateLayout();
        const { c1, c2, r, pad, s, isSingleSet } = layout;

        ctx.clearRect(0, 0, width, height);

        // A. Handle Shading (Atomic Layering)
        const tCtx = SetTheoryEngine.state.tempCtx;
        if (tCtx && (activeHighlight || selectedRegions.size > 0)) {
            // Helper to check if an atomic region should be colored
            const shouldColor = (reg) => (activeHighlight === reg) || selectedRegions.has(reg) || 
                                       (activeHighlight==='union' && ['left','center','right'].includes(reg)) ||
                                       (activeHighlight==='intersection' && reg==='center') ||
                                       (activeHighlight==='left_total' && ['left','center'].includes(reg)) ||
                                       (activeHighlight==='right_total' && ['right','center'].includes(reg)) ||
                                       (activeHighlight==='symmetric_difference' && ['left','right'].includes(reg)) ||
                                       (activeHighlight==='complement_left' && ['right','outside'].includes(reg));

            ['left', 'center', 'right', 'outside'].forEach(atomic => {
                if (shouldColor(atomic)) {
                    SetTheoryEngine.drawAtomicRegion(tCtx, atomic, c1, c2, r, width, height, pad);
                    ctx.drawImage(SetTheoryEngine.state.tempCanvas, 0, 0);
                }
            });
        }

        // B. DRAG_SETS Mode (Custom Visual)
        if (q.interaction === 'DRAG_SETS') {
            chips.forEach(c => {
                ctx.lineWidth = 5 * s; ctx.strokeStyle = c.color || "#22c55e";
                ctx.beginPath(); ctx.arc(c.x, c.y, c.radius * s, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = c.color || "#22c55e"; ctx.font = `900 ${22*s}px sans-serif`;
                ctx.textAlign = "center"; ctx.fillText(c.val, c.x, c.y + 7*s);
            });
            return; 
        }

        // C. Standard Diagram Rendering
        ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 2 * s;
        ctx.strokeRect(pad, pad, width - pad*2, height - pad*2);
        ctx.fillStyle = "#64748b"; ctx.font = `900 ${18 * s}px sans-serif`; ctx.textAlign="left";
        const totalSymbol = q.equation_target || "";
        ctx.fillText(totalSymbol ? `ξ=${totalSymbol}` : "ξ", pad + 12*s, pad + 25*s);

        ctx.lineWidth = 4 * s;
        ctx.strokeStyle = c1.color; ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = c1.color; ctx.font = `800 ${16*s}px sans-serif`; ctx.textAlign = "center";
        ctx.fillText(data.sets.A.label, c1.x, c1.y - r - (12*s));

        if (!isSingleSet) {
            ctx.strokeStyle = c2.color; ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.stroke();
            ctx.fillStyle = c2.color; ctx.fillText(data.sets.B.label, c2.x, c2.y - r - (12*s));
        }

        // D. Elements / Text
        if (chips.length === 0) {
            ctx.fillStyle = "#1e293b"; ctx.font = `bold ${17 * s}px sans-serif`;
            const drawZone = (arr, x, y, regionName) => {
                if (!arr || arr.length === 0) return;
                if (q.interaction === 'DIAGRAM_FILL' && q.inputs.some(i => i.region === regionName)) return;
                arr.forEach((val, i) => {
                    const offset = (i - (arr.length - 1) / 2) * (24 * s);
                    ctx.fillText(String(val), x, y + offset);
                });
            };
            if (isSingleSet) drawZone(data.zones.center, layout.cx, layout.cy, 'center');
            else {
                drawZone(data.zones.left, c1.x - (r * 0.45), layout.cy, 'left');
                drawZone(data.zones.right, c2.x + (r * 0.45), layout.cy, 'right');
                drawZone(data.zones.center, layout.cx, layout.cy, 'center');
            }
            drawZone(data.zones.outside, width - pad - 45*s, height - pad - 45*s, 'outside');
        }

        // E. Draggable Chips
        chips.forEach(c => {
            if(c.x === 0) SetTheoryEngine.layoutChips();
            ctx.save(); ctx.translate(c.x, c.y);
            ctx.beginPath(); ctx.arc(0,0,c.radius*s,0,Math.PI*2);
            ctx.fillStyle = c.isPlaced ? '#dcfce7' : '#f3e8ff'; ctx.fill();
            ctx.strokeStyle = c.isPlaced ? '#16a34a' : '#7c3aed'; ctx.lineWidth = 2.5*s; ctx.stroke();
            ctx.fillStyle = '#0f172a'; ctx.font = `bold ${16*s}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(String(c.val), 0, 0);
            ctx.restore();
        });
    },

    // --- 5. LOGIC & POSITIONING ---
    updateInputPositions: () => {
        const layout = SetTheoryEngine.calculateLayout();
        const { s, r, c1, c2, cx, cy } = layout;
        SetTheoryEngine.state.inputs.forEach(el => {
            const reg = el.dataset.region;
            let x = cx, y = cy;
            if (reg === 'left') x = c1.x - (r * 0.45);
            if (reg === 'right') x = c2.x + (r * 0.45);
            if (reg === 'outside') { x = SetTheoryEngine.state.width - 60*s; y = SetTheoryEngine.state.height - 60*s; }
            el.style.left = `${x / s}px`; el.style.top = `${y / s}px`;
        });
    },

    layoutChips: () => {
        const { width, height, chips, scale } = SetTheoryEngine.state;
        const gap = 60 * scale;
        const startX = (width - ((chips.length-1) * gap)) / 2;
        chips.forEach((c, i) => { if (!c.isPlaced) { c.x = startX + i * gap; c.y = height - 50 * scale; } });
    },

    evaluateAlgebra: (expression, varValue) => {
        try {
            const clean = expression.toString().replace(/[xwp]/g, varValue);
            return Function(`'use strict'; return (${clean})`)();
        } catch (e) { return expression; }
    },

    handleInput: (val) => {
        const s = SetTheoryEngine.state;
        const q = s.data.questions[s.currentStep];
        const z = s.data.zones;

        if (s.isResolved) {
            if (s.currentStep < s.data.questions.length - 1) {
                s.currentStep++; SetTheoryEngine.loadQuestion();
            } else { window.QuestRunner.next(); }
            return;
        }

        let isCorrect = false;
        const normalize = (t) => t.toString().toLowerCase().replace(/\s/g, '');

        if (q.interaction === 'DRAG_SETS') {
            const dist = Math.hypot(s.chips[0].x - s.chips[1].x, s.chips[0].y - s.chips[1].y);
            if (dist < (s.chips[0].radius + s.chips[1].radius) * s.scale * 0.85) isCorrect = true;
        } 
        else if (q.interaction === 'DIAGRAM_FILL') {
            isCorrect = s.inputs.every(inp => {
                const def = q.inputs.find(d => d.region === inp.dataset.region);
                const match = normalize(inp.value) === normalize(def.expected);
                inp.classList.add(match ? 'correct' : 'wrong');
                if (match) s.data.zones[def.region] = [def.expected];
                return match;
            });
        }
        else if (q.interaction === 'CLICK_SUM') {
            const sum = Array.from(s.selectedRegions).reduce((acc, reg) => {
                return acc + (z[reg] ? z[reg].reduce((a, b) => a + (parseInt(b) || 0), 0) : 0);
            }, 0);
            isCorrect = sum === (q.expected_sum || q.equation_target);
        }
        else if (q.interaction === 'CHOICE') {
            isCorrect = q.options[val] === q.expected;
            document.getElementById(`set-opt-${val}`)?.classList.add(isCorrect ? 'correct' : 'wrong');
        }
        else {
            const userAns = document.getElementById('set-user-entry')?.value.trim().toLowerCase();
            let targetSet = [];
            if(q.targetRegion === 'intersection') targetSet = z.center;
            else if(q.targetRegion === 'left_only') targetSet = z.left;
            else if(q.targetRegion === 'right_only') targetSet = z.right;
            else if(q.targetRegion === 'union') targetSet = [...z.left, ...z.center, ...z.right];
            else if(q.targetRegion === 'left_total') targetSet = [...z.left, ...z.center];
            else if(q.targetRegion === 'right_total') targetSet = [...z.right, ...z.center];

            if (q.type === 'COUNT') isCorrect = parseInt(userAns) === targetSet.length;
            else if (q.type === 'SUBSET_COUNT') isCorrect = parseInt(userAns) === Math.pow(2, targetSet.length);
            else if (q.type === 'ALGEBRA_SOLVE') {
                isCorrect = parseInt(userAns) === q.expected_x;
                if (isCorrect) {
                    ['left', 'center', 'right', 'outside'].forEach(zone => {
                        if (s.data.zones[zone]) s.data.zones[zone] = s.data.zones[zone].map(e => SetTheoryEngine.evaluateAlgebra(e, q.expected_x));
                    });
                }
            }
            else isCorrect = normalize(userAns) === normalize(q.expected);
        }

        const feedback = document.getElementById('set-feedback');
        const checkBtn = document.querySelector('.set-check-btn');

        if (isCorrect) {
            feedback.innerText = "🌟 Excellent!"; feedback.style.color = "#16a34a";
            s.isResolved = true;
            if (checkBtn) { checkBtn.innerText = "CONTINUE →"; checkBtn.classList.add('success'); }
        } else {
            feedback.innerText = "Try again!"; feedback.style.color = "#ef4444";
        }
    },

    initInputListeners: (canvas) => {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const cx = e.touches ? e.touches[0].clientX : e.clientX;
            const cy = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: (cx - rect.left) * (SetTheoryEngine.state.width / rect.width), y: (cy - rect.top) * (SetTheoryEngine.state.height / rect.height) };
        };

        canvas.addEventListener('mousedown', (e) => {
            if (SetTheoryEngine.state.isResolved) return;
            const p = getPos(e);
            const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
            
            if (q.interaction === 'CLICK_SUM') {
                const layout = SetTheoryEngine.calculateLayout();
                const d1 = Math.hypot(p.x - layout.c1.x, p.y - layout.c1.y);
                const d2 = Math.hypot(p.x - layout.c2.x, p.y - layout.c2.y);
                let reg = (d1 < layout.r && d2 < layout.r) ? 'center' : (d1 < layout.r ? 'left' : (d2 < layout.r ? 'right' : 'outside'));
                if (SetTheoryEngine.state.selectedRegions.has(reg)) SetTheoryEngine.state.selectedRegions.delete(reg);
                else SetTheoryEngine.state.selectedRegions.add(reg);
                SetTheoryEngine.draw();
                return;
            }

            const chip = [...SetTheoryEngine.state.chips].reverse().find(c => !c.isLocked && Math.hypot(c.x-p.x, c.y-p.y) < c.radius * 2 * SetTheoryEngine.state.scale);
            if (chip) { SetTheoryEngine.state.dragging = chip; SetTheoryEngine.state.dragOffset = { x: p.x - chip.x, y: p.y - chip.y }; }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!SetTheoryEngine.state.dragging) return;
            e.preventDefault();
            const p = getPos(e);
            SetTheoryEngine.state.dragging.x = p.x - SetTheoryEngine.state.dragOffset.x;
            SetTheoryEngine.state.dragging.y = p.y - SetTheoryEngine.state.dragOffset.y;
            SetTheoryEngine.draw();
            if (SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep].interaction === 'DRAG_SETS') SetTheoryEngine.handleInput(); 
        });

        canvas.addEventListener('mouseup', () => {
            if (!SetTheoryEngine.state.dragging) return;
            const chip = SetTheoryEngine.state.dragging;
            const layout = SetTheoryEngine.calculateLayout();
            const d1 = Math.hypot(chip.x - layout.c1.x, chip.y - layout.c1.y);
            const d2 = Math.hypot(chip.x - layout.c2.x, chip.y - layout.c2.y);
            chip.currentRegion = (d1 < layout.r && d2 < layout.r) ? 'center' : (d1 < layout.r ? 'left' : (d2 < layout.r ? 'right' : 'outside'));
            chip.isPlaced = true; SetTheoryEngine.state.dragging = null; SetTheoryEngine.draw();
        });

        canvas.addEventListener('touchstart', (e) => { 
            const t = e.touches[0];
            canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY }));
        }, {passive: false});
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const t = e.touches[0];
            canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY }));
        }, {passive: false});
        
        canvas.addEventListener('touchend', () => {
            canvas.dispatchEvent(new MouseEvent('mouseup', {}));
        });
    }
};

// Global Helpers
window.ManyaSetHint = () => {
    const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
    document.getElementById('set-feedback').innerHTML = `<span style="color:#7c3aed">💡 ${q.hint || 'Examine the diagram carefully.'}</span>`;
};

window.ManyaSetHandler = (val) => SetTheoryEngine.handleInput(val);