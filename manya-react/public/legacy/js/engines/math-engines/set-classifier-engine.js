/**
 * Manya Set Classifier Engine (v5.0 - Final Master)
 * Optimized to fit inside QuestRunner containers.
 */
export const SetClassifierEngine = {
    state: {
        ctx: null, width: 0, height: 0,
        currentStep: 0, isResolved: false, data: null,
        particles: [], scene: 'default', animId: null,
        time: 0, feedbackState: 'idle'
    },

    injectStyles: () => {
        if (document.getElementById('classifier-v5-styles')) return;
        const style = document.createElement('style');
        style.id = 'classifier-v5-styles';
        style.innerHTML = `
            /* THE ROOT: Now respects the parent container's height/width */
            .classifier-root { 
                width: 100%; height: 100%; 
                display: flex; flex-direction: column; 
                background: #f8fafc; font-family: 'Nunito', sans-serif;
                position: relative; overflow: hidden;
            }
            
            /* THE VIEWSCREEN: Rounded white box with internal shadow */
            .stage-box {
                flex: 1; margin: 15px;
                background: #fff; border-radius: 24px;
                border: 2px solid #e2e8f0; position: relative;
                overflow: hidden; box-shadow: inset 0 4px 12px rgba(0,0,0,0.05);
            }
            #scene-canvas { width: 100%; height: 100%; display: block; }
            
            /* THE CONTROL HUD */
            .hud-panel {
                flex-shrink: 0; padding: 20px;
                background: white; border-top: 1px solid #f1f5f9;
                display: flex; flex-direction: column; gap: 15px;
                box-shadow: 0 -10px 30px rgba(0,0,0,0.03);
            }

            .q-prompt { font-size: 1.15rem; font-weight: 800; color: #1e293b; text-align: center; line-height: 1.4; }
            
            .btn-group { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .btn-type {
                padding: 18px; border-radius: 20px; border: none;
                font-weight: 900; font-size: 1.1rem; cursor: pointer;
                display: flex; flex-direction: column; align-items: center; gap: 4px;
                transition: transform 0.1s, background 0.2s; box-shadow: 0 6px 0 rgba(0,0,0,0.1);
            }
            .btn-type:active { transform: translateY(3px); box-shadow: 0 3px 0 rgba(0,0,0,0.1); }
            
            .btn-f { background: #dcfce7; color: #166534; }
            .btn-i { background: #fee2e2; color: #991b1b; }
            .btn-type small { font-size: 0.65rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; }

            .continue-btn {
                width: 100%; height: 56px; background: #7c3aed; color: white;
                border: none; border-radius: 18px; font-weight: 900; font-size: 1.1rem;
                box-shadow: 0 6px 0 #5b21b6; cursor: pointer; display: none;
                animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .continue-btn.active { display: block; }
            @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            
            .feedback-label { text-align: center; font-weight: 800; color: #16a34a; height: 20px; font-size: 14px; }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        SetClassifierEngine.injectStyles();
        SetClassifierEngine.state.data = data;
        SetClassifierEngine.state.currentStep = 0;

        container.innerHTML = `
            <div class="classifier-root">
                <div class="stage-box">
                    <canvas id="scene-canvas"></canvas>
                </div>
                <div class="hud-panel">
                    <div id="q-text" class="q-prompt"></div>
                    <div id="controls-mount" class="btn-group">
                        <button class="btn-type btn-f" onclick="ManyaClassifier('finite')">
                            FINITE <small>Countable</small>
                        </button>
                        <button class="btn-type btn-i" onclick="ManyaClassifier('infinite')">
                            INFINITE <small>Endless</small>
                        </button>
                    </div>
                    <button id="next-btn" class="continue-btn" onclick="ManyaClassifier('next')">CONTINUE →</button>
                    <div id="feedback" class="feedback-label"></div>
                </div>
            </div>
        `;

        const canvas = document.getElementById('scene-canvas');
        SetClassifierEngine.state.ctx = canvas.getContext('2d');
        
        const resize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            SetClassifierEngine.state.width = rect.width;
            SetClassifierEngine.state.height = rect.height;
            SetClassifierEngine.initScene();
        };

        resize();
        new ResizeObserver(resize).observe(canvas.parentElement);
        SetClassifierEngine.loadQuestion();
        
        if (SetClassifierEngine.state.animId) cancelAnimationFrame(SetClassifierEngine.state.animId);
        SetClassifierEngine.loop();
    },

    loadQuestion: () => {
        const s = SetClassifierEngine.state;
        const q = s.data.questions[s.currentStep];
        document.getElementById('q-text').innerHTML = q.prompt;
        document.getElementById('controls-mount').style.display = 'grid';
        document.getElementById('next-btn').classList.remove('active');
        document.getElementById('feedback').innerText = "";
        s.scene = q.scene;
        s.isResolved = false;
        SetClassifierEngine.initScene();
    },

    handleChoice: (choice) => {
        const s = SetClassifierEngine.state;
        if (choice === 'next') {
            if (s.currentStep < s.data.questions.length - 1) {
                s.currentStep++;
                SetClassifierEngine.loadQuestion();
            } else {
                window.QuestRunner.next(); 
            }
            return;
        }

        const q = s.data.questions[s.currentStep];
        if (choice === q.expected) {
            s.isResolved = true;
            document.getElementById('feedback').innerText = "🌟 Excellent!";
            document.getElementById('controls-mount').style.display = 'none';
            document.getElementById('next-btn').classList.add('active');
        } else {
            document.getElementById('feedback').innerText = "❌ Try again!";
            document.getElementById('feedback').style.color = "#dc2626";
            setTimeout(() => { 
                document.getElementById('feedback').innerText = "";
                document.getElementById('feedback').style.color = "#16a34a";
            }, 1000);
        }
    },

    initScene: () => {
        const { width, height, scene } = SetClassifierEngine.state;
        if(!width) return;
        const p = [];
        
        const spawn = (type, count, logic) => {
            for(let i=0; i<count; i++) p.push({ ...logic(), type });
        };

        // Strict scene matching
        if (scene === 'stars') spawn('dot', 80, () => ({ x: Math.random()*width, y: Math.random()*height, z: Math.random()*3, vx: (Math.random()-0.5)*0.2, vy: (Math.random()-0.5)*0.2, color: '#fff' }));
        else if (scene === 'cows') spawn('emoji', 6, () => ({ x: Math.random()*width, y: Math.random()*height, char: '🐄', vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5, size: 45 }));
        else if (scene === 'fish') spawn('emoji', 8, () => ({ x: Math.random()*width, y: Math.random()*height, char: '🐟', vx: (Math.random()+0.5), vy: (Math.random()-0.5)*0.3, size: 35 }));
        else if (scene === 'leaves') spawn('emoji', 15, () => ({ x: Math.random()*width, y: Math.random()*height, char: '🍃', vx: Math.random()*0.5, vy: Math.random()*1+1, size: 25 }));
        else if (scene === 'rain') spawn('text', 40, () => ({ x: Math.random()*width, y: Math.random()*height, label: Math.floor(Math.random()*99), v: Math.random()*5+5 }));
        else if (scene === 'sand') spawn('dot', 500, () => ({ x: Math.random()*width, y: height - (Math.random()*100), z: 2, vx: (Math.random()-0.5)*0.5, vy: 0, color: '#fb923c' }));
        else if (scene === 'vowels') "AEIOU".split('').forEach(l => p.push({ x: width/2, y: height/2, label: l, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6, type: 'text' }));
        else spawn('emoji', 12, () => ({ x: Math.random()*width, y: Math.random()*height, char: '📍', vx: 0, vy: 0, size: 30 }));

        SetClassifierEngine.state.particles = p;
    },

    loop: () => {
        if (!document.getElementById('scene-canvas')) return;
        const s = SetClassifierEngine.state;
        const { ctx, width, height, particles, scene } = s;
        if(!ctx) return;
        s.time += 0.02;

        // Theme Backgrounds
        let bg = '#f8fafc';
        if (scene === 'stars' || scene === 'rain') bg = '#020617';
        if (scene === 'cows') bg = '#f0fdf4';
        if (scene === 'fish') bg = '#f0f9ff';
        
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // --- THE METAPHOR ---
        const isFinite = s.data.questions[s.currentStep].expected === 'finite';
        if (isFinite) {
            ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 20;
            ctx.strokeRect(30, 30, width-60, height-60);
        } else {
            const grad = ctx.createRadialGradient(width/2, height/2, 20, width/2, height/2, width*0.8);
            grad.addColorStop(0, 'rgba(124, 58, 237, 0.15)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(width/2, height/2, width*0.8, 0, Math.PI*2); ctx.fill();
        }

        particles.forEach(p => {
            if (isFinite) { // Bounce inside the jar
                if (p.x < 50 || p.x > width-50) p.vx *= -1;
                if (p.y < 50 || p.y > height-50) p.vy *= -1;
            } else { // Wrap around for infinity
                if (p.x < -40) p.x = width+40; if (p.x > width+40) p.x = -40;
                if (p.y < -40) p.y = height+40; if (p.y > height+40) p.y = -40;
            }

            p.x += (p.vx || 0); p.y += (p.vy || p.v || 0);

            if (p.type === 'emoji') {
                ctx.font = `${p.size}px serif`;
                ctx.save(); ctx.translate(p.x, p.y);
                if (p.vx < 0) ctx.scale(-1, 1);
                ctx.fillText(p.char, -p.size/2, p.size/2);
                ctx.restore();
            } else if (p.type === 'text') {
                ctx.fillStyle = (scene === 'rain') ? '#4ade80' : '#7c3aed';
                ctx.font = 'bold 24px monospace'; ctx.fillText(p.label, p.x, p.y);
            } else if (p.type === 'dot') {
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.z, 0, Math.PI*2); ctx.fill();
            }
        });

        s.animId = requestAnimationFrame(SetClassifierEngine.loop);
    }
};

window.ManyaClassifier = (val) => SetClassifierEngine.handleChoice(val);