/**
 * Manya Subset Game Engine (Fixed Drag & Layout)
 */
export const SubsetGameEngine = {
    state: { 
        ctx: null, width: 0, height: 0, scale: 1,
        currentStep: 0, isResolved: false, data: null, 
        items: [], found: new Set(),
        dragging: null, dragOffset: {x:0,y:0},
        animState: { shake: 0, flash: 0 },
        theme: 'default'
    },

    ICONS: { 
        "Apple": "🍎", "Banana": "🍌", "Orange": "🍊", 
        "Mango": "🥭", "Pen": "🖊️", "Book": "📘", "Car": "🚗",
        "Ball": "⚽", "Bear": "🧸", "Robot": "🤖",
        "Spade": "♠️", "Heart": "♥️", "Club": "♣️", "Diamond": "♦️",
        "Black": "⚫", "Yellow": "🟡", "Red": "🔴"
    },

    COLORS: {
        "Black": "#000000", "Yellow": "#FCD116", "Red": "#CE1126",
        "Green": "#22c55e", "Blue": "#3b82f6", "White": "#ffffff"
    },

    injectStyles: () => {
        if (document.getElementById('subset-game-styles')) return;
        const style = document.createElement('style');
        style.id = 'subset-game-styles';
        style.innerHTML = `
            body, html { overflow: hidden; height: 100%; width: 100%; position: fixed; }
            .subset-root { 
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                display: flex; flex-direction: column; background: #f8fafc; overflow: hidden;
            }
            .canvas-wrapper { 
                flex: 1; position: relative; width: 100%;
                background: radial-gradient(circle, #fff 0%, #f1f5f9 100%); 
            }
            canvas { display: block; width: 100%; height: 100%; touch-action: none; }
            
            .hud { 
                flex-shrink: 0; background: white; 
                padding: 15px 20px; padding-bottom: max(20px, env(safe-area-inset-bottom));
                border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 10px; 
                z-index: 100; box-shadow: 0 -5px 20px rgba(0,0,0,0.05); 
            }
            .shelf-container { 
                display: flex; gap: 8px; overflow-x: auto; padding: 5px 0; 
                min-height: 45px; scrollbar-width: none;
            }
            .shelf-item { 
                background: #f3e8ff; border: 1px solid #d8b4fe; color: #7e22ce; 
                padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 0.9rem;
                display: flex; align-items: center; flex-shrink: 0;
            }
            .shelf-placeholder {
                border: 2px dashed #cbd5e1; color: #cbd5e1; padding: 6px 12px; 
                border-radius: 8px; font-weight: 700; font-size: 0.8rem;
                display: flex; align-items: center; justify-content: center; width: 40px; flex-shrink: 0;
            }
            .btn-pack { 
                padding: 16px; background: var(--manya-purple); color: white; border: none; 
                border-radius: 14px; font-weight: 800; font-size: 1.1rem; cursor: pointer; 
                width: 100%; box-shadow: 0 4px 0 #6d28d9;
            }
            .btn-pack:active { transform: translateY(4px); box-shadow: none; }
            .instruction { text-align: center; color: #64748b; font-size: 0.9rem; font-weight: 700; }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        SubsetGameEngine.injectStyles();
        SubsetGameEngine.state.data = data;
        
        container.innerHTML = `
            <div class="subset-root">
                <div class="canvas-wrapper" id="canvas-mount"><canvas id="game-canvas"></canvas></div>
                <div class="hud">
                    <div class="instruction" id="level-title">Loading...</div>
                    <div class="shelf-container" id="math-shelf"></div>
                    <button class="btn-pack" onclick="ManyaPack()">📦 PACK IT!</button>
                </div>
            </div>
        `;

        const canvas = document.getElementById('game-canvas');
        SubsetGameEngine.state.ctx = canvas.getContext('2d');
        
        // --- INPUT HANDLING ---
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            // Handle both Mouse and Touch events uniformly via Pointer Events
            return {
                x: (e.clientX - rect.left) * (canvas.width / rect.width),
                y: (e.clientY - rect.top) * (canvas.height / rect.height)
            };
        };

        const down = (e) => {
            // Prevent scrolling on touch
            if (e.target === canvas) e.preventDefault();
            
            if(SubsetGameEngine.state.isResolved && document.querySelector('.btn-pack').innerText.indexOf("NEXT") === -1) return;
            const p = getPos(e);
            
            // Check hit (Reverse order to grab top items)
            const hitItem = [...SubsetGameEngine.state.items].reverse().find(item => {
                const dist = Math.sqrt((p.x - item.x)**2 + (p.y - item.y)**2);
                return dist < 70 * SubsetGameEngine.state.scale; 
            });

            if (SubsetGameEngine.state.theme === 'flag' && hitItem) {
                hitItem.isInside = !hitItem.isInside;
                hitItem.y -= 10; setTimeout(() => hitItem.y += 10, 100);
            } 
            else if (hitItem) {
                SubsetGameEngine.state.dragging = hitItem;
                SubsetGameEngine.state.dragOffset = { x: p.x - hitItem.x, y: p.y - hitItem.y };
                canvas.setPointerCapture(e.pointerId); // Critical for tracking drag off-canvas
            }
        };

        const move = (e) => {
            if(!SubsetGameEngine.state.dragging) return;
            e.preventDefault();
            const p = getPos(e);
            const item = SubsetGameEngine.state.dragging;
            item.x = p.x - SubsetGameEngine.state.dragOffset.x;
            item.y = p.y - SubsetGameEngine.state.dragOffset.y;
        };

        const up = (e) => {
            if(!SubsetGameEngine.state.dragging) return;
            const item = SubsetGameEngine.state.dragging;
            canvas.releasePointerCapture(e.pointerId);
            
            const { width, height, scale } = SubsetGameEngine.state;
            const boxW = Math.min(400 * scale, width * 0.85);
            const boxH = Math.min(250 * scale, height * 0.5);
            const boxX = (width - boxW) / 2;
            const boxY = (height - boxH) / 2 - (40 * scale);

            if(item.x > boxX && item.x < boxX + boxW && item.y > boxY && item.y < boxY + boxH) {
                item.isInside = true;
            } else {
                item.isInside = false;
            }
            SubsetGameEngine.state.dragging = null;
        };

        canvas.addEventListener('pointerdown', down);
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerup', up);

        // --- RESIZE & LOOP ---
        const handleResize = () => {
            const mount = document.getElementById('canvas-mount');
            if(!mount) return;
            const rect = mount.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 2;
            
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            SubsetGameEngine.state.scale = dpr;
            SubsetGameEngine.state.width = canvas.width;
            SubsetGameEngine.state.height = canvas.height;
            
            if (SubsetGameEngine.state.items.length > 0) SubsetGameEngine.layoutItems();
        };

        new ResizeObserver(handleResize).observe(container);
        const loop = () => { SubsetGameEngine.draw(); requestAnimationFrame(loop); };
        
        setTimeout(() => { 
            handleResize(); 
            SubsetGameEngine.loadLevel(0); 
            loop();
        }, 100);
    },

    loadLevel: (index) => {
        if (index >= SubsetGameEngine.state.data.questions.length) return;
        const q = SubsetGameEngine.state.data.questions[index];
        SubsetGameEngine.state.currentStep = index;
        SubsetGameEngine.state.theme = q.theme || 'default';
        
        const items = q.items.map(name => ({ name, x: 0, y: 0, isInside: false }));
        SubsetGameEngine.state.items = items;
        SubsetGameEngine.state.totalSubsets = Math.pow(2, items.length);
        SubsetGameEngine.state.found = new Set();
        SubsetGameEngine.state.isResolved = false;
        
        document.getElementById('level-title').innerText = q.prompt;
        const btn = document.querySelector('.btn-pack');
        btn.innerText = SubsetGameEngine.state.theme === 'flag' ? "🎨 CHECK PATTERN" : "📦 PACK IT!";
        btn.disabled = false; btn.style.background = "var(--manya-purple)";
        
        const shelf = document.getElementById('math-shelf');
        shelf.innerHTML = '';
        for(let i=0; i<SubsetGameEngine.state.totalSubsets; i++) shelf.innerHTML += `<div class="shelf-placeholder" id="slot-${i}">?</div>`;
        
        SubsetGameEngine.layoutItems();
    },

    layoutItems: () => {
        const { width, height, items, scale } = SubsetGameEngine.state;
        const gap = width / (items.length + 1);
        const yPos = height - (80 * scale);
        items.forEach((item, i) => { if(!item.isInside && SubsetGameEngine.state.dragging !== item) { item.x = gap * (i + 1); item.y = yPos; } });
    },

    pack: () => {
        if(SubsetGameEngine.state.isResolved) {
            SubsetGameEngine.loadLevel(SubsetGameEngine.state.currentStep + 1);
            return;
        }
        const { found, items, totalSubsets } = SubsetGameEngine.state;
        const insideItems = items.filter(i => i.isInside).map(i => i.name).sort();
        const key = insideItems.join(',') || "EMPTY";
        
        if(found.has(key)) {
            const btn = document.querySelector('.btn-pack');
            const old = btn.innerText; btn.innerText = "ALREADY FOUND!"; btn.style.background = "#ef4444";
            setTimeout(() => { btn.innerText = old; btn.style.background = "var(--manya-purple)"; }, 1000);
        } else {
            found.add(key);
            const count = found.size;
            let label = "∅";
            if(key !== "EMPTY") {
                label = SubsetGameEngine.state.theme === 'flag' 
                    ? insideItems.map(n => `<span style="display:inline-block;width:12px;height:12px;background:${SubsetGameEngine.COLORS[n]};border-radius:2px;margin:0 1px;border:1px solid #ccc;"></span>`).join('')
                    : `{ ${insideItems.map(n => SubsetGameEngine.ICONS[n]).join(',')} }`;
            }
            const slot = document.getElementById(`slot-${count-1}`);
            if(slot) { slot.className = 'shelf-item'; slot.innerHTML = label; }
            items.forEach(i => i.isInside = false);
            if (SubsetGameEngine.state.theme !== 'flag') SubsetGameEngine.layoutItems();

            if (count === totalSubsets) {
                const btn = document.querySelector('.btn-pack');
                btn.style.background = "#22c55e";
                if (SubsetGameEngine.state.currentStep < SubsetGameEngine.state.data.questions.length - 1) {
                    btn.innerText = "NEXT LEVEL ➔"; SubsetGameEngine.state.isResolved = true;
                } else {
                    btn.innerText = "🎉 QUEST COMPLETE!"; btn.disabled = true;
                }
            }
        }
    },

    // Simplified draw for brevity - assumed same as previous
    draw: () => {
        const { ctx, width, height, items, scale, theme } = SubsetGameEngine.state;
        if(!ctx || width === 0) return;
        ctx.clearRect(0, 0, width, height);

        const boxW = Math.min(400 * scale, width * 0.85);
        const boxH = Math.min(250 * scale, height * 0.5);
        const boxX = (width - boxW) / 2;
        const boxY = (height - boxH) / 2 - (40 * scale);

        // Draw Box/Flag Container
        ctx.fillStyle = theme==='flag'?"#64748b":"#ffffff";
        if(theme==='flag') ctx.fillRect(boxX-(15*scale), boxY, 15*scale, boxH*1.5); // Pole
        
        ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 4;
        ctx.beginPath(); 
        if(theme==='flag') ctx.rect(boxX, boxY, boxW, boxH);
        else ctx.roundRect(boxX, boxY, boxW, boxH, 20);
        ctx.fill(); ctx.stroke();

        // Draw Contents
        if(theme === 'flag') {
             const stripeW = boxW / items.length;
             items.forEach((item, i) => {
                 if(item.isInside) { ctx.fillStyle = SubsetGameEngine.COLORS[item.name]; ctx.fillRect(boxX + i*stripeW, boxY, stripeW, boxH); }
                 ctx.strokeRect(boxX + i*stripeW, boxY, stripeW, boxH);
             });
        } else {
             const inside = items.filter(i => i.isInside);
             if(inside.length===0) { ctx.fillStyle="#cbd5e1"; ctx.font=`italic 700 ${20*scale}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("EMPTY SET (∅)", width/2, boxY+boxH/2); }
             else {
                 const gap = boxW / (inside.length+1);
                 inside.forEach((item, i) => {
                     ctx.font=`${60*scale}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
                     ctx.fillText(SubsetGameEngine.ICONS[item.name], boxX + gap*(i+1), boxY+boxH/2);
                 });
             }
        }

        // Draw Items
        items.forEach(item => {
            if(theme === 'flag') {
                 ctx.fillStyle = SubsetGameEngine.COLORS[item.name];
                 ctx.fillRect(item.x - 20*scale, item.y - 20*scale, 40*scale, 40*scale);
                 ctx.fillStyle = "#64748b"; ctx.font=`bold ${12*scale}px sans-serif`; ctx.textAlign='center';
                 ctx.fillText(item.name, item.x, item.y + 35*scale);
            } else {
                 ctx.font=`${60*scale}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
                 ctx.fillText(SubsetGameEngine.ICONS[item.name], item.x, item.y);
            }
        });
    }
};
window.ManyaPack = () => SubsetGameEngine.pack();