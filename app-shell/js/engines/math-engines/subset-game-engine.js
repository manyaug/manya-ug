/**
 * Manya Subset Game Engine (vFinal - Repaired)
 * 
 * Capability:
 * 1. "The Lunchbox" / "Toy Van" (Drag & Drop Items into a container).
 * 2. "Flag Painter" (Tap to color stripes).
 * 3. Discovery Learning: Finds all 2^n combinations.
 */
export const SubsetGameEngine = {
    state: { 
        ctx: null, width: 0, height: 0, scale: 1,
        currentStep: 0, isResolved: false, data: null, 
        items: [], // { name, x, y, isInside, originalX, originalY }
        found: new Set(),
        dragging: null, dragOffset: {x:0,y:0},
        animState: { shake: 0, flash: 0 },
        theme: 'default' // 'default' (box) or 'flag'
    },

    ICONS: { 
        "Apple": "🍎", "Banana": "🍌", "Orange": "🍊", 
        "Mango": "🥭", "Pen": "🖊️", "Book": "📘", 
        "Car": "🚗", "Ball": "⚽", "Bear": "🧸", "Robot": "🤖", "Doll": "🪆",
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
            /* ROOT: Locks to viewport, prevents scrolling */
            .subset-root { 
                position: absolute; inset: 0;
                display: flex; flex-direction: column; 
                background: #f8fafc; overflow: hidden; 
                user-select: none;
            }
            
            /* CANVAS: Fills available space, shrinks if needed */
            .canvas-wrapper { 
                flex: 1 1 auto; 
                min-height: 0; /* CRITICAL for flexbox shrinking */
                position: relative; 
                width: 100%;
                background: radial-gradient(circle, #fff 0%, #f1f5f9 100%); 
                touch-action: none; /* Disables browser scrolling on drag */
            }
            
            canvas { display: block; width: 100%; height: 100%; object-fit: contain; }
            
            /* HUD: Pinned to bottom, accounts for Safe Area */
            .hud { 
                flex: 0 0 auto; 
                background: white; 
                padding: 12px 20px; 
                /* Padding for iPhone Home Bar */
                padding-bottom: calc(20px + env(safe-area-inset-bottom));
                border-top: 1px solid #e2e8f0; 
                display: flex; flex-direction: column; gap: 10px; 
                z-index: 100; box-shadow: 0 -5px 20px rgba(0,0,0,0.05); 
            }
            
            /* SHELF: Scrollable history of found subsets */
            .shelf-container { 
                display: flex; gap: 8px; overflow-x: auto; padding: 4px 0; 
                min-height: 45px; scrollbar-width: none;
            }
            .shelf-container::-webkit-scrollbar { display: none; }

            .shelf-item { 
                background: #f3e8ff; border: 1px solid #d8b4fe; color: #7e22ce; 
                padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 0.8rem;
                display: flex; align-items: center; flex-shrink: 0;
                animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .shelf-placeholder {
                border: 2px dashed #cbd5e1; color: #cbd5e1; padding: 4px 10px; 
                border-radius: 8px; font-weight: 700; font-size: 0.8rem;
                display: flex; align-items: center; justify-content: center; width: 35px; flex-shrink: 0;
            }
            
            /* BIG ACTION BUTTON */
            .btn-pack { 
                display: block; width: 100%;
                padding: 16px; 
                background: var(--manya-purple); color: white; border: none; 
                border-radius: 12px; font-weight: 800; font-size: 1.1rem; cursor: pointer; 
                box-shadow: 0 4px 0 #6d28d9; transition: transform 0.1s;
                margin-top: 5px;
            }
            .btn-pack:active { transform: translateY(3px); box-shadow: none; }
            .btn-pack:disabled { background: #22c55e; box-shadow: none; cursor: default; transform: none; }
            
            .instruction { text-align: center; color: #64748b; font-size: 0.9rem; font-weight: 700; }
            @keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
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
                    <button class="btn-pack" onclick="ManyaPack()">📦 CHECK</button>
                </div>
            </div>
        `;

        const canvas = document.getElementById('game-canvas');
        SubsetGameEngine.state.ctx = canvas.getContext('2d');
        
        // Init Interactions
        SubsetGameEngine.initInputs(canvas);

        // Responsive Resize Logic
        const handleResize = () => {
            const mount = document.getElementById('canvas-mount');
            if(!mount) return;
            const rect = mount.getBoundingClientRect();
            if(rect.width === 0) return; // Hidden

            const dpr = window.devicePixelRatio || 2;
            
            // Sync internal canvas size to CSS size
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            
            // Logic Scaling
            SubsetGameEngine.state.scale = dpr;
            SubsetGameEngine.state.width = canvas.width;
            SubsetGameEngine.state.height = canvas.height;
            
            // Re-calculate positions if items exist
            if (SubsetGameEngine.state.items.length > 0) SubsetGameEngine.layoutItems();
        };

        // Watch for layout changes (keyboard, rotation)
        new ResizeObserver(handleResize).observe(document.getElementById('canvas-mount'));
        
        // Start Loop
        const loop = () => { SubsetGameEngine.draw(); requestAnimationFrame(loop); };
        
        // Boot Sequence
        setTimeout(() => { 
            handleResize(); 
            SubsetGameEngine.loadLevel(0); 
            loop();
        }, 100);
    },

    // --- INPUT HANDLING (Touch/Mouse) ---
    initInputs: (canvas) => {
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            // Normalize coordinates
            return {
                x: (e.clientX - rect.left) * (canvas.width / rect.width),
                y: (e.clientY - rect.top) * (canvas.height / rect.height)
            };
        };

        const down = (e) => {
            if (e.target === canvas) e.preventDefault(); // Stop scroll
            if(SubsetGameEngine.state.isResolved && document.querySelector('.btn-pack').innerText.indexOf("NEXT") === -1) return;
            
            const p = getPos(e);
            
            // Hit Test (Top items first)
            const hitItem = [...SubsetGameEngine.state.items].reverse().find(item => {
                const dist = Math.sqrt((p.x - item.x)**2 + (p.y - item.y)**2);
                return dist < 80 * SubsetGameEngine.state.scale; // Generous hit radius
            });

            if(hitItem) {
                if (SubsetGameEngine.state.theme === 'flag') {
                    // Tap to Paint
                    hitItem.isInside = !hitItem.isInside;
                    // Bump Animation
                    hitItem.y -= 15; setTimeout(() => hitItem.y += 15, 100);
                } 
                else {
                    // Start Drag
                    SubsetGameEngine.state.dragging = hitItem;
                    SubsetGameEngine.state.dragOffset = { x: p.x - hitItem.x, y: p.y - hitItem.y };
                    canvas.setPointerCapture(e.pointerId); // Track outside canvas
                }
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
            
            // Drop Logic: Is it inside the box?
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
    },

    loadLevel: (index) => {
        if (index >= SubsetGameEngine.state.data.questions.length) return;
        
        const q = SubsetGameEngine.state.data.questions[index];
        SubsetGameEngine.state.currentStep = index;
        SubsetGameEngine.state.theme = q.theme || 'default';
        
        // Initialize Items
        const items = q.items.map(name => ({ name, x: 0, y: 0, isInside: false }));
        SubsetGameEngine.state.items = items;
        
        // Game Logic Setup
        SubsetGameEngine.state.totalSubsets = Math.pow(2, items.length);
        SubsetGameEngine.state.found = new Set();
        SubsetGameEngine.state.isResolved = false;
        
        // UI Updates
        document.getElementById('level-title').innerText = q.prompt;
        const btn = document.querySelector('.btn-pack');
        btn.innerText = SubsetGameEngine.state.theme === 'flag' ? "🎨 CHECK PATTERN" : "📦 PACK IT!";
        btn.disabled = false; btn.style.background = "var(--manya-purple)";
        btn.onclick = () => SubsetGameEngine.pack(); 
        
        // Shelf Reset
        const shelf = document.getElementById('math-shelf');
        shelf.innerHTML = '';
        for(let i=0; i<SubsetGameEngine.state.totalSubsets; i++) shelf.innerHTML += `<div class="shelf-placeholder" id="slot-${i}">?</div>`;
        
        SubsetGameEngine.layoutItems();
    },

    layoutItems: () => {
        const { width, height, items, scale } = SubsetGameEngine.state;
        const gap = width / (items.length + 1);
        const yPos = height - (80 * scale); // Inventory sits at bottom
        
        items.forEach((item, i) => {
            // Only move items if they aren't currently being interacted with
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
        
        // 1. Generate Key for current state
        const insideItems = items.filter(i => i.isInside).map(i => i.name).sort();
        const key = insideItems.join(',') || "EMPTY";
        
        // 2. Check Logic
        if(found.has(key)) {
            // Duplicate!
            SubsetGameEngine.state.animState.shake = 20;
            const btn = document.querySelector('.btn-pack');
            const old = btn.innerText; btn.innerText = "ALREADY FOUND!"; btn.style.background = "#ef4444";
            setTimeout(() => { btn.innerText = old; btn.style.background = "var(--manya-purple)"; }, 1000);
        } else {
            // Success!
            SubsetGameEngine.state.animState.flash = 15;
            found.add(key);
            const count = found.size;
            
            // 3. Update Shelf UI
            let label = "∅";
            if(key !== "EMPTY") {
                if (SubsetGameEngine.state.theme === 'flag') {
                    // Color squares for flags
                    label = insideItems.map(n => `<span style="display:inline-block;width:12px;height:12px;background:${SubsetGameEngine.COLORS[n]};border-radius:2px;margin:0 1px;border:1px solid #ccc;"></span>`).join('');
                } else {
                    // Emojis for lunchbox
                    label = `{ ${insideItems.map(n => SubsetGameEngine.ICONS[n] || n[0]).join(',')} }`;
                }
            }
            const slot = document.getElementById(`slot-${count-1}`);
            if(slot) { slot.className = 'shelf-item'; slot.innerHTML = label; }

            // 4. Reset for next attempt
            items.forEach(i => i.isInside = false);
            if (SubsetGameEngine.state.theme !== 'flag') SubsetGameEngine.layoutItems();

            // 5. Win Check
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

    // Browser-Safe Rounded Rect Helper
    drawRoundedRect: (ctx, x, y, w, h, r) => {
        ctx.beginPath(); ctx.moveTo(x+r, y);
        ctx.arcTo(x+w, y, x+w, y+h, r); ctx.arcTo(x+w, y+h, x, y+h, r);
        ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r); ctx.closePath();
    },

    draw: () => {
        const { ctx, width, height, items, scale, animState, theme } = SubsetGameEngine.state;
        if(!ctx || width === 0) return;

        ctx.clearRect(0, 0, width, height);

        // Visual Shake
        let shakeX = 0;
        if(animState.shake > 0) { shakeX = Math.sin(animState.shake) * 10 * scale; animState.shake--; }
        if(animState.flash > 0) animState.flash--;

        // Container Geometry
        const boxW = Math.min(400 * scale, width * 0.85);
        const boxH = Math.min(250 * scale, height * 0.5);
        const boxX = (width - boxW) / 2 + shakeX;
        const boxY = (height - boxH) / 2 - (40 * scale);

        // Flash Background
        if(animState.flash > 0) {
            ctx.fillStyle = `rgba(34, 197, 94, ${animState.flash / 20})`;
            SubsetGameEngine.drawRoundedRect(ctx, boxX - 20, boxY - 20, boxW + 40, boxH + 40, 30);
            ctx.fill();
        }

        if (theme === 'flag') {
            // == FLAG MODE ==
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
            // == BOX MODE ==
            ctx.fillStyle = "#ffffff"; ctx.strokeStyle = animState.shake > 0 ? "#ef4444" : "#94a3b8"; 
            ctx.lineWidth = 4;
            SubsetGameEngine.drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 20);
            ctx.fill(); ctx.stroke();
            
            // Draw items visually inside the box (Computed Grid Layout)
            const insideItems = items.filter(i => i.isInside);
            
            if(insideItems.length === 0) {
                ctx.fillStyle = "#cbd5e1"; ctx.font = `italic 700 ${20*scale}px sans-serif`; 
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText("EMPTY SET (∅)", width/2 + shakeX, boxY + boxH/2);
            } else {
                const gap = boxW / (insideItems.length + 1);
                insideItems.forEach((item, i) => {
                    const icon = SubsetGameEngine.ICONS[item.name] || "📦";
                    ctx.font = `${60*scale}px serif`;
                    ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    ctx.fillText(icon, boxX + gap*(i+1), boxY + boxH/2);
                });
            }
        }

        // Draw Inventory Items (Floating below)
        items.forEach(item => {
            // In Flag Mode, we draw buttons. In Box mode, we draw draggable icons.
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
            } 
            else {
                // BOX MODE: Only draw item if it's NOT inside (unless dragging)
                // If dragging, we draw it at cursor.
                // If inside, we ALREADY drew it in the box grid above.
                if (item.isInside && SubsetGameEngine.state.dragging !== item) return;

                const icon = SubsetGameEngine.ICONS[item.name] || "📦";
                const isSelected = item.isInside;
                ctx.save();
                ctx.translate(item.x, item.y);
                
                ctx.fillStyle = "rgba(0,0,0,0.05)";
                ctx.beginPath(); ctx.ellipse(0, 25*scale, 30*scale, 10*scale, 0, 0, Math.PI*2); ctx.fill();

                ctx.font = `${60*scale}px serif`; 
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText(icon, 0, 0);
                
                ctx.font = `bold ${12*scale}px sans-serif`; ctx.fillStyle = "#64748b";
                ctx.fillText(item.name, 0, 45*scale);
                ctx.restore();
            }
        });
    }
};

window.ManyaPack = () => SubsetGameEngine.pack();