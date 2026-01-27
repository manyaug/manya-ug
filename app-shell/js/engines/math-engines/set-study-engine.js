/**
 * Manya Math Study Engine (v10.0 - The Complete Suite)
 * 
 * VISUAL MODES:
 * 1. FINITE_BASKET: Pop-in animation for finite sets.
 * 2. INFINITE_ROAD: Perspective scrolling for infinite sets.
 * 3. MAPPING_DIAGRAM: Animated arrows for equivalent sets.
 * 4. EQUAL_SETS / DISJOINT_SETS: Comparison layouts.
 * 5. VENN_DIAGRAM: High-quality shading for operations (Union, Inter, etc).
 * 6. SUBSET_DIAGRAM (NEW): Nested circles with difference/subset shading.
 * 7. POWER_SET_TREE (NEW): Animated formula and subset generation logic.
 */

export const MathStudyEngine = {
    state: {
        currentSlideIndex: 0,
        data: null,
        ctx: null, width: 0, height: 0, scale: 1,
        tempCanvas: null, tempCtx: null, // Offscreen buffer for crisp shading
        animId: null, tick: 0
    },

    injectStyles: () => {
        if (document.getElementById('math-study-styles')) return;
        const style = document.createElement('style');
        style.id = 'math-study-styles';
        style.innerHTML = `
            .study-root { position: absolute; inset: 0; display: flex; flex-direction: column; background: #f8fafc; font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
            .visual-stage { height: 35vh; min-height: 200px; flex-shrink: 0; position: relative; width: 100%; background: #ffffff; z-index: 1; border-bottom: 1px solid #e2e8f0; }
            canvas { display: block; width: 100%; height: 100%; }
            .lesson-card { flex-grow: 1; display: flex; flex-direction: column; background: white; z-index: 10; overflow: hidden; }
            .card-header { flex: 0 0 auto; padding: 16px 20px; background: #fff; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
            .topic-badge { background: #f0f9ff; color: #0284c7; font-size: 0.75rem; font-weight: 800; padding: 6px 12px; border-radius: 6px; text-transform: uppercase; }
            .progress-pill { font-size: 0.8rem; font-weight: 700; color: #94a3b8; }
            .card-scroll-area { flex: 1; overflow-y: auto; padding: 24px; padding-bottom: 20px; -webkit-overflow-scrolling: touch; }
            .lesson-title { font-size: 1.4rem; font-weight: 800; color: #1e293b; margin: 0 0 12px 0; line-height: 1.2; }
            .lesson-body { font-size: 1.1rem; line-height: 1.6; color: #334155; }
            .sym { display: inline-block; background: #f1f5f9; color: #334155; font-family: monospace; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 0.9em; }
            .nav-bar { flex: 0 0 auto; padding: 16px 20px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); background: #ffffff; border-top: 1px solid #f1f5f9; display: flex; gap: 12px; box-shadow: 0 -5px 15px rgba(0,0,0,0.03); }
            .btn-nav { flex: 1; padding: 14px; border: none; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: 0.2s; }
            .btn-back { background: #f1f5f9; color: #64748b; flex: 0 0 80px;}
            .btn-next { background: #2563eb; color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
            .slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `;
        document.head.appendChild(style);
    },

    renderStudy: (container, data) => {
        MathStudyEngine.injectStyles();
        MathStudyEngine.state.data = data;
        MathStudyEngine.state.currentSlideIndex = 0;
        
        MathStudyEngine.state.tempCanvas = document.createElement('canvas');
        MathStudyEngine.state.tempCtx = MathStudyEngine.state.tempCanvas.getContext('2d');

        container.innerHTML = `
            <div class="study-root">
                <div class="visual-stage" id="visual-mount"><canvas id="study-canvas"></canvas></div>
                <div class="lesson-card">
                    <div class="card-header">
                        <span class="topic-badge">${data.topic}</span>
                        <span class="progress-pill" id="progress-txt">1 / ${data.slides.length}</span>
                    </div>
                    <div id="content-area" class="card-scroll-area"></div>
                    <div class="nav-bar">
                        <button class="btn-nav btn-back" onclick="ManyaStudyHandler('PREV')">Back</button>
                        <button class="btn-nav btn-next" id="btn-next" onclick="ManyaStudyHandler('NEXT')">Next</button>
                    </div>
                </div>
            </div>`;
        
        const canvas = document.getElementById('study-canvas');
        MathStudyEngine.state.ctx = canvas.getContext('2d');
        const resize = () => {
            const wrapper = document.getElementById('visual-mount');
            if(!wrapper || wrapper.clientHeight === 0) return;
            const dpr = window.devicePixelRatio || 2;
            
            canvas.width = wrapper.clientWidth * dpr; canvas.height = wrapper.clientHeight * dpr;
            MathStudyEngine.state.tempCanvas.width = canvas.width;
            MathStudyEngine.state.tempCanvas.height = canvas.height;
            
            MathStudyEngine.state.width = canvas.width; MathStudyEngine.state.height = canvas.height; MathStudyEngine.state.scale = dpr;
            MathStudyEngine.draw();
        };
        new ResizeObserver(resize).observe(document.getElementById('visual-mount'));
        setTimeout(resize, 100);
        MathStudyEngine.loadSlide(0);
        MathStudyEngine.startLoop();
    },

    loadSlide: (index) => {
        const { data } = MathStudyEngine.state;
        const slide = data.slides[index];
        MathStudyEngine.state.tick = 0; // Reset animation
        document.getElementById('progress-txt').innerText = `${index + 1} / ${data.slides.length}`;
        const content = document.getElementById('content-area');
        content.innerHTML = `<div class="slide-wrapper slide-up"><h2 class="lesson-title">${slide.title}</h2><div class="lesson-body">${slide.text}</div></div>`;
        content.scrollTop = 0;
        const btn = document.getElementById('btn-next');
        if (index === data.slides.length - 1) { btn.innerText = "Finish"; btn.style.background = "#16a34a"; }
        else { btn.innerText = "Next Step"; btn.style.background = "#2563eb"; }
    },

    handleNav: (dir) => {
        const s = MathStudyEngine.state;
        if (dir === 'NEXT') {
            if (s.currentSlideIndex < s.data.slides.length - 1) { s.currentSlideIndex++; MathStudyEngine.loadSlide(s.currentSlideIndex); }
            else { alert("Module Complete!"); }
        } else { if (s.currentSlideIndex > 0) { s.currentSlideIndex--; MathStudyEngine.loadSlide(s.currentSlideIndex); } }
    },

    startLoop: () => {
        if (MathStudyEngine.state.animId) cancelAnimationFrame(MathStudyEngine.state.animId);
        const loop = () => { MathStudyEngine.state.tick++; MathStudyEngine.draw(); MathStudyEngine.state.animId = requestAnimationFrame(loop); };
        loop();
    },

    // ================== DRAWING LOGIC ==================
    draw: () => {
        const { ctx, tempCtx, tempCanvas, width, height, scale, data, currentSlideIndex, tick } = MathStudyEngine.state;
        if (!width || !height) return;
        
        ctx.clearRect(0, 0, width, height);
        
        // Background Grid
        ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 1 * scale; ctx.beginPath();
        const gs = 40 * scale;
        for(let x=0; x<width; x+=gs) { ctx.moveTo(x,0); ctx.lineTo(x,height); }
        for(let y=0; y<height; y+=gs) { ctx.moveTo(0,y); ctx.lineTo(width,y); }
        ctx.stroke();

        const slide = data.slides[currentSlideIndex];
        const cx = width / 2; const cy = height / 2;
        const s = scale;

        // ----------------------------------------------
        // 1. FINITE BASKET (Items popping in)
        // ----------------------------------------------
        if (slide.visualType === 'FINITE_BASKET') {
            const items = slide.visualData || [];
            const r = Math.min(width, height) * 0.35;
            
            ctx.beginPath(); ctx.ellipse(cx, cy, r, r*0.7, 0, 0, Math.PI*2);
            ctx.fillStyle = "rgba(147, 51, 234, 0.05)"; ctx.fill();
            ctx.strokeStyle = "#9333ea"; ctx.lineWidth = 4*s; ctx.stroke();
            
            ctx.fillStyle = "#9333ea"; ctx.font = `bold ${18*s}px sans-serif`;
            ctx.fillText("Set A", cx - r + 10*s, cy - r*0.6);

            items.forEach((item, i) => {
                const angle = (i / items.length) * Math.PI * 2;
                const dist = r * 0.4;
                const ix = cx + Math.cos(angle) * dist;
                const iy = cy + Math.sin(angle) * dist * 0.7;

                const delay = i * 20;
                const progress = Math.min(1, Math.max(0, (tick - delay) / 30));
                const elastic = progress === 1 ? 1 : Math.sin(progress * Math.PI/2) * 1.1; 
                const size = elastic * (r * 0.25); 

                if (size > 0) {
                    ctx.beginPath(); ctx.arc(ix, iy, size, 0, Math.PI*2);
                    ctx.fillStyle = "#f3e8ff"; ctx.fill(); ctx.strokeStyle = "#7e22ce"; ctx.lineWidth=2*s; ctx.stroke();
                    ctx.fillStyle = "#581c87"; ctx.font = `bold ${size*0.8}px sans-serif`;
                    ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    ctx.fillText(item, ix, iy);
                }
            });

            if (slide.showCount && tick > 60) {
                 const alpha = Math.min(1, (tick - 60) / 20);
                 ctx.save(); ctx.globalAlpha = alpha;
                 ctx.fillStyle = "#db2777"; ctx.font = `bold ${30*s}px sans-serif`;
                 ctx.shadowColor="white"; ctx.shadowBlur=10; ctx.textAlign="center";
                 ctx.fillText(`n(A) = ${items.length}`, cx, cy + r*0.9);
                 ctx.restore();
            }
        }

        // ----------------------------------------------
        // 2. INFINITE ROAD (Scrolling Numbers)
        // ----------------------------------------------
        else if (slide.visualType === 'INFINITE_ROAD') {
            const speed = 2 * s; 
            const offset = (tick * speed) % 150;
            
            ctx.beginPath(); 
            ctx.moveTo(cx - 20*s, cy - 60*s); 
            ctx.lineTo(cx + 20*s, cy - 60*s); 
            ctx.lineTo(width + 50*s, height); 
            ctx.lineTo(-50*s, height); 
            ctx.fillStyle = "#e0f2fe"; ctx.fill();
            
            ctx.strokeStyle = "#0ea5e9"; ctx.lineWidth = 3*s;
            for(let i=0; i<6; i++) {
                const yPos = (cy - 30*s) + ((i * 100 * s + offset) % (height/1.2));
                const scaleFactor = (yPos - (cy-60*s)) / height;
                const wLine = 20*s + (scaleFactor * 300*s);
                if (yPos > cy - 60*s) {
                    ctx.beginPath(); ctx.moveTo(cx - wLine, yPos); ctx.lineTo(cx + wLine, yPos); ctx.stroke();
                    ctx.fillStyle = "#0369a1"; ctx.font = `bold ${30 * s * scaleFactor}px sans-serif`; ctx.textAlign="center";
                    ctx.fillText(Math.floor(tick/20) + i, cx, yPos - 5*s);
                }
            }
            const pulse = 1 + Math.sin(tick * 0.1) * 0.1;
            ctx.font = `bold ${60*s}px serif`; ctx.fillStyle = "#ef4444"; ctx.textAlign = "center";
            ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.fillText("...", 0, 0); ctx.restore();
        }

        // ----------------------------------------------
        // 3. MAPPING DIAGRAM (Equivalent Sets)
        // ----------------------------------------------
        else if (slide.visualType === 'MAPPING_DIAGRAM') {
            const rX = width * 0.12; const rY = height * 0.35;
            const x1 = cx - width*0.2; const x2 = cx + width*0.2;
            
            ctx.strokeStyle = "#9333ea"; ctx.lineWidth = 3*s;
            ctx.beginPath(); ctx.ellipse(x1, cy, rX, rY, 0, 0, Math.PI*2); ctx.stroke();
            ctx.strokeStyle = "#db2777";
            ctx.beginPath(); ctx.ellipse(x2, cy, rX, rY, 0, 0, Math.PI*2); ctx.stroke();
            
            ctx.fillStyle = "#9333ea"; ctx.font = `bold ${16*s}px sans-serif`; ctx.fillText("A", x1, cy-rY-10*s);
            ctx.fillStyle = "#db2777"; ctx.fillText("B", x2, cy-rY-10*s);

            const itemsA = slide.itemsA || []; const itemsB = slide.itemsB || [];
            
            itemsA.forEach((it, i) => {
                const step = (rY * 1.5) / itemsA.length;
                const yPos = cy - (rY*0.6) + (i*step);
                ctx.fillStyle = "#1e293b"; ctx.font = `bold ${18*s}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
                ctx.fillText(it, x1, yPos); ctx.fillText(itemsB[i], x2, yPos);

                if (tick > i * 30) {
                    const progress = Math.min(1, (tick - i*30)/40);
                    const startX = x1 + 10*s; const endX = x2 - 10*s;
                    const curX = startX + (endX - startX) * progress;
                    ctx.beginPath(); ctx.moveTo(startX, yPos); ctx.lineTo(curX, yPos);
                    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2*s; ctx.stroke();
                    if(progress === 1) { ctx.beginPath(); ctx.moveTo(curX-5*s, yPos-4*s); ctx.lineTo(curX, yPos); ctx.lineTo(curX-5*s, yPos+4*s); ctx.stroke(); }
                }
            });
        }

        // ----------------------------------------------
        // 4. SUBSET DIAGRAM (Baby Inside Mother) -- NEW
        // ----------------------------------------------
        else if (slide.visualType === 'SUBSETS_DIAGRAM') {
            // Big Circle (B)
            const rB = Math.min(width, height) * 0.35;
            // Small Circle (A) inside
            const rA = rB * 0.55;
            const yOffset = rB * 0.3; // Offset A downwards inside B
            const hl = slide.highlight || [];

            // Shading Logic
            const drawShade = () => {
                tempCtx.globalCompositeOperation = 'source-over';
                tempCtx.clearRect(0,0,width,height);

                if (hl.includes('subset')) {
                    // Fill A
                    tempCtx.fillStyle = '#fde047'; 
                    tempCtx.beginPath(); tempCtx.arc(cx, cy + yOffset, rA, 0, Math.PI*2); tempCtx.fill();
                }
                if (hl.includes('difference')) {
                    // Fill B, Cut A
                    tempCtx.fillStyle = '#e9d5ff'; 
                    tempCtx.beginPath(); tempCtx.arc(cx, cy, rB, 0, Math.PI*2); tempCtx.fill();
                    tempCtx.globalCompositeOperation = 'destination-out';
                    tempCtx.beginPath(); tempCtx.arc(cx, cy + yOffset, rA, 0, Math.PI*2); tempCtx.fill();
                }
                ctx.drawImage(tempCanvas, 0, 0);
            };
            drawShade();

            // Outlines
            ctx.lineWidth = 3*s;
            ctx.strokeStyle = "#9333ea"; ctx.beginPath(); ctx.arc(cx, cy, rB, 0, Math.PI*2); ctx.stroke(); // B
            ctx.strokeStyle = "#db2777"; ctx.beginPath(); ctx.arc(cx, cy + yOffset, rA, 0, Math.PI*2); ctx.stroke(); // A

            // Labels
            ctx.font = `bold ${22*s}px sans-serif`;
            ctx.fillStyle = "#9333ea"; ctx.fillText(slide.labels[1], cx, cy - rB + 25*s); 
            ctx.fillStyle = "#db2777"; ctx.fillText(slide.labels[0], cx, cy + yOffset); 

            // Elements
            if(slide.elements) {
                ctx.font = `bold ${16*s}px sans-serif`; ctx.fillStyle = "#1e293b"; ctx.textAlign="center";
                if(slide.elements.subset) ctx.fillText(slide.elements.subset, cx, cy + yOffset + 20*s);
                if(slide.elements.difference) ctx.fillText(slide.elements.difference, cx, cy - rB*0.3);
            }
        }

        // ----------------------------------------------
        // 5. POWER SET TREE (2^n Formula) -- NEW
        // ----------------------------------------------
        if (slide.visualType === 'POWER_SET_TREE') {
            const items = slide.items || ["a", "b"];
            const n = items.length;
            const total = Math.pow(2, n);
            const isProper = slide.showProper === true; // NEW FLAG
            
            // 1. Draw Title Formula
            ctx.fillStyle = "#1e293b"; ctx.textAlign="center";
            ctx.font = `bold ${24*s}px sans-serif`;
            ctx.fillText(`Set { ${items.join(', ')} }`, cx, cy - 80*s);
            
            if(tick > 20) {
                const scalePulse = 1 + Math.sin(tick*0.1)*0.05;
                ctx.save(); ctx.translate(cx, cy - 40*s); ctx.scale(scalePulse, scalePulse);
                
                if (isProper) {
                    // Proper Formula
                    ctx.fillStyle = "#db2777"; 
                    ctx.fillText(`Proper = 2${n===2?'²':'³'} - 1 = ${total-1}`, 0, 0);
                } else {
                    // Regular Formula
                    ctx.fillStyle = "#2563eb"; 
                    ctx.fillText(`Subsets = 2${n===2?'²':'³'} = ${total}`, 0, 0);
                }
                ctx.restore();
            }

            // 2. Draw Grid of Subsets
            if (tick > 60) {
                const startY = cy + 20*s;
                ctx.font = `bold ${18*s}px monospace`;
                
                // Hardcoded sequences for visual stability
                const subsets = n===2 
                    ? ["{a,b}", "{a}", "{b}", "{}"] 
                    : ["{abc}", "{a,b}", "{a,c}", "{b,c}", "{a}", "{b}", "{c}", "{}"];

                subsets.forEach((sub, i) => {
                    if(tick > 60 + (i*10)) {
                        const col = i % 4;
                        const row = Math.floor(i / 4);
                        const x = cx + (col - 1.5) * 80*s;
                        const y = startY + (row * 40*s);
                        
                        // Check if this is the "Improper" subset (Full Set)
                        // For n=2, it's "{a,b}" (index 0). For n=3, it's "{abc}" (index 0).
                        const isImproper = (i === 0); 

                        if (isProper && isImproper) {
                            // CROSS IT OUT
                            ctx.fillStyle = "#94a3b8"; // Gray
                            ctx.fillText(sub, x, y);
                            
                            // Red Strike line
                            ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3*s;
                            const textW = ctx.measureText(sub).width;
                            ctx.beginPath(); ctx.moveTo(x - textW/2, y - 5*s); ctx.lineTo(x + textW/2, y - 5*s); ctx.stroke();
                            
                            // Label
                            ctx.fillStyle = "#ef4444"; ctx.font = `bold ${10*s}px sans-serif`;
                            ctx.fillText("Improper", x, y - 20*s);
                            ctx.font = `bold ${18*s}px monospace`; // Reset font
                        } else {
                            // Normal Subset
                            ctx.fillStyle = isProper ? "#16a34a" : "#db2777"; // Green if proper mode, Pink otherwise
                            ctx.fillText(sub, x, y);
                        }
                    }
                });
            }
        }

        // ----------------------------------------------
        // 6. EQUAL / DISJOINT SETS
        // ----------------------------------------------
        else if (slide.visualType === 'EQUAL_SETS' || slide.visualType === 'DISJOINT_SETS') {
            const r = Math.min(width, height) * 0.22;
            
            if (slide.visualType === 'DISJOINT_SETS') {
                const x1 = cx - r * 1.4; const x2 = cx + r * 1.4;
                ctx.lineWidth = 3*s;
                ctx.strokeStyle = "#9333ea"; ctx.beginPath(); ctx.arc(x1, cy, r, 0, Math.PI*2); ctx.stroke();
                ctx.strokeStyle = "#db2777"; ctx.beginPath(); ctx.arc(x2, cy, r, 0, Math.PI*2); ctx.stroke();
                
                ctx.textAlign = "center"; ctx.font = `bold ${18*s}px sans-serif`;
                ctx.fillStyle = "#9333ea"; ctx.fillText(slide.labels[0], x1, cy - r - 10*s);
                ctx.fillStyle = "#db2777"; ctx.fillText(slide.labels[1], x2, cy - r - 10*s);
                
                const pulse = 1 + Math.sin(tick*0.2)*0.1; ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse);
                ctx.fillStyle = "#ef4444"; ctx.font = `bold ${40*s}px sans-serif`; ctx.textAlign="center";
                ctx.fillText("≠", 0, 10*s); ctx.restore();
            } else {
                ctx.lineWidth = 4*s; ctx.strokeStyle = "#2563eb";
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
                ctx.textAlign = "center"; 
                ctx.font = `bold ${20*s}px sans-serif`; ctx.fillStyle = "#2563eb";
                ctx.fillText(slide.labels[0] + " = " + slide.labels[1], cx, cy - r - 15*s);
                ctx.fillStyle = "#1e293b"; ctx.font = `bold ${18*s}px sans-serif`;
                ctx.fillText(slide.items, cx, cy);
            }
        }

        // ----------------------------------------------
        // 7. VENN DIAGRAM (The Buffer Shading Version)
        // ----------------------------------------------
        else if (slide.visualType === 'VENN_DIAGRAM') {
            const hl = slide.highlight || []; 
            const r = Math.min(width, height) * 0.25;
            const offset = r * 0.6;
            const c1 = { x: cx - offset, y: cy };
            const c2 = { x: cx + offset, y: cy };
            
            const drawZone = (zone, color) => {
                tempCtx.globalCompositeOperation = 'source-over';
                tempCtx.clearRect(0,0,width,height);
                if (zone === 'center') {
                    tempCtx.beginPath(); tempCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tempCtx.fillStyle = color; tempCtx.fill();
                    tempCtx.globalCompositeOperation = 'source-in'; tempCtx.beginPath(); tempCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tempCtx.fill();
                } else if (zone === 'left') {
                    tempCtx.beginPath(); tempCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tempCtx.fillStyle = color; tempCtx.fill();
                    tempCtx.globalCompositeOperation = 'destination-out'; tempCtx.beginPath(); tempCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tempCtx.fill();
                } else if (zone === 'right') {
                    tempCtx.beginPath(); tempCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tempCtx.fillStyle = color; tempCtx.fill();
                    tempCtx.globalCompositeOperation = 'destination-out'; tempCtx.beginPath(); tempCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tempCtx.fill();
                } else if (zone === 'outside') {
                    tempCtx.fillStyle = color; tempCtx.fillRect(cx - r*2.5, cy - r*1.5, r*5, r*3);
                    tempCtx.globalCompositeOperation = 'destination-out'; tempCtx.beginPath(); tempCtx.arc(c1.x, c1.y, r, 0, Math.PI*2); tempCtx.fill();
                    tempCtx.beginPath(); tempCtx.arc(c2.x, c2.y, r, 0, Math.PI*2); tempCtx.fill();
                }
                ctx.drawImage(tempCanvas, 0, 0);
            };

            if(hl.includes('outside')) drawZone('outside', '#f1f5f9');
            if(hl.includes('left')) drawZone('left', '#e9d5ff');
            if(hl.includes('right')) drawZone('right', '#fbcfe8');
            if(hl.includes('center')) drawZone('center', '#fde047');

            ctx.lineWidth = 2*s; ctx.strokeStyle = "#94a3b8"; ctx.strokeRect(cx - r*2.5, cy - r*1.5, r*5, r*3);
            ctx.lineWidth = 3*s; ctx.strokeStyle = "#9333ea"; ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.stroke();
            ctx.strokeStyle = "#db2777"; ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.stroke();
            
            ctx.font = `bold ${20*s}px sans-serif`;
            ctx.fillStyle = "#64748b"; ctx.fillText("ξ", cx - r*2.3, cy - r*1.2);
            ctx.fillStyle = "#9333ea"; ctx.fillText(slide.labels?.[0] || "A", c1.x - r, c1.y - r);
            ctx.fillStyle = "#db2777"; ctx.fillText(slide.labels?.[1] || "B", c2.x + r, c2.y - r);

            if(slide.elements) {
                ctx.font = `bold ${18*s}px sans-serif`; ctx.fillStyle = "#1e293b"; ctx.textAlign = "center";
                if(slide.elements.left) ctx.fillText(slide.elements.left, c1.x - r/2, cy);
                if(slide.elements.center) ctx.fillText(slide.elements.center, cx, cy);
                if(slide.elements.right) ctx.fillText(slide.elements.right, c2.x + r/2, cy);
                if(slide.elements.outside) {
                     const parts = slide.elements.outside.split(',');
                     ctx.fillStyle = "#475569"; ctx.fillText(parts[0], cx - r*2.2, cy + r*1.2); 
                     if(parts[1]) ctx.fillText(parts[1], cx + r*2.2, cy + r*1.2);
                }
            }
        }
    }
};

window.ManyaStudyHandler = (a) => MathStudyEngine.handleNav(a);