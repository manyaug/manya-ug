/**
 * Manya Subset Game Engine (v4.0 - Layout & Logic Patch)
 * Fixes:
 * - "Double Icon" bug (items drawing in both inventory and box).
 * - "Hidden Button" bug (CSS layout adjusted for App Shell).
 * - "Floating" items (Physics loop logic tightened).
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
            /* ROOT: Must be relative to fit in App Shell main view */
            .subset-root { 
                position: relative; 
                width: 100%; height: 100%; 
                display: flex; flex-direction: column; 
                background: #f8fafc; overflow: hidden; 
                user-select: none;
            }
            
            /* CANVAS WRAPPER: Takes available space, but shrinks if needed */
            .canvas-wrapper { 
                flex: 1; 
                min-height: 0; /* CRITICAL for Flexbox scrolling/shrinking */
                position: relative; 
                width: 100%;
                background: radial-gradient(circle, #fff 0%, #f1f5f9 100%); 
                touch-action: none;
            }
            
            canvas { display: block; width: 100%; height: 100%; object-fit: contain; }
            
            /* HUD: Pinned to bottom, never shrinks */
            .hud { 
                flex-shrink: 0; 
                background: white; 
                padding: 12px 16px; 
                padding-bottom: max(12px, env(safe-area-inset-bottom));
                border-top: 1px solid #e2e8f0; 
                display: flex; flex-direction: column; gap: 8px; 
                z-index: 100; box-shadow: 0 -5px 20px rgba(0,0,0,0.05); 
            }
            
            .shelf-container { 
                display: flex; gap: 8px; overflow-x: auto; padding: 4px 0; 
                min-height: 40px; scrollbar-width: none;
            }
            /* Hide scrollbar for Chrome/Safari/Opera */
            .shelf-container::-webkit-scrollbar { display: none; }

            .shelf-item { 
                background: #f3e8ff; border: 1px solid #d8b4fe; color: #7e22ce; 
                padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 0.8rem;
                display: flex; align-items: center; flex-shrink: 0;
            }
            .shelf-placeholder {
                border: 2px dashed #cbd5e1; color: #cbd5e1; padding: 4px 10px; 
                border-radius: 8px; font-weight: 700; font-size: 0.8rem;
                display: flex; align-items: center; justify-content: center; width: 35px; flex-shrink: 0;
            }
            
            .btn-pack { 
                padding: 14px; background: var(--manya-purple); color: white; border: none; 
                border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; 
                width: 100%; box-shadow: 0 4px 0 #6d28d9; transition: transform 0.1s;
            }
            .btn-pack:active { transform: translateY(3px); box-shadow: none; }
            .btn-pack:disabled { background: #22c55e; box-shadow: none; cursor: default; transform: none; }
            
            .instruction { text-align: center; color: #64748b; font-size: 0.85rem; font-weight: 700; }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        SubsetGameEngine.injectStyles();
        SubsetGameEngine.state.data = data;
        
        container.innerHTML = `
            <div class="subset-root">
                <div class="canvas-wrapper" id="canvas-mount"><canvas id="game-canvas"></canvas></div>
                <div class="hud" id="hud-panel">
                    <div class="instruction" id="level-title">Loading...</div>
                    <div class="shelf-container" id="math-shelf"></div>
                    <button class="btn-pack" onclick="ManyaPack()">📦 PACK IT!</button>
                </div>
            </div>
        `;

        const canvas = document.getElementById('game-canvas');
        SubsetGameEngine.state.ctx = canvas.getContext('2d');
        
        // Input Logic
        SubsetGameEngine.initInputs(canvas);

        // Resize Logic
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

        // Observe container resize (handles mobile URL bar shifts)
        new ResizeObserver(handleResize).observe(document.getElementById('canvas-mount'));
        
        // Loop
        const loop = () => { SubsetGameEngine.draw(); requestAnimationFrame(loop); };
        
        setTimeout(() => { 
            handleResize(); 
            SubsetGameEngine.loadLevel(0); 
            loop();
        }, 100);
    },

    initInputs: (canvas) => {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            // Handle touches vs mouse
            const cx = e.touches ? e.touches[0].clientX : e.clientX;
            const cy = e.touches ? e.touches[0].clientY : e.clientY;
            
            return {
                x: (cx - rect.left) * (canvas.width / rect.width),
                y: (cy - rect.top) * (canvas.height / rect.height)
            };
        };

        const down = (e) => {
            // Prevent dragging the whole page
            if (e.target === canvas) e.preventDefault(); 
            
            if(SubsetGameEngine.state.isResolved && document.querySelector('.btn-pack').innerText.indexOf("NEXT") === -1) return;
            const p = getPos(e);
            
            // Hit Check (Top items first)
            const hitItem = [...SubsetGameEngine.state.items].reverse().find(item => {
                const dist = Math.sqrt((p.x - item.x)**2 + (p.y - item.y)**2);
                return dist < 80 * SubsetGameEngine.state.scale; // Generous hit area
            });

            if (SubsetGameEngine.state.theme === 'flag' && hitItem) {
                hitItem.isInside = !hitItem.isInside;
                hitItem.y -= 20; setTimeout(() => hitItem.y += 20, 150);
            } 
            else if (hitItem) {
                SubsetGameEngine.state.dragging = hitItem;
                SubsetGameEngine.state.dragOffset = { x: p.x - hitItem.x, y: p.y - hitItem.y };
                canvas.setPointerCapture(e.pointerId);
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
            
            // Visual Box Bounds
            const boxW = Math.min(400 * scale, width * 0.85);
            const boxH = Math.min(250 * scale, height * 0.5);
            const boxX = (width - boxW) / 2;
            const boxY = (height - boxH) / 2 - (40 * scale);

            // Logic: Is center of item inside box?
            if(item.x > boxX && item.x < boxX + boxW && item.y > boxY && item.y < boxY + boxH) {
                item.isInside = true;
            } else {
                item.isInside = false;
            }
            SubsetGameEngine.state.dragging = null;
        };

        // Pointer Events work for both Mouse and Touch
        canvas.addEventListener('pointerdown', down);
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerup', up);
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
        const yPos = height - (80 * scale); // Initial bottom position
        
        items.forEach((item, i) => {
            // Only move if not dragged and not inside
            if(!item.isInside && SubsetGameEngine.state.dragging !== item) {
                item.x = gap * (i + 1);
                item.y = yPos;
            }
        });
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
                if (SubsetGameEngine.state.theme === 'flag') {
                    label = insideItems.map(n => `<span style="display:inline-block;width:12px;height:12px;background:${SubsetGameEngine.COLORS[n]};border-radius:2px;margin:0 1px;border:1px solid #ccc;"></span>`).join('');
                } else {
                    label = `{ ${insideItems.map(n => SubsetGameEngine.ICONS[n] || n[0]).join(',')} }`;
                }
            }
            const slot = document.getElementById(`slot-${count-1}`);
            if(slot) { slot.className = 'shelf-item'; slot.innerHTML = label; }

            // Reset items to shelf
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

    // Browser-Safe Draw Helper
    drawRoundedRect: (ctx, x, y, w, h, r) => {
        ctx.beginPath(); ctx.moveTo(x+r, y);
        ctx.arcTo(x+w, y, x+w, y+h, r); ctx.arcTo(x+w, y+h, x, y+h, r);
        ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r); ctx.closePath();
    },

    draw: () => {
        const { ctx, width, height, items, scale, animState, theme } = SubsetGameEngine.state;
        if(!ctx || width === 0) return;

        ctx.clearRect(0, 0, width, height);

        let shakeX = 0;
        if(animState.shake > 0) shakeX = Math.sin(animState.shake) * 10 * scale;

        const boxW = Math.min(400 * scale, width * 0.85);
        const boxH = Math.min(250 * scale, height * 0.5);
        const boxX = (width - boxW) / 2 + shakeX;
        const boxY = (height - boxH) / 2 - (40 * scale);

        // Flash Effect
        if(animState.flash > 0) {
            ctx.fillStyle = `rgba(34, 197, 94, ${animState.flash / 20})`;
            SubsetGameEngine.drawRoundedRect(ctx, boxX - 20, boxY - 20, boxW + 40, boxH + 40, 30);
            ctx.fill();
        }

        // Draw Container (Flag vs Box)
        if (theme === 'flag') {
            ctx.fillStyle = "#64748b"; ctx.fillRect(boxX - (15*scale), boxY, 15*scale, boxH * 1.5);
            ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.rect(boxX, boxY, boxW, boxH); ctx.fill(); ctx.stroke();

            const stripeW = boxW / items.length;
            items.forEach((item, i) => {
                if (item.isInside) {
                    ctx.fillStyle = SubsetGameEngine.COLORS[item.name] || '#ccc';
                    ctx.fillRect(boxX + (i * stripeW), boxY, stripeW, boxH);
                }
                if (i > 0) {
                    ctx.beginPath(); ctx.moveTo(boxX + i*stripeW, boxY);
                    ctx.lineTo(boxX + i*stripeW, boxY+boxH);
                    ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.stroke();
                }
            });
        } else {
            ctx.fillStyle = "#ffffff"; ctx.strokeStyle = animState.shake > 0 ? "#ef4444" : "#94a3b8"; 
            ctx.lineWidth = 4;
            SubsetGameEngine.drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 20);
            ctx.fill(); ctx.stroke();
            
            const insideItems = items.filter(i => i.isInside);
            // GRID LOGIC for Inside Items
            if(insideItems.length === 0) {
                ctx.fillStyle = "#cbd5e1"; ctx.font = `italic 700 ${20*scale}px sans-serif`; 
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText("EMPTY SET (∅)", width/2 + shakeX, boxY + boxH/2);
            } else {
                // FIXED: Don't rely on item.x here. Calculate GRID positions.
                const gap = boxW / (insideItems.length + 1);
                insideItems.forEach((item, i) => {
                    const icon = SubsetGameEngine.ICONS[item.name] || "📦";
                    ctx.font = `${60*scale}px serif`;
                    ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    ctx.fillText(icon, boxX + gap*(i+1), boxY + boxH/2);
                });
            }
        }

        // Draw Inventory Items (Floating Logic)
        items.forEach(item => {
            // FIX: If item is Inside, DO NOT draw it floating (unless dragging)
            // It is already drawn in the "GRID LOGIC" block above.
            if (item.isInside && SubsetGameEngine.state.dragging !== item && theme !== 'flag') return;
            
            // Flag mode toggles inplace, so we draw buttons
            if (theme === 'flag') {
                const color = SubsetGameEngine.COLORS[item.name] || '#ccc';
                ctx.save(); ctx.translate(item.x, item.y);
                if (item.isInside) { ctx.shadowColor = color; ctx.shadowBlur = 20; }
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.moveTo(-20*scale, -20*scale); ctx.lineTo(20*scale, -20*scale);
                ctx.lineTo(15*scale, 20*scale); ctx.lineTo(-15*scale, 20*scale); ctx.fill();
                ctx.shadowBlur = 0; ctx.fillStyle = "#64748b"; ctx.font = `bold ${12*scale}px sans-serif`;
                ctx.textAlign = 'center'; ctx.fillText(item.name, 0, 40*scale);
                ctx.restore();
            } else {
                // Standard Lunchbox Item
                const icon = SubsetGameEngine.ICONS[item.name] || "📦";
                
                // Shadow
                ctx.fillStyle = "rgba(0,0,0,0.1)";
                ctx.beginPath(); ctx.ellipse(item.x, item.y + (25*scale), 30*scale, 10*scale, 0, 0, Math.PI*2); ctx.fill();
                
                // Icon
                ctx.font = `${60*scale}px serif`; 
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText(icon, item.x, item.y);
                
                // Text
                ctx.font = `bold ${12*scale}px sans-serif`; ctx.fillStyle = "#64748b";
                ctx.fillText(item.name, item.x, item.y + (45*scale));
            }
        });
    }
};

window.ManyaPack = () => SubsetGameEngine.pack();