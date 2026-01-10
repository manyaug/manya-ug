/**
 * Manya Pizza Game Engine
 * Topic: Proper Subsets (2^n - 1)
 * Interaction: Toggle toppings to change 'n'. Visualizes the pizza.
 */
export const PizzaGameEngine = {
    state: {
        ctx: null, width: 0, height: 0, scale: 1,
        selected: new Set(), // Stores indices of selected toppings
        targetVal: 0, // e.g., 15
        isResolved: false
    },

    TOPPINGS: [
        { id: 0, icon: "🍅", label: "Sauce", color: "#ef4444" },
        { id: 1, icon: "🧀", label: "Cheese", color: "#fcd34d" },
        { id: 2, icon: "🍄", label: "Mushroom", color: "#d6d3d1" },
        { id: 3, icon: "🍖", label: "Beef", color: "#78350f" },
        { id: 4, icon: "🌶️", label: "Pepper", color: "#16a34a" },
        { id: 5, icon: "🍍", label: "Pineapple", color: "#f59e0b" }
    ],

    injectStyles: () => {
        if (document.getElementById('pizza-styles')) return;
        const style = document.createElement('style');
        style.id = 'pizza-styles';
        style.innerHTML = `
            .pizza-root { display: flex; flex-direction: column; height: 100dvh; width: 100%; background: #fff7ed; overflow: hidden; }
            .canvas-wrapper { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, #fff 0%, #ffedd5 100%); }
            canvas { max-width: 100%; max-height: 100%; object-fit: contain; }
            
            .hud { 
                flex-shrink: 0; background: white; padding: 20px; 
                border-top: 1px solid #fed7aa; border-top-left-radius: 24px; border-top-right-radius: 24px;
                box-shadow: 0 -10px 40px rgba(249, 115, 22, 0.1); 
                display: flex; flex-direction: column; gap: 15px; z-index: 10;
            }

            .recipe-board {
                background: #1e293b; color: #fbbf24; padding: 12px; 
                border-radius: 12px; text-align: center; border-left: 5px solid #f97316;
                display: flex; flex-direction: column; align-items: center;
            }
            .formula-label { font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .formula-val { font-size: 1.5rem; font-weight: 900; margin-top: 2px; font-family: monospace; }

            .bench { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .bowl { 
                background: #fff; border: 2px solid #e5e7eb; border-radius: 12px; 
                padding: 10px 5px; cursor: pointer; text-align: center; transition: 0.2s;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
            }
            .bowl.active { background: #ffedd5; border-color: #f97316; transform: scale(1.05); }
            .bowl-icon { font-size: 1.8rem; line-height: 1; }
            .bowl-label { font-size: 0.65rem; font-weight: 700; color: #64748b; margin-top: 4px; text-transform: uppercase; }

            .btn-serve {
                padding: 16px; background: #f97316; color: white; border: none; 
                border-radius: 14px; font-weight: 800; font-size: 1.1rem; cursor: pointer; 
                box-shadow: 0 4px 0 #c2410c; transition: 0.1s;
            }
            .btn-serve:active { transform: translateY(4px); box-shadow: none; }
            .btn-serve:disabled { background: #22c55e; box-shadow: none; cursor: default; }
            
            .feedback { text-align: center; font-size: 0.9rem; font-weight: 700; min-height: 20px; color: #4b5563; }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        PizzaGameEngine.injectStyles();
        PizzaGameEngine.state.targetVal = data.questions[0].targetVal;
        PizzaGameEngine.state.selected = new Set();
        PizzaGameEngine.state.isResolved = false;

        // Determine toppings based on difficulty (could be expanded later)
        const toppings = PizzaGameEngine.TOPPINGS.slice(0, 4); 

        container.innerHTML = `
            <div class="pizza-root">
                <div class="canvas-wrapper"><canvas id="pizza-canvas"></canvas></div>
                <div class="hud">
                    <div class="feedback" id="feedback">${data.questions[0].prompt}</div>
                    
                    <div class="recipe-board">
                        <span class="formula-label">Proper Subsets (2ⁿ - 1)</span>
                        <span class="formula-val" id="calc-display">0</span>
                    </div>

                    <div class="bench">
                        ${toppings.map((t, i) => `
                            <div class="bowl" onclick="ManyaPizzaToggle(${i})" id="bowl-${i}">
                                <div class="bowl-icon">${t.icon}</div>
                                <div class="bowl-label">${t.label}</div>
                            </div>
                        `).join('')}
                    </div>

                    <button class="btn-serve" onclick="ManyaPizzaCheck()">🍕 SERVE PIZZA</button>
                </div>
            </div>
        `;

        const canvas = document.getElementById('pizza-canvas');
        PizzaGameEngine.state.ctx = canvas.getContext('2d');
        
        const resize = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 2;
            const hudH = 280; // Approx HUD height
            
            canvas.width = rect.width * dpr;
            canvas.height = (rect.height - hudH) * dpr;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            
            PizzaGameEngine.state.ctx.scale(dpr, dpr);
            PizzaGameEngine.state.width = rect.width;
            PizzaGameEngine.state.height = rect.height - hudH;
            PizzaGameEngine.draw();
        };
        
        // Use ResizeObserver for robustness
        new ResizeObserver(resize).observe(container);
        setTimeout(resize, 50);
    },

    toggle: (id) => {
        if (PizzaGameEngine.state.isResolved) return;
        
        const { selected } = PizzaGameEngine.state;
        const bowl = document.getElementById(`bowl-${id}`);
        
        if (selected.has(id)) {
            selected.delete(id);
            bowl.classList.remove('active');
        } else {
            selected.add(id);
            bowl.classList.add('active');
        }
        
        // Update Math
        const n = selected.size;
        const result = n === 0 ? 0 : Math.pow(2, n) - 1;
        document.getElementById('calc-display').innerText = result;
        
        PizzaGameEngine.draw();
    },

    check: () => {
        const { selected, targetVal } = PizzaGameEngine.state;
        const n = selected.size;
        const result = Math.pow(2, n) - 1;
        
        const btn = document.querySelector('.btn-serve');
        const fb = document.getElementById('feedback');

        if (result === targetVal) {
            PizzaGameEngine.state.isResolved = true;
            btn.innerText = "✅ ORDER COMPLETE";
            btn.disabled = true;
            btn.style.background = "#22c55e";
            fb.innerText = `Correct! n=${n} gives ${targetVal} Proper Subsets.`;
            fb.style.color = "#16a34a";
        } else {
            fb.innerText = `You have ${result}. Target is ${targetVal}.`;
            fb.style.color = "#ef4444";
            btn.style.background = "#ef4444";
            setTimeout(() => { btn.style.background = "#f97316"; }, 500);
        }
    },

    draw: () => {
        const { ctx, width, height, selected } = PizzaGameEngine.state;
        if (!ctx || width === 0) return;

        ctx.clearRect(0, 0, width, height);
        
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.min(width, height) * 0.35; // Responsive radius

        // 1. Crust
        ctx.fillStyle = '#f59e0b'; // Dark Orange
        ctx.beginPath(); ctx.arc(cx, cy, r + 15, 0, Math.PI*2); ctx.fill();
        
        // 2. Base/Cheese
        ctx.fillStyle = '#fef3c7'; // Light Yellow
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = '#d97706'; ctx.stroke();

        // 3. Toppings
        // Logic: Scatter toppings in concentric circles based on ID to avoid overlap
        ctx.font = `${r * 0.25}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        selected.forEach(id => {
            const topping = PizzaGameEngine.TOPPINGS[id];
            const count = 5; // Toppings per layer
            const layerR = (r * 0.3) + (id * (r * 0.15)); // Different radius per topping type
            
            for(let i=0; i<count; i++) {
                const angle = (i / count) * Math.PI * 2 + (id); // Offset angle by ID
                const x = cx + Math.cos(angle) * layerR;
                const y = cy + Math.sin(angle) * layerR;
                
                ctx.fillText(topping.icon, x, y);
            }
            
            // Center Piece
            ctx.fillText(topping.icon, cx + (id*10) - 15, cy + (id*10) - 15);
        });
    }
};

// Global Handlers
window.ManyaPizzaToggle = (id) => PizzaGameEngine.toggle(id);
window.ManyaPizzaCheck = () => PizzaGameEngine.check();