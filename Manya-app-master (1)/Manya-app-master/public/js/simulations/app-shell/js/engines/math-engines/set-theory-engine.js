/**
 * MANYA SET THEORY ENGINE (v45.0 - Integrated Card Version)
 * ADAPTED FROM GITHUB MASTER
 * 
 * FIXES:
 * - Embedded inside the QuestRunner Frame.
 * - No longer overlaps the App Header or Footer.
 * - Full Manya Pink/Purple visual overhaul.
 */

export const SetTheoryEngine = {
    state: { 
        ctx: null, width: 0, height: 0, scale: 1,
        currentStep: 0, isResolved: false, data: null, activeHighlight: null,
        chips: [], dragging: null, dragOffset: {x:0,y:0},
        inputs: [], selectedRegions: new Set(), currentSum: 0,
        tempCanvas: null, tempCtx: null 
    },

    // --- 1. GLOBAL STYLES (CARD INTEGRATION) ---
    injectStyles: () => {
        if (document.getElementById('set-theory-styles')) return;
        const style = document.createElement('style');
        style.id = 'set-theory-styles';
        style.innerHTML = `
            /* THE CONTAINER: Seats the game inside the QuestRunner content area */
            .set-root { 
                position: relative; 
                width: 100%; 
                height: 100%; 
                display: flex; 
                justify-content: center;
                align-items: center; /* Centers card vertically */
                background: #FDFBF7; /* App seamless cream */
                padding: 15px;
                box-sizing: border-box;
                font-family: 'Nunito', sans-serif;
                overflow: hidden;
            }

            /* THE CARD: The "Console" that holds the math */
            .set-game-card {
                width: 100%;
                max-width: 420px;
                height: 100%;
                max-height: 620px; /* Limits size to stay within app frame */
                background: white;
                border-radius: 40px; 
                box-shadow: 0 15px 45px rgba(30, 41, 59, 0.08);
                border: 2px solid #F1EFE9;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: setCardPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            @keyframes setCardPop {
                from { opacity: 0; transform: translateY(30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            .canvas-wrapper { 
                flex: 1; 
                min-height: 0; 
                position: relative; 
                width: 100%; 
                background: #fff; 
                touch-action: none; 
            }
            canvas { display: block; width: 100%; height: 100%; }
            
            /* INTERACTIVE VENN INPUTS (Pink) */
            .venn-input { 
                position: absolute; transform: translate(-50%, -50%); 
                width: 58px; height: 38px; border: 2.5px solid #FCE7F3; 
                border-radius: 12px; text-align: center; font-weight: 900; 
                font-size: 16px; background: white; z-index: 50; outline: none; 
            }
            .venn-input:focus { border-color: #DB2777; box-shadow: 0 0 10px rgba(219, 39, 119, 0.1); }
            .venn-input.correct { border-color: #22c55e; background: #f0fdf4; color: #16a34a; pointer-events: none; }
            .venn-input.wrong { border-color: #ef4444; background: #fef2f2; animation: set-shake 0.3s; }

            /* HUD: Internal card panel */
            .hud { 
                flex: 0 0 auto; 
                background: #F8FAFC; 
                padding: 20px 25px; 
                border-top: 2px solid #F1F5F9; 
                display: flex; 
                flex-direction: column; 
                gap: 12px; 
                z-index: 100; 
            }
            .q-text { font-size: 1rem; font-weight: 800; color: #334155; text-align: center; line-height: 1.4; }
            .feedback-msg { text-align: center; font-size: 14px; font-weight: 800; height: 20px; }
            
            .set-entry-box { 
                width: 100%; height: 52px; font-size: 1.5rem; text-align: center; font-weight: 900; 
                border: 2.5px solid #E2E8F0; border-radius: 18px; outline: none; 
                color: #1E293B; background: white; transition: 0.2s;
            }
            .set-entry-box:focus { border-color: #DB2777; }

            /* ACTION BUTTON (Purple) */
            .set-check-btn { 
                width: 100%; height: 56px; background: #7C3AED; color: white; border: none; 
                border-radius: 20px; font-weight: 900; font-size: 16px; cursor: pointer; 
                box-shadow: 0 5px 0 #5B21B6; text-transform: uppercase; letter-spacing: 1px;
            }
            .set-check-btn.success { background: #22c55e; box-shadow: 0 5px 0 #16a34a; }
            .set-check-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #5B21B6; }

            .btn-choice { 
                width: 100%; padding: 14px; border-radius: 16px; border: 2.5px solid #E2E8F0; 
                background: white; color: #475569; font-weight: 800; font-size: 1rem; cursor: pointer; 
                transition: 0.2s; box-shadow: 0 4px 0 #F1F5F9;
            }
            .btn-choice.correct { background: #dcfce7 !important; border-color: #22c55e !important; color: #15803d !important; }
            .btn-choice.wrong { background: #fee2e2 !important; border-color: #ef4444 !important; color: #b91c1c !important; }

            .hint-tag { 
                position: absolute; top: 15px; right: 15px; background: white; border: 2.5px solid #F1EFE9; 
                padding: 6px 14px; border-radius: 30px; font-size: 10px; font-weight: 900; 
                color: #DB2777; cursor: pointer; z-index: 200; box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            }
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

        if (q.targetRegion && q.interaction !== 'CLICK_SUM') {
            s.activeHighlight = q.targetRegion;
        } else {
            s.activeHighlight = null;
        }

        if (q.interaction === 'DRAG_SETS') {
            s.chips = [
                { val: s.data.sets.A.label, target: "overlap", x: s.width * 0.35, y: s.height * 0.45, radius: 60, isLocked: false, color: "#7C3AED" },
                { val: s.data.sets.B.label, target: "overlap", x: s.width * 0.65, y: s.height * 0.45, radius: 60, isLocked: false, color: "#DB2777" }
            ];
            controls.innerHTML = `<div style="text-align:center; color:#64748b; font-size:12px; font-weight:700;">Drag the sets together to overlap!</div>`;
        } 
        else if (q.interaction === 'CHOICE') {
            controls.innerHTML = `<div style="display:grid; gap:8px;">${q.options.map((o, i) => `
                <button class="btn-choice" id="set-opt-${i}" onclick="window.ManyaSetHandler(${i})">${o}</button>
            `).join('')}</div>`;
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
            s.chips = q.items.map(it => ({
                ...it, x: 0, y: 0, isPlaced: false, radius: 24, isLocked: false, currentRegion: null
            }));
        } 
        
        SetTheoryEngine.draw();
        SetTheoryEngine.updateInputPositions();
    },

    // --- 4. ATOMIC SHADING ENGINE ---
    drawAtomicRegion: (tCtx, region, c1, c2, r, w, h, pad) => {
        tCtx.save(); tCtx.clearRect(0,0,w,h); 
        tCtx.fillStyle = "rgba(124, 58, 237, 0.15)"; 
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
        const s = scale; const pad = 15 * s;
        const cx = width / 2; const cy = height * 0.45; 
        const isSingleSet = !data.sets.B || data.sets.B.label === "";
        const r = Math.min(width * 0.22, height * 0.32);
        const offset = isSingleSet ? 0 : r * 0.75;
        return { 
            c1: { x: cx - offset, y: cy, r, color: "#7C3AED" }, 
            c2: { x: cx + offset, y: cy, r, color: "#DB2777" }, 
            cx, cy, r, pad, s, isSingleSet 
        };
    },

    draw: () => {
        const { ctx, data, chips, scale, width, height, currentStep, selectedRegions, activeHighlight } = SetTheoryEngine.state;
        if (!ctx || width <= 0) return;
        const q = data.questions[currentStep];
        const layout = SetTheoryEngine.calculateLayout();
        const { c1, c2, r, pad, s, isSingleSet } = layout;

        ctx.clearRect(0, 0, width, height);
        const tCtx = SetTheoryEngine.state.tempCtx;
        if (tCtx && (activeHighlight || selectedRegions.size > 0)) {
            const shouldColor = (reg) => (activeHighlight === reg) || selectedRegions.has(reg) || 
                                       (activeHighlight==='union' && ['left','center','right'].includes(reg)) ||
                                       (activeHighlight==='intersection' && reg==='center') ||
                                       (activeHighlight==='left_total' && ['left','center'].includes(reg)) ||
                                       (activeHighlight==='right_total' && ['right','center'].includes(reg));
            ['left', 'center', 'right', 'outside'].forEach(atomic => {
                if (shouldColor(atomic)) {
                    SetTheoryEngine.drawAtomicRegion(tCtx, atomic, c1, c2, r, width, height, pad);
                    ctx.drawImage(SetTheoryEngine.state.tempCanvas, 0, 0);
                }
            });
        }

        ctx.strokeStyle = "#F1F5F9"; ctx.lineWidth = 2 * s;
        ctx.strokeRect(pad, pad, width - pad*2, height - pad*2);
        ctx.fillStyle = "#94A3B8"; ctx.font = `900 ${16 * s}px sans-serif`; ctx.textAlign="left";
        ctx.fillText(q.equation_target ? `ξ=${q.equation_target}` : "ξ", pad + 10*s, pad + 25*s);

        ctx.lineWidth = 4 * s;
        ctx.strokeStyle = c1.color; ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = c1.color; ctx.font = `900 ${15*s}px sans-serif`; ctx.textAlign = "center";
        ctx.fillText(data.sets.A.label, c1.x, c1.y - r - (12*s));

        if (!isSingleSet) {
            ctx.strokeStyle = c2.color; ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.stroke();
            ctx.fillStyle = c2.color; ctx.fillText(data.sets.B.label, c2.x, c2.y - r - (12*s));
        }

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
        
        chips.forEach(c => {
            if(c.x === 0) SetTheoryEngine.layoutChips();
            ctx.beginPath(); ctx.arc(c.x, c.y, c.radius*s, 0, Math.PI*2);
            ctx.fillStyle = c.isPlaced ? '#dcfce7' : '#FCE7F3'; ctx.fill();
            ctx.strokeStyle = c.isPlaced ? '#16a34a' : '#DB2777'; ctx.lineWidth = 2.5*s; ctx.stroke();
            ctx.fillStyle = '#0f172a'; ctx.font = `bold ${16*s}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(String(c.val), c.x, c.y + 6*s);
        });
    },

    // --- 5. LOGIC CORE ---
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
            if (s.currentStep < s.data.questions.length - 1) { s.currentStep++; SetTheoryEngine.loadQuestion(); } 
            else { window.QuestRunner.next(); }
            return;
        }

        let isCorrect = false;
        const normalize = (t) => t.toString().toLowerCase().replace(/\s/g, '');
        const userAns = document.getElementById('set-user-entry')?.value.trim();

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
        else if (q.interaction === 'CHOICE') {
            isCorrect = q.options[val] === q.expected;
            document.getElementById(`set-opt-${val}`)?.classList.add(isCorrect ? 'correct' : 'wrong');
        }
        else {
            let targetSet = [];
            if(q.targetRegion === 'intersection') targetSet = z.center;
            else if(q.targetRegion === 'left_only') targetSet = z.left;
            else if(q.targetRegion === 'right_only') targetSet = z.right;
            else if(q.targetRegion === 'union') targetSet = [...z.left, ...z.center, ...z.right];

            if (q.type === 'COUNT') isCorrect = parseInt(userAns) === targetSet.length;
            else if (q.type === 'SUBSET_COUNT') isCorrect = parseInt(userAns) === Math.pow(2, targetSet.length);
            else if (q.type === 'PROPER_SUBSET_COUNT') isCorrect = parseInt(userAns) === (Math.pow(2, targetSet.length) - 1);
            else isCorrect = normalize(userAns) === normalize(q.expected || "");
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
            const chip = [...SetTheoryEngine.state.chips].reverse().find(c => !c.isLocked && Math.hypot(c.x-p.x, c.y-p.y) < c.radius * 2 * SetTheoryEngine.state.scale);
            if (chip) { SetTheoryEngine.state.dragging = chip; SetTheoryEngine.state.dragOffset = { x: p.x - chip.x, y: p.y - chip.y }; }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!SetTheoryEngine.state.dragging) return;
            const p = getPos(e);
            SetTheoryEngine.state.dragging.x = p.x - SetTheoryEngine.state.dragOffset.x;
            SetTheoryEngine.state.dragging.y = p.y - SetTheoryEngine.state.dragOffset.y;
            SetTheoryEngine.draw();
            if (SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep].interaction === 'DRAG_SETS') SetTheoryEngine.handleInput(); 
        });

        canvas.addEventListener('mouseup', () => { SetTheoryEngine.state.dragging = null; SetTheoryEngine.draw(); });
        canvas.addEventListener('touchstart', (e) => { const t = e.touches[0]; canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY })); }, {passive: false});
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); const t = e.touches[0]; canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY })); }, {passive: false});
        canvas.addEventListener('touchend', () => { canvas.dispatchEvent(new MouseEvent('mouseup', {})); });
    }
};

window.ManyaSetHint = () => {
    const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
    document.getElementById('set-feedback').innerHTML = `<span style="color:#DB2777">💡 ${q.hint || 'Examine the diagram carefully.'}</span>`;
};

window.ManyaSetHandler = (val) => SetTheoryEngine.handleInput(val);