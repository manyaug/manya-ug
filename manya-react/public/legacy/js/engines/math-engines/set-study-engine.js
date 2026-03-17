/**
 * Manya Math Study Engine (v11.0 - Pink/Purple Integrated Theme)
 * 
 * UPDATES:
 * - Removed fullscreen absolute positioning (Fits inside QuestRunner).
 * - Replaced Blue theme with Manya Pink/Purple.
 * - Updated Canvas drawings to match branding.
 * - Connected "Finish" button to QuestRunner.next().
 */

export const MathStudyEngine = {
    state: {
        currentSlideIndex: 0,
        data: null,
        ctx: null, width: 0, height: 0, scale: 1,
        tempCanvas: null, tempCtx: null, 
        animId: null, tick: 0
    },

    injectStyles: () => {
        if (document.getElementById('math-study-styles')) return;
        const style = document.createElement('style');
        style.id = 'math-study-styles';
        style.innerHTML = `
            /* --- LAYOUT: Relative to Parent (No longer fullscreen absolute) --- */
            .study-root { 
                position: relative; 
                width: 100%; 
                height: 100%; 
                display: flex; 
                flex-direction: column; 
                background: white; 
                font-family: 'Nunito', 'Plus Jakarta Sans', sans-serif; 
                overflow: hidden; 
                border-radius: 20px; /* rounded corners to fit card feel */
            }

            /* --- VISUAL STAGE --- */
            .visual-stage { 
                height: 35vh; 
                min-height: 220px; 
                flex-shrink: 0; 
                position: relative; 
                width: 100%; 
                background: #FDFBF7; /* Cream bg */
                z-index: 1; 
                border-bottom: 2px solid #F1EFE9; 
            }
            canvas { display: block; width: 100%; height: 100%; }

            /* --- CARD CONTENT --- */
            .lesson-card { 
                flex-grow: 1; 
                display: flex; 
                flex-direction: column; 
                background: white; 
                z-index: 10; 
                overflow: hidden; 
            }

            .card-header { 
                flex: 0 0 auto; 
                padding: 15px 20px; 
                background: #fff; 
                border-bottom: 1px solid #f1f5f9; 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
            }

            /* MANYA THEME BADGES */
            .topic-badge { 
                background: #FCE7F3; /* Pink Light */
                color: #DB2777;      /* Manya Pink */
                font-size: 0.7rem; 
                font-weight: 900; 
                padding: 6px 12px; 
                border-radius: 50px; 
                text-transform: uppercase; 
                letter-spacing: 1px;
            }

            .progress-pill { 
                font-size: 0.8rem; 
                font-weight: 800; 
                color: #94a3b8; 
            }

            .card-scroll-area { 
                flex: 1; 
                overflow-y: auto; 
                padding: 20px 25px; 
                padding-bottom: 20px; 
                -webkit-overflow-scrolling: touch; 
            }

            .lesson-title { 
                font-size: 1.4rem; 
                font-weight: 900; 
                color: #1e293b; 
                margin: 0 0 12px 0; 
                line-height: 1.2; 
            }

            .lesson-body { 
                font-size: 1.1rem; 
                line-height: 1.6; 
                color: #334155; 
                font-weight: 600;
            }

            /* --- NAVIGATION BAR --- */
            .nav-bar { 
                flex: 0 0 auto; 
                padding: 15px 20px; 
                background: #ffffff; 
                border-top: 1px solid #f1f5f9; 
                display: flex; 
                gap: 12px; 
            }

            .btn-nav { 
                padding: 14px; 
                border: none; 
                border-radius: 16px; 
                font-weight: 800; 
                font-size: 1rem; 
                cursor: pointer; 
                transition: transform 0.1s; 
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .btn-nav:active { transform: translateY(2px); }

            .btn-back { 
                background: #f1f5f9; 
                color: #64748b; 
                flex: 0 0 80px; 
            }

            .btn-next { 
                flex: 1;
                background: #DB2777; /* Manya Pink */
                color: white; 
                box-shadow: 0 4px 0 #9F1239; /* Darker Pink Shadow */
            }

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
                        <span class="topic-badge">${data.topic || "LESSON"}</span>
                        <span class="progress-pill" id="progress-txt">1 / ${data.slides.length}</span>
                    </div>
                    <div id="content-area" class="card-scroll-area"></div>
                    <div class="nav-bar">
                        <button class="btn-nav btn-back" onclick="ManyaStudyHandler('PREV')">Back</button>
                        <button class="btn-nav btn-next" id="btn-next" onclick="ManyaStudyHandler('NEXT')">NEXT STEP</button>
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
        
        // Button Logic
        const btn = document.getElementById('btn-next');
        if (index === data.slides.length - 1) { 
            btn.innerText = "FINISH"; 
            btn.style.background = "#7C3AED"; // Purple for finish
            btn.style.boxShadow = "0 4px 0 #5B21B6";
        } else { 
            btn.innerText = "NEXT STEP"; 
            btn.style.background = "#DB2777"; // Pink for continue
            btn.style.boxShadow = "0 4px 0 #9F1239";
        }
    },

    handleNav: (dir) => {
        const s = MathStudyEngine.state;
        if (dir === 'NEXT') {
            if (s.currentSlideIndex < s.data.slides.length - 1) { 
                s.currentSlideIndex++; 
                MathStudyEngine.loadSlide(s.currentSlideIndex); 
            } else { 
                // CONNECTED TO QUEST RUNNER
                if (window.QuestRunner) window.QuestRunner.next();
                else alert("Lesson Complete!"); 
            }
        } else { 
            if (s.currentSlideIndex > 0) { 
                s.currentSlideIndex--; 
                MathStudyEngine.loadSlide(s.currentSlideIndex); 
            } 
        }
    },

    startLoop: () => {
        if (MathStudyEngine.state.animId) cancelAnimationFrame(MathStudyEngine.state.animId);
        const loop = () => { 
            if (!document.getElementById('study-canvas')) return;
            MathStudyEngine.state.tick++; 
            MathStudyEngine.draw(); 
            MathStudyEngine.state.animId = requestAnimationFrame(loop); 
        };
        loop();
    },

    // ================== DRAWING LOGIC (THEMED) ==================
    draw: () => {
        const { ctx, tempCtx, tempCanvas, width, height, scale, data, currentSlideIndex, tick } = MathStudyEngine.state;
        if (!width || !height) return;
        
        ctx.clearRect(0, 0, width, height);
        
        // Background Grid (Soft Grey)
        ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 1 * scale; ctx.beginPath();
        const gs = 40 * scale;
        for(let x=0; x<width; x+=gs) { ctx.moveTo(x,0); ctx.lineTo(x,height); }
        for(let y=0; y<height; y+=gs) { ctx.moveTo(0,y); ctx.lineTo(width,y); }
        ctx.stroke();

        const slide = data.slides[currentSlideIndex];
        const cx = width / 2; const cy = height / 2;
        const s = scale;

        // ----------------------------------------------
        // 1. FINITE BASKET (Theme: Purple)
        // ----------------------------------------------
        if (slide.visualType === 'FINITE_BASKET') {
            const items = slide.visualData || [];
            const r = Math.min(width, height) * 0.35;
            
            ctx.beginPath(); ctx.ellipse(cx, cy, r, r*0.7, 0, 0, Math.PI*2);
            ctx.fillStyle = "rgba(124, 58, 237, 0.05)"; // Purple Tint
            ctx.fill();
            ctx.strokeStyle = "#7C3AED"; ctx.lineWidth = 4*s; ctx.stroke();
            
            ctx.fillStyle = "#7C3AED"; ctx.font = `bold ${18*s}px sans-serif`;
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
                 ctx.fillStyle = "#DB2777"; ctx.font = `bold ${30*s}px sans-serif`;
                 ctx.shadowColor="white"; ctx.shadowBlur=10; ctx.textAlign="center";
                 ctx.fillText(`n(A) = ${items.length}`, cx, cy + r*0.9);
                 ctx.restore();
            }
        }

        // ----------------------------------------------
        // 2. INFINITE ROAD (Theme: Blue -> Pink/Purple)
        // ----------------------------------------------
        else if (slide.visualType === 'INFINITE_ROAD') {
            const speed = 2 * s; 
            const offset = (tick * speed) % 150;
            
            ctx.beginPath(); 
            ctx.moveTo(cx - 20*s, cy - 60*s); 
            ctx.lineTo(cx + 20*s, cy - 60*s); 
            ctx.lineTo(width + 50*s, height); 
            ctx.lineTo(-50*s, height); 
            ctx.fillStyle = "#FCE7F3"; // Pink Light
            ctx.fill();
            
            ctx.strokeStyle = "#DB2777"; // Pink Dark
            ctx.lineWidth = 3*s;
            for(let i=0; i<6; i++) {
                const yPos = (cy - 30*s) + ((i * 100 * s + offset) % (height/1.2));
                const scaleFactor = (yPos - (cy-60*s)) / height;
                const wLine = 20*s + (scaleFactor * 300*s);
                if (yPos > cy - 60*s) {
                    ctx.beginPath(); ctx.moveTo(cx - wLine, yPos); ctx.lineTo(cx + wLine, yPos); ctx.stroke();
                    ctx.fillStyle = "#9F1239"; ctx.font = `bold ${30 * s * scaleFactor}px sans-serif`; ctx.textAlign="center";
                    ctx.fillText(Math.floor(tick/20) + i, cx, yPos - 5*s);
                }
            }
            const pulse = 1 + Math.sin(tick * 0.1) * 0.1;
            ctx.font = `bold ${60*s}px serif`; ctx.fillStyle = "#7C3AED"; ctx.textAlign = "center";
            ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.fillText("...", 0, 0); ctx.restore();
        }

        // ----------------------------------------------
        // 3. MAPPING DIAGRAM (Equivalent Sets)
        // ----------------------------------------------
        else if (slide.visualType === 'MAPPING_DIAGRAM') {
            const rX = width * 0.12; const rY = height * 0.35;
            const x1 = cx - width*0.2; const x2 = cx + width*0.2;
            
            ctx.strokeStyle = "#7C3AED"; ctx.lineWidth = 3*s;
            ctx.beginPath(); ctx.ellipse(x1, cy, rX, rY, 0, 0, Math.PI*2); ctx.stroke();
            ctx.strokeStyle = "#DB2777";
            ctx.beginPath(); ctx.ellipse(x2, cy, rX, rY, 0, 0, Math.PI*2); ctx.stroke();
            
            ctx.fillStyle = "#7C3AED"; ctx.font = `bold ${16*s}px sans-serif`; ctx.fillText("A", x1, cy-rY-10*s);
            ctx.fillStyle = "#DB2777"; ctx.fillText("B", x2, cy-rY-10*s);

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
        // 4. SUBSET DIAGRAM
        // ----------------------------------------------
        else if (slide.visualType === 'SUBSETS_DIAGRAM') {
            const rB = Math.min(width, height) * 0.35;
            const rA = rB * 0.55;
            const yOffset = rB * 0.3;
            const hl = slide.highlight || [];

            const drawShade = () => {
                tempCtx.globalCompositeOperation = 'source-over';
                tempCtx.clearRect(0,0,width,height);

                if (hl.includes('subset')) {
                    tempCtx.fillStyle = '#FCE7F3'; // Pink Light
                    tempCtx.beginPath(); tempCtx.arc(cx, cy + yOffset, rA, 0, Math.PI*2); tempCtx.fill();
                }
                if (hl.includes('difference')) {
                    tempCtx.fillStyle = '#EDE9FE'; // Purple Light
                    tempCtx.beginPath(); tempCtx.arc(cx, cy, rB, 0, Math.PI*2); tempCtx.fill();
                    tempCtx.globalCompositeOperation = 'destination-out';
                    tempCtx.beginPath(); tempCtx.arc(cx, cy + yOffset, rA, 0, Math.PI*2); tempCtx.fill();
                }
                ctx.drawImage(tempCanvas, 0, 0);
            };
            drawShade();

            ctx.lineWidth = 3*s;
            ctx.strokeStyle = "#7C3AED"; ctx.beginPath(); ctx.arc(cx, cy, rB, 0, Math.PI*2); ctx.stroke(); 
            ctx.strokeStyle = "#DB2777"; ctx.beginPath(); ctx.arc(cx, cy + yOffset, rA, 0, Math.PI*2); ctx.stroke(); 

            ctx.font = `bold ${22*s}px sans-serif`;
            ctx.fillStyle = "#7C3AED"; ctx.fillText(slide.labels[1], cx, cy - rB + 25*s); 
            ctx.fillStyle = "#DB2777"; ctx.fillText(slide.labels[0], cx, cy + yOffset); 
        }

        // ----------------------------------------------
        // 5. POWER SET TREE (Theme: Pink/Purple)
        // ----------------------------------------------
        if (slide.visualType === 'POWER_SET_TREE') {
            const items = slide.items || ["a", "b"];
            const n = items.length;
            const total = Math.pow(2, n);
            const isProper = slide.showProper === true; 
            
            ctx.fillStyle = "#1e293b"; ctx.textAlign="center";
            ctx.font = `bold ${24*s}px sans-serif`;
            ctx.fillText(`Set { ${items.join(', ')} }`, cx, cy - 80*s);
            
            if(tick > 20) {
                const scalePulse = 1 + Math.sin(tick*0.1)*0.05;
                ctx.save(); ctx.translate(cx, cy - 40*s); ctx.scale(scalePulse, scalePulse);
                if (isProper) {
                    ctx.fillStyle = "#DB2777"; 
                    ctx.fillText(`Proper = 2${n===2?'²':'³'} - 1 = ${total-1}`, 0, 0);
                } else {
                    ctx.fillStyle = "#7C3AED"; 
                    ctx.fillText(`Subsets = 2${n===2?'²':'³'} = ${total}`, 0, 0);
                }
                ctx.restore();
            }

            if (tick > 60) {
                const startY = cy + 20*s;
                ctx.font = `bold ${18*s}px monospace`;
                const subsets = n===2 ? ["{a,b}", "{a}", "{b}", "{}"] : ["{abc}", "{a,b}", "{a,c}", "{b,c}", "{a}", "{b}", "{c}", "{}"];

                subsets.forEach((sub, i) => {
                    if(tick > 60 + (i*10)) {
                        const col = i % 4;
                        const row = Math.floor(i / 4);
                        const x = cx + (col - 1.5) * 80*s;
                        const y = startY + (row * 40*s);
                        const isImproper = (i === 0); 

                        if (isProper && isImproper) {
                            ctx.fillStyle = "#94a3b8"; ctx.fillText(sub, x, y);
                            ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3*s;
                            const textW = ctx.measureText(sub).width;
                            ctx.beginPath(); ctx.moveTo(x - textW/2, y - 5*s); ctx.lineTo(x + textW/2, y - 5*s); ctx.stroke();
                        } else {
                            ctx.fillStyle = isProper ? "#16a34a" : "#DB2777"; 
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
                ctx.strokeStyle = "#7C3AED"; ctx.beginPath(); ctx.arc(x1, cy, r, 0, Math.PI*2); ctx.stroke();
                ctx.strokeStyle = "#DB2777"; ctx.beginPath(); ctx.arc(x2, cy, r, 0, Math.PI*2); ctx.stroke();
                
                ctx.textAlign = "center"; ctx.font = `bold ${18*s}px sans-serif`;
                ctx.fillStyle = "#7C3AED"; ctx.fillText(slide.labels[0], x1, cy - r - 10*s);
                ctx.fillStyle = "#DB2777"; ctx.fillText(slide.labels[1], x2, cy - r - 10*s);
                
                const pulse = 1 + Math.sin(tick*0.2)*0.1; ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse);
                ctx.fillStyle = "#ef4444"; ctx.font = `bold ${40*s}px sans-serif`; ctx.textAlign="center";
                ctx.fillText("≠", 0, 10*s); ctx.restore();
            } else {
                ctx.lineWidth = 4*s; ctx.strokeStyle = "#7C3AED";
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
                ctx.textAlign = "center"; 
                ctx.font = `bold ${20*s}px sans-serif`; ctx.fillStyle = "#7C3AED";
                ctx.fillText(slide.labels[0] + " = " + slide.labels[1], cx, cy - r - 15*s);
                ctx.fillStyle = "#1e293b"; ctx.font = `bold ${18*s}px sans-serif`;
                ctx.fillText(slide.items, cx, cy);
            }
        }

        // ----------------------------------------------
        // 7. VENN DIAGRAM
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
            if(hl.includes('left')) drawZone('left', '#ede9fe'); // Purple Light
            if(hl.includes('right')) drawZone('right', '#fce7f3'); // Pink Light
            if(hl.includes('center')) drawZone('center', '#fde047'); // Yellow

            ctx.lineWidth = 2*s; ctx.strokeStyle = "#94a3b8"; ctx.strokeRect(cx - r*2.5, cy - r*1.5, r*5, r*3);
            ctx.lineWidth = 3*s; ctx.strokeStyle = "#7C3AED"; ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI*2); ctx.stroke();
            ctx.strokeStyle = "#DB2777"; ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI*2); ctx.stroke();
            
            ctx.font = `bold ${20*s}px sans-serif`;
            ctx.fillStyle = "#64748b"; ctx.fillText("ξ", cx - r*2.3, cy - r*1.2);
            ctx.fillStyle = "#7C3AED"; ctx.fillText(slide.labels?.[0] || "A", c1.x - r, c1.y - r);
            ctx.fillStyle = "#DB2777"; ctx.fillText(slide.labels?.[1] || "B", c2.x + r, c2.y - r);

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