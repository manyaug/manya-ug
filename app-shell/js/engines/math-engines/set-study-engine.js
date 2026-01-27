/**
 * Manya Math Study Engine (v3.2 - Layout Fix)
 * 
 * CHANGES:
 * - Visual Stage fixed to 35vh (35% of screen height) to prevent covering notes.
 * - Text Area takes remaining 65vh.
 * - Added 'min-height' constraints to prevent collapse.
 * - Z-indexes adjusted to ensure text card sits clearly "above" the canvas.
 */

export const MathStudyEngine = {
    state: {
        currentSlideIndex: 0,
        data: null,
        ctx: null, width: 0, height: 0, scale: 1,
        animId: null, tick: 0
    },

    injectStyles: () => {
        if (document.getElementById('math-study-styles')) return;
        const style = document.createElement('style');
        style.id = 'math-study-styles';
        style.innerHTML = `
            /* ROOT: Locks the engine to the container */
            .study-root { 
                position: absolute; inset: 0; 
                display: flex; flex-direction: column; 
                background: #f1f5f9; 
                font-family: 'Inter', system-ui, sans-serif; 
                overflow: hidden;
            }
            
            /* TOP: VISUAL STAGE (Fixed to 35% Height) */
            /* This ensures the drawing never eats the text space */
            .visual-stage { 
                height: 35vh; 
                min-height: 200px; /* Safety for very flat screens */
                flex-shrink: 0;    /* Prevent shrinking */
                position: relative; width: 100%; 
                background: #ffffff;
                z-index: 1;
            }
            canvas { display: block; width: 100%; height: 100%; }

            /* BOTTOM: LESSON CARD (Takes remaining space) */
            .lesson-card { 
                flex-grow: 1; /* Takes all remaining height (approx 65%) */
                display: flex; flex-direction: column; 
                background: white; 
                border-top-left-radius: 24px; border-top-right-radius: 24px;
                box-shadow: 0 -4px 20px rgba(0,0,0,0.08); /* Lift effect */
                z-index: 10;
                overflow: hidden; /* Contains the scroll area */
                margin-top: -24px; /* Overlaps the canvas slightly for "Sheet" look */
            }

            /* 1. HEADER */
            .card-header {
                flex: 0 0 auto;
                padding: 16px 24px;
                background: #fff;
                border-bottom: 1px solid #f1f5f9;
                display: flex; justify-content: space-between; align-items: center;
            }
            .topic-badge { 
                background: #f0f9ff; color: #0284c7; 
                font-size: 0.75rem; font-weight: 800; 
                padding: 6px 12px; border-radius: 6px; 
                text-transform: uppercase; 
            }
            .progress-pill { font-size: 0.8rem; font-weight: 700; color: #94a3b8; }

            /* 2. SCROLLABLE CONTENT */
            .card-scroll-area {
                flex: 1; 
                overflow-y: auto; 
                padding: 24px;
                padding-bottom: 10px;
                -webkit-overflow-scrolling: touch; 
            }

            .lesson-title { font-size: 1.4rem; font-weight: 800; color: #1e293b; margin: 0 0 16px 0; line-height: 1.2; }
            .lesson-body { font-size: 1.1rem; line-height: 1.6; color: #334155; }
            .lesson-body ul { padding-left: 20px; margin: 10px 0; }
            .lesson-body li { margin-bottom: 8px; }
            
            /* 3. NAV BAR (Pinned to bottom) */
            .nav-bar { 
                flex: 0 0 auto;
                padding: 16px 24px;
                padding-bottom: calc(16px + env(safe-area-inset-bottom));
                background: #ffffff;
                border-top: 1px solid #f1f5f9;
                display: flex; gap: 12px;
            }
            
            .btn-nav { flex: 1; padding: 14px; border: none; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: 0.2s; }
            .btn-back { background: #f1f5f9; color: #64748b; flex: 0 0 80px;}
            .btn-next { background: #2563eb; color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }

            /* ANIMATION */
            .slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `;
        document.head.appendChild(style);
    },

    renderStudy: (container, data) => {
        MathStudyEngine.injectStyles();
        MathStudyEngine.state.data = data;
        MathStudyEngine.state.currentSlideIndex = 0;

        container.innerHTML = `
            <div class="study-root">
                <!-- Visuals -->
                <div class="visual-stage" id="visual-mount">
                    <canvas id="study-canvas"></canvas>
                </div>
                
                <!-- Lesson Notes -->
                <div class="lesson-card">
                    <div class="card-header">
                        <span class="topic-badge">${data.topic}</span>
                        <span class="progress-pill" id="progress-txt">1 / ${data.slides.length}</span>
                    </div>
                    
                    <div id="content-area" class="card-scroll-area">
                        <!-- Text injected here -->
                    </div>

                    <div class="nav-bar">
                        <button class="btn-nav btn-back" onclick="ManyaStudyHandler('PREV')">Back</button>
                        <button class="btn-nav btn-next" id="btn-next" onclick="ManyaStudyHandler('NEXT')">Next Step</button>
                    </div>
                </div>
            </div>
        `;

        const canvas = document.getElementById('study-canvas');
        MathStudyEngine.state.ctx = canvas.getContext('2d');

        const resize = () => {
            const wrapper = document.getElementById('visual-mount');
            if(!wrapper) return;
            const dpr = window.devicePixelRatio || 2;
            const rect = wrapper.getBoundingClientRect();
            
            // Avoid zero-size errors
            if(rect.width === 0 || rect.height === 0) return;

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            MathStudyEngine.state.width = canvas.width;
            MathStudyEngine.state.height = canvas.height;
            MathStudyEngine.state.scale = dpr;
            
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
        const content = document.getElementById('content-area');
        const prog = document.getElementById('progress-txt');
        const btn = document.getElementById('btn-next');

        prog.innerText = `${index + 1} / ${data.slides.length}`;
        
        // Force re-render of text area
        content.innerHTML = `
            <div class="slide-wrapper slide-up">
                <h2 class="lesson-title">${slide.title}</h2>
                <div class="lesson-body">${slide.text}</div>
            </div>
        `;

        // Scroll to top of new text
        content.scrollTop = 0;

        if (index === data.slides.length - 1) {
            btn.innerText = "Finish Lesson";
            btn.style.background = "#16a34a"; // Green
        } else {
            btn.innerText = "Next Step";
            btn.style.background = "#2563eb"; // Blue
        }
    },

    handleNav: (dir) => {
        const s = MathStudyEngine.state;
        if (dir === 'NEXT') {
            if (s.currentSlideIndex < s.data.slides.length - 1) {
                s.currentSlideIndex++;
                MathStudyEngine.loadSlide(s.currentSlideIndex);
            } else {
                alert("Lesson Complete!");
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
            MathStudyEngine.state.tick++;
            MathStudyEngine.draw();
            MathStudyEngine.state.animId = requestAnimationFrame(loop);
        };
        loop();
    },

    draw: () => {
        const { ctx, width, height, scale, data, currentSlideIndex, tick } = MathStudyEngine.state;
        if (!width || !height) return;

        // Background
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#f8fafc"; ctx.fillRect(0,0,width,height);
        
        // Grid
        ctx.beginPath();
        const gridSize = 40 * scale;
        for(let x=0; x<width; x+=gridSize) { ctx.moveTo(x,0); ctx.lineTo(x,height); }
        for(let y=0; y<height; y+=gridSize) { ctx.moveTo(0,y); ctx.lineTo(width,y); }
        ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1 * scale; ctx.stroke();

        const slide = data.slides[currentSlideIndex];
        const type = slide.visualType;
        const cx = width/2; const cy = height/2;
        const s = scale;

        // RENDER: DEFINITION / ICON
        if (type === 'DEFINITION') {
            const r = Math.min(width, height) * 0.25;
            
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
            ctx.fillStyle = "#dbeafe"; ctx.fill(); 
            ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 4*s; ctx.stroke();
            
            // Text Auto-Scaling
            const txt = slide.visualData || "?";
            const fontSize = txt.length > 5 ? r * 0.5 : r * 1.2;
            
            ctx.font = `bold ${fontSize}px sans-serif`; 
            ctx.fillStyle = "#1e40af"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(txt, cx, cy + (fontSize*0.1)); // slight offset for optical center
        }

        // RENDER: FINITE BASKET
        else if (type === 'FINITE_BASKET') {
            const items = slide.visualData || [];
            const r = Math.min(width, height) * 0.35;
            
            ctx.beginPath(); ctx.ellipse(cx, cy, r, r*0.7, 0, 0, Math.PI*2);
            ctx.fillStyle = "rgba(147, 51, 234, 0.05)"; ctx.fill();
            ctx.strokeStyle = "#9333ea"; ctx.lineWidth = 4*s; ctx.stroke();
            
            ctx.fillStyle = "#9333ea"; ctx.font = `bold ${16*s}px sans-serif`;
            ctx.fillText("Set A", cx - r + 10*s, cy - r*0.6);

            items.forEach((item, i) => {
                const angle = (i / items.length) * Math.PI * 2;
                const dist = r * 0.4;
                const ix = cx + Math.cos(angle) * dist;
                const iy = cy + Math.sin(angle) * dist * 0.7;

                const delay = i * 20;
                const progress = Math.min(1, Math.max(0, (tick - delay) / 30));
                const size = progress * (r * 0.25); 

                if (size > 0) {
                    ctx.beginPath(); ctx.arc(ix, iy, size, 0, Math.PI*2);
                    ctx.fillStyle = "#f3e8ff"; ctx.fill(); ctx.strokeStyle = "#7e22ce"; ctx.lineWidth=2*s; ctx.stroke();
                    
                    ctx.fillStyle = "#581c87"; ctx.font = `bold ${size*0.8}px sans-serif`;
                    ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    ctx.fillText(item, ix, iy);
                }
            });

            if (slide.showCount) {
                 const countAlpha = Math.min(1, Math.max(0, (tick - 80) / 20));
                 ctx.save();
                 ctx.globalAlpha = countAlpha;
                 ctx.fillStyle = "#db2777"; ctx.font = `bold ${24*s}px sans-serif`;
                 ctx.shadowColor="white"; ctx.shadowBlur=10;
                 ctx.fillText(`n(A) = ${items.length}`, cx, cy + r*0.9);
                 ctx.restore();
            }
        }

        // RENDER: INFINITE ROAD
        else if (type === 'INFINITE_ROAD') {
            const speed = 2 * s;
            const offset = (tick * speed) % 150;

            // Road
            ctx.beginPath();
            ctx.moveTo(cx - 20*s, cy - 60*s); 
            ctx.lineTo(cx + 20*s, cy - 60*s); 
            ctx.lineTo(width + 50*s, height); 
            ctx.lineTo(-50*s, height); 
            ctx.fillStyle = "#e0f2fe"; ctx.fill();

            // Moving Stripes
            ctx.strokeStyle = "#0ea5e9"; ctx.lineWidth = 3*s;
            for(let i=0; i<6; i++) {
                const yPos = (cy - 30*s) + ((i * 100 * s + offset) % (height/1.2));
                const scaleFactor = (yPos - (cy-60*s)) / height;
                const wLine = 20*s + (scaleFactor * 300*s);
                
                if (yPos > cy - 60*s) {
                    ctx.beginPath(); ctx.moveTo(cx - wLine, yPos); ctx.lineTo(cx + wLine, yPos); ctx.stroke();
                    
                    ctx.fillStyle = "#0369a1"; 
                    ctx.font = `bold ${30 * s * scaleFactor}px sans-serif`;
                    const num = Math.floor(tick/20) + i; 
                    ctx.fillText(num, cx, yPos - 5*s);
                }
            }

            // Ellipsis
            const pulse = 1 + Math.sin(tick * 0.1) * 0.1;
            ctx.font = `bold ${60*s}px serif`; ctx.fillStyle = "#ef4444";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse);
            ctx.fillText("...", 0, 0);
            ctx.restore();
        }
    }
};

window.ManyaStudyHandler = (a) => MathStudyEngine.handleNav(a);