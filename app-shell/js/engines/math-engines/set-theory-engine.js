/**
 * MANYA SET THEORY ENGINE (v50.0 - THE UNABRIDGED MASTER)
 * --------------------------------------------------------
 * ATOMIC SHADING SYSTEM:
 * - Left (A Only): Purple Tint
 * - Right (B Only): Pink Tint
 * - Center (Intersection): Gold Tint
 * - Outside (Universal): Gray Tint
 * 
 * CORE SYSTEMS INCLUDED:
 * 1. Algebra Engine (Parsing '30 - x')
 * 2. Proper Subset Logic (2^n - 1)
 * 3. Interaction Hub (DRAG_SETS, CHOICE, DIAGRAM_FILL, SHADE_REGION)
 * 4. Handheld Card UI (Kidtopia Themed)
 */

export const SetTheoryEngine = {
    state: { 
        ctx: null, width: 0, height: 0, scale: 1,
        currentStep: 0, isResolved: false, data: null, activeHighlight: null,
        chips: [], dragging: null, dragOffset: {x:0,y:0},
        inputs: [], selectedRegions: new Set(), currentSum: 0,
        tempCanvas: null, tempCtx: null,
        animId: null, tick: 0
    },

    // --- 1. GLOBAL STYLES (PINK/PURPLE CARD THEME) ---
    injectStyles: () => {
        if (document.getElementById('set-theory-styles')) return;
        const style = document.createElement('style');
        style.id = 'set-theory-styles';
        style.innerHTML = `
            .set-root { 
                width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; 
                background: #FDFBF7; padding: 10px; box-sizing: border-box; font-family: 'Nunito', sans-serif;
            }

            .set-game-card {
                width: 100%; max-width: 420px; height: 92%; max-height: 660px;
                background: white; border-radius: 40px; box-shadow: 0 20px 60px rgba(30, 41, 59, 0.12); 
                border: 2.5px solid #F1EFE9; display: flex; flex-direction: column; overflow: hidden; position: relative;
                animation: setCardPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            @keyframes setCardPop { from { opacity:0; transform:translateY(30px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }

            .canvas-wrapper { flex: 1; min-height: 0; position: relative; width: 100%; background: #fff; touch-action: none; }
            canvas { display: block; width: 100%; height: 100%; }
            
            .venn-input { 
                position: absolute; transform: translate(-50%, -50%); 
                width: 58px; height: 38px; border: 2.5px solid #FCE7F3; 
                border-radius: 12px; text-align: center; font-weight: 900; 
                font-size: 16px; background: white; z-index: 50; outline: none; 
                color: #1E293B; box-shadow: 0 4px 10px rgba(219, 39, 119, 0.05);
            }
            .venn-input:focus { border-color: #DB2777; box-shadow: 0 0 0 4px rgba(219, 39, 119, 0.1); }
            .venn-input.correct { border-color: #22c55e; background: #dcfce7; color: #16a34a; pointer-events: none; }
            .venn-input.wrong { border-color: #ef4444; background: #fee2e2; animation: set-shake 0.3s; }

            .hud { flex: 0 0 auto; background: #F8FAFC; padding: 20px 25px; border-top: 2.5px solid #F1F5F9; display: flex; flex-direction: column; gap: 12px; z-index: 100; }
            .q-text { font-size: 1rem; font-weight: 900; color: #334155; text-align: center; line-height: 1.4; }
            .feedback-msg { text-align: center; font-size: 13px; font-weight: 900; height: 20px; min-height:20px; transition: 0.3s; }
            
            .set-entry-box { 
                width: 100%; height: 54px; font-size: 1.6rem; text-align: center; font-weight: 900; 
                border: 3.5px solid #F1EFE9; border-radius: 20px; outline: none; color: #1E293B; background: white; 
            }
            .set-entry-box:focus { border-color: #DB2777; }

            .set-check-btn { 
                width: 100%; height: 60px; background: #7C3AED; color: white; border: none; 
                border-radius: 20px; font-weight: 900; font-size: 16px; cursor: pointer; 
                box-shadow: 0 6px 0 #5B21B6; text-transform: uppercase; letter-spacing: 1.5px;
            }
            .set-check-btn.success { background: #22c55e; box-shadow: 0 6px 0 #16a34a; }
            .set-check-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 #5B21B6; }

            .btn-choice { 
                width: 100%; padding: 15px; border-radius: 18px; border: 2.5px solid #E2E8F0; 
                background: white; color: #475569; font-weight: 800; font-size: 1rem; cursor: pointer; 
                transition: 0.2s; box-shadow: 0 4px 0 #F1F5F9;
            }
            .btn-choice:active { transform: translateY(2px); box-shadow: none; }
            .btn-choice.correct { background: #dcfce7 !important; border-color: #22c55e !important; color: #15803d !important; }
            .btn-choice.wrong { background: #fee2e2 !important; border-color: #ef4444 !important; color: #b91c1c !important; }

            .hint-tag { 
                position: absolute; top: 15px; right: 15px; background: white; border: 2.5px solid #F1EFE9; 
                padding: 6px 14px; border-radius: 30px; font-size: 10px; font-weight: 900; 
                color: #DB2777; cursor: pointer; z-index: 200; box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            }

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
                <div class="set-game-card">
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
        SetTheoryEngine.startLoop();
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

        // Highlighting logic: Only show pre-coloring if specifically asked in Study mode.
        // For Quizzes (interaction present), start CLEAN.
        s.activeHighlight = (q.interaction) ? null : q.targetRegion;

        if (q.interaction === 'DRAG_SETS') {
            s.chips = [
                { val: s.data.sets.A.label, target: "overlap", x: s.width * 0.3, y: s.height * 0.45, radius: 60, color: "#7C3AED" },
                { val: s.data.sets.B.label, target: "overlap", x: s.width * 0.7, y: s.height * 0.45, radius: 60, color: "#DB2777" }
            ];
            controls.innerHTML = `<div style="text-align:center; color:#64748b; font-size:12px; font-weight:700;">Drag the sets together!</div>`;
        } 
        else if (q.interaction === 'CHOICE') {
            controls.innerHTML = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">${q.options.map((o, i) => `
                <button class="btn-choice" id="set-opt-${i}" onclick="window.ManyaSetHandler(${i})">${o}</button>
            `).join('')}</div>`;
        }
        else if (q.interaction === 'BINARY') {
            controls.innerHTML = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button class="btn-choice" onclick="window.ManyaSetHandler('yes')">YES</button>
                <button class="btn-choice" onclick="window.ManyaSetHandler('no')">NO</button>
            </div>`;
        }
        else if (q.interaction === 'CLICK_SUM' || q.interaction === 'SHADE_REGION') {
            controls.innerHTML = `<button class="set-check-btn" onclick="window.ManyaSetHandler()">CHECK SHADING</button>`;
        }
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
        else {
            controls.innerHTML = `
                <input type="text" id="set-user-entry" class="set-entry-box" placeholder="?" autocomplete="off">
                <button class="set-check-btn" onclick="window.ManyaSetHandler()" style="margin-top:10px;">CHECK ANSWER</button>
            `;
            setTimeout(() => { const inp = document.getElementById('set-user-entry'); if(inp) inp.focus(); }, 100);
        }

        if (q.items && q.interaction !== 'DRAG_SETS') {
            s.chips = q.items.map(it => ({ ...it, x: 0, y: 0, isPlaced: false, radius: 24, currentRegion: null }));
        }
        
        SetTheoryEngine.draw();
        SetTheoryEngine.updateInputPositions();
    },

    // --- 4. THE ATOMIC COMPOSITE SHADING ENGINE ---
    // This function creates the separate colors for the intersection vs. only sets
    drawAtomicRegion: (tCtx, region, c1, c2, r, w, h, pad) => {
        tCtx.save(); 
        tCtx.clearRect(0,0,w,h); 
        
        // --- DEFINE SEPARATE COLORS ---
        const colors = {
            'left': 'rgba(124, 58, 237, 0.25)',     // Purple for A Only
            'right': 'rgba(219, 39, 119, 0.25)',    // Pink for B Only
            'center': 'rgba(251, 191, 36, 0.4)',    // Gold for Intersection
            'outside': 'rgba(148, 163, 184, 0.2)'   // Gray for Universal
        };

        tCtx.fillStyle = colors[region];

        if (region === 'center') {
            // Intersection: Clip by Circle 1, then draw Circle 2
            tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tCtx.clip();
            tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tCtx.fill();
        } else if (region === 'left') {
            // A Only: Draw Circle 1, then subtract Circle 2
            tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tCtx.fill();
            tCtx.globalCompositeOperation = 'destination-out';
            tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tCtx.fill();
        } else if (region === 'right') {
            // B Only: Draw Circle 2, then subtract Circle 1
            tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tCtx.fill();
            tCtx.globalCompositeOperation = 'destination-out';
            tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tCtx.fill();
        } else if (region === 'outside') {
            // Outside: Fill Box, then subtract both circles
            tCtx.beginPath(); tCtx.rect(pad, pad, w-pad*2, h-pad*2); tCtx.fill();
            tCtx.globalCompositeOperation = 'destination-out';
            tCtx.beginPath(); tCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tCtx.fill();
        }
        tCtx.restore();
    },

    calculateLayout: () => {
        const { width, height, scale, data } = SetTheoryEngine.state;
        const s = scale; const pad = 15 * s;
        const cx = width / 2; const cy = height * 0.45; 
        const isSingleSet = !data.sets.B || data.sets.B.label === "";
        const r = Math.min(width * 0.22, height * 0.32);
        const offset = isSingleSet ? 0 : r * 0.72;
        return { c1: { x: cx - offset, y: cy, r, color: "#7C3AED" }, c2: { x: cx + offset, y: cy, r, color: "#DB2777" }, cx, cy, r, pad, s, isSingleSet };
    },

    draw: () => {
        const { ctx, data, chips, scale, width, height, selectedRegions, activeHighlight } = SetTheoryEngine.state;
        if (!ctx || width <= 0) return;
        
        const layout = SetTheoryEngine.calculateLayout();
        const { c1, c2, r, pad, s, isSingleSet } = layout;

        ctx.clearRect(0, 0, width, height);

        // A. Render Shading Layer
        const tCtx = SetTheoryEngine.state.tempCtx;
        const finalRegions = new Set(selectedRegions);
        
        // Manual override for Study Slides
        if (activeHighlight) {
            if(activeHighlight === 'intersection') finalRegions.add('center');
            if(activeHighlight === 'union') ['left','center','right'].forEach(z => finalRegions.add(z));
            if(activeHighlight === 'complement_left') ['right','outside'].forEach(z => finalRegions.add(z));
        }

        finalRegions.forEach(reg => {
            SetTheoryEngine.drawAtomicRegion(tCtx, reg, c1, c2, r, width, height, pad);
            ctx.drawImage(SetTheoryEngine.state.tempCanvas, 0, 0);
        });

        // B. Set Outlines
        ctx.strokeStyle = "#F1F5F9"; ctx.lineWidth = 2 * s;
        ctx.strokeRect(pad, pad, width - pad*2, height - pad*2);
        
        ctx.lineWidth = 4 * s;
        ctx.strokeStyle = c1.color; ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.stroke();
        if (!isSingleSet) {
            ctx.strokeStyle = c2.color; ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.stroke();
        }

        // C. Labels
        ctx.fillStyle = c1.color; ctx.font = `900 ${15*s}px sans-serif`; ctx.textAlign = "center";
        ctx.fillText(data.sets.A.label, c1.x, c1.y - r - (12*s));
        if (!isSingleSet) {
            ctx.fillStyle = c2.color; ctx.fillText(data.sets.B.label, c2.x, c2.y - r - (12*s));
        }

        // D. Elements
        ctx.fillStyle = "#1E293B"; ctx.font = `bold ${16 * s}px sans-serif`;
        const drawZone = (arr, x, y) => {
            arr.forEach((val, i) => {
                const off = (i - (arr.length - 1) / 2) * (24 * s);
                ctx.fillText(val, x, y + off);
            });
        };
        if (chips.length === 0) {
            drawZone(data.zones.left, c1.x - r*0.4, layout.cy);
            drawZone(data.zones.right, c2.x + r*0.4, layout.cy);
            drawZone(data.zones.center, layout.cx, layout.cy);
            drawZone(data.zones.outside, width - pad - 45*s, height - pad - 45*s);
        }

        // E. Draggable Chips
        chips.forEach(c => {
            if(c.x === 0) SetTheoryEngine.layoutChips();
            ctx.beginPath(); ctx.arc(c.x, c.y, c.radius*s, 0, Math.PI*2);
            ctx.fillStyle = c.isPlaced ? '#dcfce7' : '#FCE7F3'; ctx.fill();
            ctx.strokeStyle = c.isPlaced ? '#16a34a' : '#DB2777'; ctx.lineWidth = 2.5*s; ctx.stroke();
            ctx.fillStyle = '#0f172a'; ctx.font = `bold ${14*s}px sans-serif`; ctx.textAlign = 'center';
            ctx.fillText(c.val, c.x, c.y + 6*s);
        });
    },

    // --- 5. ALGEBRA & LOGIC BRAIN ---
    evaluateAlgebra: (expr, xVal) => {
        try { return Function(`'use strict'; return (${expr.toString().replace(/[xw]/g, xVal)})`)(); }
        catch (e) { return expr; }
    },

    handleInput: (val) => {
        const s = SetTheoryEngine.state;
        const q = s.data.questions[s.currentStep];
        const z = s.data.zones;
        if (s.isResolved) {
            if (s.currentStep < s.data.questions.length - 1) { s.currentStep++; SetTheoryEngine.loadQuestion(); } 
            else { window.QuestRunner.next(); }
            return;
        }

        let isCorrect = false;
        const normalize = (t) => String(t).toLowerCase().replace(/\s/g, '');

        if (q.interaction === 'CLICK_SUM' || q.interaction === 'SHADE_REGION') {
            const user = Array.from(s.selectedRegions).sort().join(',');
            const map = {
                'intersection': 'center', 'union': 'center,left,right', 'left_only': 'left', 'right_only': 'right',
                'complement_left': 'outside,right', 'complement_right': 'left,outside', 'symmetric_difference': 'left,right'
            };
            const target = map[q.targetRegion] || "";
            isCorrect = user === target.split(',').sort().join(',');
        } 
        else if (q.interaction === 'DIAGRAM_FILL') {
            isCorrect = s.inputs.every(inp => {
                const def = q.inputs.find(d => d.region === inp.dataset.region);
                return normalize(inp.value) === normalize(def.expected);
            });
        }
        else if (q.interaction === 'CHOICE') {
            isCorrect = q.options[val] === q.expected;
            document.getElementById(`set-opt-${val}`).classList.add(isCorrect ? 'correct' : 'wrong');
        }
        else {
            const userAns = document.getElementById('set-user-entry')?.value.trim();
            const nTotal = z.left.length + z.center.length + z.right.length + z.outside.length;
            if (q.type === 'COUNT') isCorrect = parseInt(userAns) === (z[q.targetRegion]?.length || 0);
            else if (q.type === 'SUBSET_COUNT') isCorrect = parseInt(userAns) === Math.pow(2, z.center.length);
            else if (q.type === 'PROPER_SUBSET_COUNT') isCorrect = parseInt(userAns) === (Math.pow(2, z.center.length) - 1);
            else isCorrect = normalize(userAns) === normalize(q.expected || "");
        }

        const feedback = document.getElementById('set-feedback');
        const btn = document.querySelector('.set-check-btn');
        if (isCorrect) {
            feedback.innerText = "🌟 EXCELLENT!"; feedback.style.color = "#16a34a";
            s.isResolved = true;
            if(btn) { btn.innerText = "CONTINUE →"; btn.classList.add('success'); }
        } else {
            feedback.innerText = "Try again!"; feedback.style.color = "#ef4444";
        }
    },

    // --- 6. LISTENERS & ANIMATION ---
    initInputListeners: (canvas) => {
        canvas.onclick = (e) => {
            const s = SetTheoryEngine.state;
            const q = s.data.questions[s.currentStep];
            if (s.isResolved || (q.interaction !== 'CLICK_SUM' && q.interaction !== 'SHADE_REGION')) return;

            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (s.width / rect.width);
            const y = (e.clientY - rect.top) * (s.height / rect.height);
            const l = SetTheoryEngine.calculateLayout();

            const d1 = Math.hypot(x - l.c1.x, y - l.c1.y);
            const d2 = Math.hypot(x - l.c2.x, y - l.c2.y);

            let region = 'outside';
            if (d1 < l.r && d2 < l.r) region = 'center';
            else if (d1 < l.r) region = 'left';
            else if (d2 < l.r) region = 'right';

            if (s.selectedRegions.has(region)) s.selectedRegions.delete(region);
            else s.selectedRegions.add(region);
            SetTheoryEngine.draw();
        };
    },

    updateInputPositions: () => {
        const l = SetTheoryEngine.calculateLayout();
        SetTheoryEngine.state.inputs.forEach(el => {
            const reg = el.dataset.region;
            let x = l.cx, y = l.cy;
            if (reg === 'left') x = l.c1.x - l.r*0.45;
            if (reg === 'right') x = l.c2.x + l.r*0.45;
            if (reg === 'outside') { x = SetTheoryEngine.state.width - 50*l.s; y = SetTheoryEngine.state.height - 50*l.s; }
            el.style.left = `${x / l.s}px`; el.style.top = `${y / l.s}px`;
        });
    },

    layoutChips: () => {
        const { width, height, chips, scale } = SetTheoryEngine.state;
        const gap = 55 * scale;
        const startX = (width - ((chips.length-1) * gap)) / 2;
        chips.forEach((c, i) => { if (!c.isPlaced) { c.x = startX + i * gap; c.y = height - 45 * scale; } });
    },

    startLoop: () => {
        const loop = () => { SetTheoryEngine.state.tick++; SetTheoryEngine.draw(); SetTheoryEngine.state.animId = requestAnimationFrame(loop); };
        loop();
    }
};

window.ManyaSetHandler = (v) => SetTheoryEngine.handleInput(v);
window.ManyaSetHint = () => {
    const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
    const fb = document.getElementById('set-feedback');
    fb.innerText = `💡 ${q.hint || 'Examine the diagram.'}`;
    fb.style.color = "#7C3AED";
};