/**
 * Manya Set Theory Engine (Pro UI - Mobile Fix)
 * Restores the "Polished" look but ensures the Control Card is NEVER hidden.
 */
export const SetTheoryEngine = {
    state: {
        ctx: null,
        width: 0,
        height: 0,
        currentStep: 0,
        isResolved: false,
        data: null,
        scale: 1,
        activeHighlight: null
    },

    injectStyles: () => {
        if (document.getElementById('set-theory-pro-styles')) return;
        const style = document.createElement('style');
        style.id = 'set-theory-pro-styles';
        style.innerHTML = `
            .set-root {
                display: flex; 
                flex-direction: column;
                height: 100dvh; /* Use Dynamic Viewport Height for mobile browsers */
                width: 100%;
                background: #f8fafc; 
                overflow: hidden; 
                position: relative;
            }
            
            /* CANVAS WRAPPER - The key fix is min-height: 0 */
            .canvas-wrapper {
                flex: 1; /* Grow to fill space */
                min-height: 0; /* CRITICAL: Allows this container to shrink! */
                display: flex; 
                align-items: center; 
                justify-content: center;
                position: relative;
                background: radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%);
                padding: 10px;
            }

            canvas { 
                box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                border-radius: 20px;
                background: white;
                max-width: 100%;
                max-height: 100%;
                object-fit: contain; /* Ensures canvas scales down without distortion */
            }

            /* HINT BUTTON */
            .hint-pill {
                position: absolute; top: 15px; right: 15px;
                background: white; border: 1px solid #e2e8f0;
                padding: 6px 14px; border-radius: 30px;
                font-size: 11px; font-weight: 800; color: var(--manya-purple);
                box-shadow: 0 4px 12px rgba(0,0,0,0.05); cursor: pointer;
                transition: 0.2s; z-index: 20; display: flex; align-items: center; gap: 6px;
            }
            .hint-pill:active { transform: scale(0.95); }

            /* CONTROL CARD - Always stick to bottom */
            .control-card {
                flex-shrink: 0; /* Prevent this from being squashed */
                background: white; 
                padding: 20px;
                padding-bottom: max(20px, env(safe-area-inset-bottom)); /* iOS Safety */
                border-top-left-radius: 24px; border-top-right-radius: 24px;
                box-shadow: 0 -10px 40px rgba(0,0,0,0.08);
                z-index: 30;
                display: flex; flex-direction: column; gap: 12px;
            }

            .q-text { 
                font-size: 1.15rem; font-weight: 700; color: var(--text-dark); 
                text-align: center; margin-bottom: 5px; 
            }
            
            .input-group { display: flex; gap: 10px; height: 48px; }

            .set-input {
                flex: 1; font-size: 1.2rem; text-align: center; font-weight: 700;
                border: 2px solid #e2e8f0; border-radius: 12px; outline: none;
                color: var(--text-dark); background: #f8fafc;
                transition: all 0.2s;
            }
            .set-input:focus { 
                border-color: var(--manya-purple); background: white; 
                box-shadow: 0 0 0 4px var(--manya-purple-light);
            }

            .check-btn {
                background: var(--manya-purple); color: white;
                border: none; border-radius: 12px; padding: 0 25px;
                font-weight: 700; font-size: 1rem; cursor: pointer;
                transition: 0.2s;
            }
            .check-btn:active { transform: scale(0.96); opacity: 0.9; }

            .feedback-msg { 
                text-align: center; font-size: 0.9rem; font-weight: 700; 
                min-height: 20px; margin-top: -5px;
            }
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
                    <button id="btn-hint" class="hint-pill">
                        <span>💡</span> <span>HINT</span>
                    </button>
                    <canvas id="set-canvas"></canvas>
                </div>
                <div class="control-card">
                    <div id="q-display" class="q-text">Loading...</div>
                    <div class="input-group">
                        <input type="text" id="user-ans" class="set-input" placeholder="?" autocomplete="off" inputmode="text">
                        <button id="btn-check" class="check-btn">CHECK</button>
                    </div>
                    <div id="feedback" class="feedback-msg"></div>
                </div>
            </div>
        `;

        const canvas = document.getElementById('set-canvas');
        SetTheoryEngine.state.ctx = canvas.getContext('2d');
        
        // --- RESIZE LOGIC (Scales Canvas Down if Space is Tight) ---
        const handleResize = () => {
            const parent = document.getElementById('canvas-mount');
            if(!parent) return;
            const rect = parent.getBoundingClientRect();
            
            // Safety: Abort if hidden
            if (rect.width === 0 || rect.height === 0) return;

            const dpr = window.devicePixelRatio || 2; 
            
            // Determine maximum possible size within the flex container
            // Use 95% of available space to show the "Card" effect
            let targetW = rect.width * 0.95;
            let targetH = rect.height * 0.95;
            
            // Limit Aspect Ratio (Don't let it get too skinny or too wide)
            if (targetW / targetH > 1.6) targetW = targetH * 1.6;
            if (targetH / targetW > 1.1) targetH = targetW * 1.1;
            
            // Update Canvas Dimensions
            canvas.width = targetW * dpr;
            canvas.height = targetH * dpr;
            
            // Update CSS Dimensions
            canvas.style.width = `${targetW}px`;
            canvas.style.height = `${targetH}px`;

            SetTheoryEngine.state.ctx.scale(dpr, dpr);
            
            SetTheoryEngine.state.width = targetW;
            SetTheoryEngine.state.height = targetH;
            
            // Dynamic Scale Factor based on width
            SetTheoryEngine.state.scale = Math.min(targetW / 400, 1.4); 

            SetTheoryEngine.draw();
        };

        const observer = new ResizeObserver(() => requestAnimationFrame(handleResize));
        observer.observe(document.getElementById('canvas-mount'));
        
        setTimeout(handleResize, 50);

        document.getElementById('btn-check').onclick = SetTheoryEngine.handleCheck;
        document.getElementById('btn-hint').onclick = SetTheoryEngine.toggleHint;
        
        SetTheoryEngine.loadQuestion();
    },

    loadQuestion: () => {
        const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
        document.getElementById('q-display').innerHTML = q.prompt;
        const input = document.getElementById('user-ans');
        input.value = '';
        input.disabled = false;
        
        document.getElementById('btn-check').innerText = "CHECK";
        document.getElementById('btn-check').style.background = "var(--manya-purple)";
        document.getElementById('feedback').innerText = "";
        
        SetTheoryEngine.state.activeHighlight = null;
        SetTheoryEngine.state.isResolved = false;
        SetTheoryEngine.draw();
    },

    handleCheck: () => {
        if (SetTheoryEngine.state.isResolved) {
            if (SetTheoryEngine.state.currentStep < SetTheoryEngine.state.data.questions.length - 1) {
                SetTheoryEngine.state.currentStep++;
                SetTheoryEngine.loadQuestion();
            } else {
                document.getElementById('q-display').innerHTML = "🎉 Quest Complete!";
                document.getElementById('feedback').innerHTML = "You nailed it!";
            }
            return;
        }

        const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
        const input = document.getElementById('user-ans').value.trim();
        const zones = SetTheoryEngine.state.data.zones;
        
        let correctData = [];
        if(q.targetRegion === 'intersection') correctData = zones.center;
        else if(q.targetRegion === 'left_only') correctData = zones.left;
        else if(q.targetRegion === 'right_only') correctData = zones.right;
        else if(q.targetRegion === 'universal_only') correctData = zones.outside;
        
        let isCorrect = false;

        if (q.type === 'LIST') {
            const cleanInput = input.replace(/[{}]/g, '').split(/[\s,]+/).map(n => parseInt(n)).filter(n => !isNaN(n)).sort((a,b)=>a-b);
            const correctArr = [...correctData].sort((a,b)=>a-b);
            isCorrect = JSON.stringify(cleanInput) === JSON.stringify(correctArr);
        } else if (q.type === 'COUNT') {
            isCorrect = parseInt(input) === correctData.length;
        }

        const fb = document.getElementById('feedback');
        const btn = document.getElementById('btn-check');

        if (isCorrect) {
            fb.innerText = "Correct!";
            fb.style.color = "var(--success-color)";
            btn.innerText = "NEXT";
            btn.style.background = "var(--success-color)";
            document.getElementById('user-ans').disabled = true;
            SetTheoryEngine.state.activeHighlight = q.targetRegion;
            SetTheoryEngine.state.isResolved = true;
            SetTheoryEngine.draw();
        } else {
            fb.innerText = "Check the numbers and try again.";
            fb.style.color = "#ef4444";
        }
    },

    toggleHint: () => {
        const q = SetTheoryEngine.state.data.questions[SetTheoryEngine.state.currentStep];
        const btn = document.getElementById('btn-hint');
        
        if (SetTheoryEngine.state.activeHighlight) {
            SetTheoryEngine.state.activeHighlight = null;
            btn.innerHTML = `<span>💡</span> <span>HINT</span>`;
        } else {
            SetTheoryEngine.state.activeHighlight = q.targetRegion;
            btn.innerHTML = `<span>👀</span> <span>SHOWING</span>`;
        }
        SetTheoryEngine.draw();
    },

    draw: () => {
        const { ctx, width, height, data, activeHighlight, scale } = SetTheoryEngine.state;
        if (width <= 0 || height <= 0) return;

        ctx.clearRect(0, 0, width, height);

        const s = scale; 
        const padding = 30 * s;
        
        const cx = width / 2;
        const cy = height / 2 + (10 * s); // Offset slightly down for U-Set label

        // Radius Calc (Safe and Responsive)
        const availW = width - (padding * 2);
        const availH = height - (padding * 2);
        // Ensure radius is positive
        const r = Math.max(10, Math.min(availW * 0.28, availH * 0.35)); 
        const offset = r * 0.65;
        
        const c1 = { x: cx - offset, y: cy, r: r, color: data.sets.A.color };
        const c2 = { x: cx + offset, y: cy, r: r, color: data.sets.B.color };

        // 1. HIGHLIGHTS
        if (activeHighlight) {
            ctx.save();
            ctx.fillStyle = "#fef9c3";
            if (activeHighlight === 'intersection') {
                ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.clip();
                ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill();
            } else if (activeHighlight === 'left_only') {
                ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.fill();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill();
            } else if (activeHighlight === 'right_only') {
                ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.fill();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        }

        // 2. UNIVERSAL SET (Box)
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2;
        ctx.strokeRect(padding, padding, width - padding*2, height - padding*2);
        
        ctx.font = `800 ${18 * s}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = "#64748b";
        ctx.fillText("ξ", padding + 15 * s, padding + 25 * s);

        // 3. CIRCLES
        ctx.lineWidth = 3.5 * s;
        
        // Circle A
        ctx.strokeStyle = c1.color;
        ctx.beginPath(); ctx.arc(c1.x, c1.y, c1.r, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = c1.color;
        ctx.font = `700 ${20 * s}px "Plus Jakarta Sans", sans-serif`;
        // Coordinate geometry ensures label stays inside
        ctx.fillText(data.sets.A.label, c1.x - r + (20*s), c1.y - r + (20*s));

        // Circle B
        ctx.strokeStyle = c2.color;
        ctx.beginPath(); ctx.arc(c2.x, c2.y, c2.r, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = c2.color;
        ctx.fillText(data.sets.B.label, c2.x + r - (35*s), c2.y - r + (20*s));

        // 4. NUMBERS
        ctx.font = `600 ${18 * s}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#1e293b";

        const drawScatter = (nums, centerX, centerY, radius) => {
            if (!nums || nums.length === 0) return;
            // Safety check for NaN
            if (isNaN(centerX) || isNaN(centerY)) return;

            const positions = [
                {x:0, y:0},
                {x:0, y:-0.5}, {x:0, y:0.5},
                {x:0, y:-0.5}, {x:-0.5, y:0.5}, {x:0.5, y:0.5},
                {x:-0.4, y:-0.4}, {x:0.4, y:-0.4}, {x:-0.4, y:0.4}, {x:0.4, y:0.4},
                {x:0, y:0}, {x:-0.5, y:-0.5}, {x:0.5, y:-0.5}, {x:-0.5, y:0.5}, {x:0.5, y:0.5}
            ];
            
            let layout = positions.slice(0, 1);
            if(nums.length === 2) layout = positions.slice(1, 3);
            if(nums.length === 3) layout = positions.slice(3, 6);
            if(nums.length === 4) layout = positions.slice(6, 10);
            if(nums.length >= 5) layout = positions.slice(10, 15);

            if(nums.length > 5) {
                 nums.forEach((n, i) => {
                     ctx.fillText(n, centerX, centerY - ((nums.length/2)*25*s) + (i*25*s));
                 });
                 return;
            }

            nums.forEach((n, i) => {
                const pos = layout[i];
                const spread = radius * 0.7; 
                ctx.fillText(n, centerX + (pos.x * spread), centerY + (pos.y * spread));
            });
        };

        drawScatter(data.zones.left, c1.x - (r*0.4), cy, r*0.5);
        drawScatter(data.zones.center, cx, cy, r*0.35);
        drawScatter(data.zones.right, c2.x + (r*0.4), cy, r*0.5);
        if(data.zones.outside) {
             drawScatter(data.zones.outside, width - (60*s), height - (60*s), 40*s);
        }
    }
};