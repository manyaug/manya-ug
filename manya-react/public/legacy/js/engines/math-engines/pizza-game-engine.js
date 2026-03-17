export const PizzaGameEngine = {
    // ... (State and Toppings array stay the same) ...
    state: { ctx: null, width: 0, height: 0, scale: 1, selected: new Set(), currentLevel: 0, isResolved: false, toppingsPositions: [] },
    TOPPINGS: [ { id: 0, icon: "🍅", label: "Tomato" }, { id: 1, icon: "🫒", label: "Olive" }, { id: 2, icon: "🍄", label: "Mushroom" }, { id: 3, icon: "🥓", label: "Bacon" }, { id: 4, icon: "🌶️", label: "Pepper" }, { id: 5, icon: "🍍", label: "Pineapple" } ],

    injectStyles: () => {
        if (document.getElementById('pizza-styles')) return;
        const style = document.createElement('style');
        style.id = 'pizza-styles';
        style.innerHTML = `
            .pizza-root { display: flex; flex-direction: column; height: 100dvh; width: 100%; background: #fff7ed; overflow: hidden; }
            .canvas-wrapper { flex: 1; min-height: 0; position: relative; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, #fff 0%, #ffedd5 100%); }
            canvas { max-width: 100%; max-height: 100%; object-fit: contain; }
            
            .hud { 
                flex-shrink: 0; background: white; 
                padding: 16px 20px; 
                padding-bottom: max(20px, env(safe-area-inset-bottom));
                border-top: 4px solid #fed7aa; 
                box-shadow: 0 -10px 40px rgba(249, 115, 22, 0.1); 
                display: flex; flex-direction: column; gap: 12px; z-index: 10;
            }

            .ticket {
                background: #fefce8; border: 1px dashed #d97706; padding: 10px 15px;
                font-family: 'Courier New', monospace; color: #78350f;
                display: flex; justify-content: space-between; align-items: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            }
            .formula { font-size: 1.1rem; font-weight: 700; }
            .target-badge { background: #f97316; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 800; font-size: 0.8rem; }
            .bench { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
            .bowl { 
                aspect-ratio: 1; background: #fff; border: 2px solid #e5e7eb; border-radius: 50%; 
                cursor: pointer; display: flex; align-items: center; justify-content: center;
                font-size: 1.6rem; transition: transform 0.1s; box-shadow: 0 4px 0 #e5e7eb;
            }
            .bowl.active { background: #ffedd5; border-color: #f97316; box-shadow: 0 4px 0 #fb923c; }
            .btn-serve {
                padding: 16px; background: #16a34a; color: white; border: none; 
                border-radius: 12px; font-weight: 800; font-size: 1.1rem; cursor: pointer; 
                box-shadow: 0 4px 0 #14532d; transition: 0.1s; text-transform: uppercase; letter-spacing: 1px;
            }
            .btn-serve:active { transform: translateY(4px); box-shadow: none; }
            .level-ind { position: absolute; top: 15px; left: 15px; font-size: 0.8rem; font-weight: 800; color: #9a3412; background: rgba(255,255,255,0.8); padding: 5px 10px; border-radius: 20px; }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        PizzaGameEngine.injectStyles();
        PizzaGameEngine.state.data = data;
        PizzaGameEngine.state.currentLevel = 0;
        
        container.innerHTML = `
            <div class="pizza-root">
                <div class="canvas-wrapper" id="pizza-mount">
                    <canvas id="pizza-canvas"></canvas>
                    <div class="level-ind" id="level-display">ORDER 1</div>
                </div>
                <div class="hud">
                    <div class="ticket">
                        <div><div style="font-size:0.7rem; font-weight:700; color:#b45309">ORDER:</div><div class="formula" id="math-display">2⁰-1=0</div></div>
                        <div class="target-badge" id="target-display">GOAL: 3</div>
                    </div>
                    <div class="bench">${PizzaGameEngine.TOPPINGS.map((t, i) => `<div class="bowl" onclick="ManyaPizzaToggle(${i})" id="bowl-${i}">${t.icon}</div>`).join('')}</div>
                    <button class="btn-serve" onclick="ManyaPizzaCheck()">🛎️ SERVE</button>
                </div>
            </div>
        `;

        const canvas = document.getElementById('pizza-canvas');
        PizzaGameEngine.state.ctx = canvas.getContext('2d');
        
        // Robust Resize
        new ResizeObserver(() => {
             const parent = document.getElementById('pizza-mount');
             if(!parent) return;
             const rect = parent.getBoundingClientRect();
             if(rect.width === 0) return;
             
             const dpr = window.devicePixelRatio || 2;
             canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
             canvas.style.width = '100%'; canvas.style.height = '100%';
             
             PizzaGameEngine.state.ctx.scale(dpr, dpr);
             PizzaGameEngine.state.width = rect.width; PizzaGameEngine.state.height = rect.height;
             PizzaGameEngine.draw();
        }).observe(document.getElementById('pizza-mount'));

        setTimeout(() => PizzaGameEngine.loadLevel(0), 50);
    },

    // ... (The rest of Logic: loadLevel, toggle, updateMath, check, generateToppingPositions, draw) ...
    // These functions stay exactly the same as the "Career Mode" version I gave you earlier.
    // I am omitting them here to save space, but you must include them.
    
    // --- Logic Blocks ---
    loadLevel: (idx) => {
        if (idx >= PizzaGameEngine.state.data.questions.length) return;
        const q = PizzaGameEngine.state.data.questions[idx];
        PizzaGameEngine.state.currentLevel = idx;
        PizzaGameEngine.state.targetVal = q.targetVal;
        PizzaGameEngine.state.selected = new Set();
        PizzaGameEngine.state.isResolved = false;
        
        document.querySelectorAll('.bowl').forEach(b => b.classList.remove('active'));
        document.getElementById('target-display').innerText = `GOAL: ${q.targetVal}`;
        document.getElementById('level-display').innerText = `ORDER ${idx + 1} / ${PizzaGameEngine.state.data.questions.length}`;
        const btn = document.querySelector('.btn-serve');
        btn.innerText = "🛎️ SERVE"; btn.disabled = false; btn.style.background = "#16a34a";
        
        PizzaGameEngine.updateMath();
        PizzaGameEngine.generateToppingPositions();
        PizzaGameEngine.draw();
    },

    toggle: (id) => {
        if (PizzaGameEngine.state.isResolved) return;
        const { selected } = PizzaGameEngine.state;
        const bowl = document.getElementById(`bowl-${id}`);
        if (selected.has(id)) { selected.delete(id); bowl.classList.remove('active'); } 
        else { selected.add(id); bowl.classList.add('active'); }
        PizzaGameEngine.updateMath();
        PizzaGameEngine.draw();
    },

    updateMath: () => {
        const n = PizzaGameEngine.state.selected.size;
        const result = Math.pow(2, n) - 1;
        document.getElementById('math-display').innerHTML = `2<sup>${n}</sup> - 1 = ${result}`;
    },

    check: () => {
        if (PizzaGameEngine.state.isResolved) {
            PizzaGameEngine.loadLevel(PizzaGameEngine.state.currentLevel + 1);
            return;
        }
        const { selected, targetVal } = PizzaGameEngine.state;
        const n = selected.size;
        const result = Math.pow(2, n) - 1;
        const btn = document.querySelector('.btn-serve');

        if (result === targetVal) {
            PizzaGameEngine.state.isResolved = true;
            btn.style.background = "#2563eb";
            if (PizzaGameEngine.state.currentLevel < PizzaGameEngine.state.data.questions.length - 1) btn.innerText = "NEXT ORDER ➔";
            else { btn.innerText = "👨‍🍳 MASTER CHEF!"; btn.disabled = true; btn.style.background = "#22c55e"; }
        } else {
            btn.innerText = "WRONG! TRY AGAIN";
            btn.style.background = "#ef4444";
            setTimeout(() => { btn.innerText = "🛎️ SERVE"; btn.style.background = "#16a34a"; }, 1000);
        }
    },

    generateToppingPositions: () => {
        const { width, height } = PizzaGameEngine.state;
        const cx = width / 2; const cy = height / 2;
        const r = Math.min(width, height) * 0.35 - 20; 
        const positions = [];
        for(let i=0; i<30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.sqrt(Math.random()) * r; 
            positions.push({ x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist, rot: (Math.random() - 0.5) * 1 });
        }
        PizzaGameEngine.state.toppingsPositions = positions;
    },

    draw: () => {
        const { ctx, width, height, selected, toppingsPositions } = PizzaGameEngine.state;
        if (!ctx || width === 0) return;
        ctx.clearRect(0, 0, width, height);
        const cx = width / 2; const cy = height / 2;
        const r = Math.min(width, height) * 0.35; 

        ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.arc(cx, cy, r + 15, 0, Math.PI*2); ctx.fill();
        const cheeseGrad = ctx.createRadialGradient(cx, cy, r*0.2, cx, cy, r);
        cheeseGrad.addColorStop(0, '#fffbeb'); cheeseGrad.addColorStop(1, '#fcd34d');
        ctx.fillStyle = cheeseGrad; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#f59e0b'; ctx.stroke();

        const activeToppings = Array.from(selected);
        if (activeToppings.length > 0) {
            toppingsPositions.forEach((pos, i) => {
                const toppingId = activeToppings[i % activeToppings.length];
                const topping = PizzaGameEngine.TOPPINGS[toppingId];
                ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(pos.rot);
                ctx.font = `${r * 0.2}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText(topping.icon, 0, 0); ctx.restore();
            });
        } else {
            ctx.fillStyle = "rgba(180, 83, 9, 0.3)"; ctx.font = `italic 700 ${r*0.15}px sans-serif`;
            ctx.textAlign = "center"; ctx.fillText("Plain Cheese Pizza", cx, cy);
        }
    }
};

window.ManyaPizzaToggle = (id) => PizzaGameEngine.toggle(id);
window.ManyaPizzaCheck = () => PizzaGameEngine.check();