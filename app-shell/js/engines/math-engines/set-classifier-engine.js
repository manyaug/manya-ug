/**
 * Set Classifier Engine
 * Visualizes Finite vs Infinite sets using Canvas animations.
 */
export const SetClassifierEngine = {
    state: {
        ctx: null, width: 0, height: 0,
        currentStep: 0, isResolved: false, data: null,
        particles: [], scene: 'default', animId: null
    },

    injectStyles: () => {
        if (document.getElementById('classifier-styles')) return;
        const style = document.createElement('style');
        style.id = 'classifier-styles';
        style.innerHTML = `
            .classifier-root { display: flex; flex-direction: column; height: 100dvh; width: 100%; background: #0f172a; overflow: hidden; position: relative; }
            .scene-canvas { flex: 1; min-height: 0; width: 100%; display: block; }
            
            .hud-card {
                position: absolute; bottom: 0; left: 0; width: 100%;
                background: white; border-top-left-radius: 24px; border-top-right-radius: 24px;
                padding: 24px; padding-bottom: max(20px, env(safe-area-inset-bottom));
                display: flex; flex-direction: column; gap: 16px; flex-shrink: 0;
                box-shadow: 0 -10px 40px rgba(0,0,0,0.3);
                z-index: 10;
            }
            .q-text { font-size: 1.2rem; font-weight: 800; color: #1e293b; text-align: center; line-height: 1.3; }
            
            .btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .btn-choice {
                padding: 16px; border-radius: 16px; border: none;
                font-weight: 800; font-size: 1rem; cursor: pointer;
                display: flex; flex-direction: column; align-items: center; gap: 4px;
                transition: transform 0.1s;
                box-shadow: 0 4px 0 rgba(0,0,0,0.1);
            }
            .btn-choice:active { transform: translateY(4px); box-shadow: none; }
            
            .btn-finite { background: #dcfce7; color: #166534; }
            .btn-infinite { background: #fee2e2; color: #991b1b; }
            
            .btn-choice span { font-size: 0.7rem; font-weight: 600; opacity: 0.7; text-transform: uppercase; }
            .feedback { text-align: center; font-weight: 700; height: 20px; font-size: 0.9rem; }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        SetClassifierEngine.injectStyles();
        SetClassifierEngine.state.data = data;
        SetClassifierEngine.state.currentStep = 0;

        container.innerHTML = `
            <div class="classifier-root">
                <canvas id="scene-canvas" class="scene-canvas"></canvas>
                <div class="hud-card">
                    <div id="q-text" class="q-text">Loading...</div>
                    <div class="btn-grid">
                        <button class="btn-choice btn-finite" onclick="ManyaClassifier('finite')">
                            FINITE <span>Countable</span>
                        </button>
                        <button class="btn-choice btn-infinite" onclick="ManyaClassifier('infinite')">
                            INFINITE <span>Endless</span>
                        </button>
                    </div>
                    <div id="feedback" class="feedback"></div>
                </div>
            </div>
        `;

        const canvas = document.getElementById('scene-canvas');
        SetClassifierEngine.state.ctx = canvas.getContext('2d');
        
        // Resize Logic: measure available area (container minus HUD) and observe size changes
        const handleResize = () => {
            const rect = container.getBoundingClientRect();
            const hud = container.querySelector('.hud-card');
            const hudH = hud ? hud.getBoundingClientRect().height : 0;
            const dpr = window.devicePixelRatio || 2;

            const targetW = rect.width;
            const targetH = Math.max(0, rect.height - hudH);

            canvas.width = Math.round(targetW * dpr);
            canvas.height = Math.round(targetH * dpr);
            canvas.style.width = `${targetW}px`;
            canvas.style.height = `${targetH}px`;

            SetClassifierEngine.state.width = canvas.width;
            SetClassifierEngine.state.height = canvas.height;
            SetClassifierEngine.initScene();
        };

        const ro = new ResizeObserver(() => requestAnimationFrame(handleResize));
        ro.observe(container);
        requestAnimationFrame(handleResize);

        SetClassifierEngine.loadQuestion();
        SetClassifierEngine.loop();
    },

    loadQuestion: () => {
        const q = SetClassifierEngine.state.data.questions[SetClassifierEngine.state.currentStep];
        document.getElementById('q-text').innerHTML = q.prompt;
        document.getElementById('feedback').innerText = "";
        SetClassifierEngine.state.scene = q.scene; // 'stars', 'cows', 'rain'
        SetClassifierEngine.state.isResolved = false;
        SetClassifierEngine.initScene();
    },

    handleChoice: (choice) => {
        if (SetClassifierEngine.state.isResolved) {
            if (SetClassifierEngine.state.currentStep < SetClassifierEngine.state.data.questions.length - 1) {
                SetClassifierEngine.state.currentStep++;
                SetClassifierEngine.loadQuestion();
            } else {
                document.getElementById('q-text').innerText = "Quest Complete!";
            }
            return;
        }

        const q = SetClassifierEngine.state.data.questions[SetClassifierEngine.state.currentStep];
        const fb = document.getElementById('feedback');
        
        if (choice === q.expected) {
            fb.innerText = "Correct!";
            fb.style.color = "#16a34a";
            SetClassifierEngine.state.isResolved = true;
        } else {
            fb.innerText = "Try again!";
            fb.style.color = "#dc2626";
        }
    },

    // --- ANIMATION SYSTEM ---
    initScene: () => {
        const { width, height, scene } = SetClassifierEngine.state;
        const p = [];
        
        if (scene === 'stars') {
            for(let i=0; i<60; i++) p.push({
                x: Math.random()*width, y: Math.random()*height, 
                z: Math.random()*2, type: 'star' 
            });
        } else if (scene === 'rain') {
            for(let i=0; i<40; i++) p.push({
                x: Math.random()*width, y: Math.random()*height, 
                v: Math.random()*5+2, type: 'num' 
            });
        } else if (scene === 'cows') {
            for(let i=0; i<5; i++) p.push({
                x: Math.random()*(width-50)+25, y: Math.random()*(height-50)+25, 
                type: 'cow' 
            });
        } else {
            // Map Pins (Bouncing)
            for(let i=0; i<8; i++) p.push({
                x: width/2, y: height/2, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, type: 'pin'
            });
        }
        SetClassifierEngine.state.particles = p;
    },

    loop: () => {
        const { ctx, width, height, particles, scene } = SetClassifierEngine.state;
        if(!ctx) return;

        // Clear Background
        ctx.fillStyle = (scene === 'stars' || scene === 'rain') ? '#0f172a' : '#f0f9ff';
        ctx.fillRect(0, 0, width, height);

        particles.forEach(p => {
            if (p.type === 'star') {
                p.x -= p.z; if(p.x < 0) p.x = width;
                ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(p.x, p.y, p.z, 0, Math.PI*2); ctx.fill();
            } else if (p.type === 'num') {
                p.y += p.v; if(p.y > height) p.y = -20;
                ctx.fillStyle = '#4ade80'; ctx.font = '16px monospace'; ctx.fillText('7', p.x, p.y);
            } else if (p.type === 'cow') {
                ctx.font = '32px sans-serif'; ctx.fillText('🐄', p.x, p.y);
            } else if (p.type === 'pin') {
                p.x += p.vx; p.y += p.vy;
                if(p.x < 0 || p.x > width) p.vx *= -1;
                if(p.y < 0 || p.y > height) p.vy *= -1;
                ctx.font = '24px sans-serif'; ctx.fillText('📍', p.x, p.y);
            }
        });

        requestAnimationFrame(SetClassifierEngine.loop);
    }
};

window.ManyaClassifier = (val) => SetClassifierEngine.handleChoice(val);