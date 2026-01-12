/**
 * Manya Set Classifier Engine (v3.0 - Contextual Visuals)
 * Upgrades:
 * - "Cows" now graze inside a wooden fence (Visualizing Boundaries).
 * - "Map" now draws a land silhouette with pins (Visualizing Locations).
 * - Optimized particle physics for "Grazing" vs "Falling".
 */
export const SetClassifierEngine = {
    state: {
        ctx: null, width: 0, height: 0,
        currentStep: 0, isResolved: false, data: null,
        particles: [], scene: 'default', animId: null,
        time: 0
    },

    injectStyles: () => {
        if (document.getElementById('classifier-styles')) return;
        const style = document.createElement('style');
        style.id = 'classifier-styles';
        style.innerHTML = `
            .classifier-root { position: absolute; inset: 0; display: flex; flex-direction: column; background: #0f172a; overflow: hidden; user-select: none; }
            .scene-canvas { flex: 1; width: 100%; display: block; }
            
            .hud-card {
                flex-shrink: 0; background: white; 
                padding: 20px; padding-bottom: max(20px, env(safe-area-inset-bottom));
                border-top-left-radius: 24px; border-top-right-radius: 24px;
                display: flex; flex-direction: column; gap: 15px;
                box-shadow: 0 -10px 40px rgba(0,0,0,0.3); z-index: 10;
            }
            .q-text { font-size: 1.1rem; font-weight: 800; color: #1e293b; text-align: center; line-height: 1.3; }
            
            .btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .btn-choice {
                padding: 16px; border-radius: 16px; border: none;
                font-weight: 800; font-size: 1rem; cursor: pointer;
                display: flex; flex-direction: column; align-items: center; gap: 4px;
                transition: transform 0.1s; box-shadow: 0 4px 0 rgba(0,0,0,0.1);
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
        
        const handleResize = () => {
            const wrapper = container.querySelector('.classifier-root'); // Get root relative
            const rect = wrapper.getBoundingClientRect();
            const hudH = container.querySelector('.hud-card').offsetHeight;
            
            // Fill space above HUD
            const h = rect.height - hudH;
            
            canvas.width = rect.width;
            canvas.height = h;
            
            SetClassifierEngine.state.width = rect.width;
            SetClassifierEngine.state.height = h;
            
            SetClassifierEngine.initScene();
        };

        // Delay slightly for DOM layout
        setTimeout(() => {
            handleResize();
            window.addEventListener('resize', handleResize);
            SetClassifierEngine.loadQuestion();
            SetClassifierEngine.loop();
        }, 50);
    },

    loadQuestion: () => {
        const q = SetClassifierEngine.state.data.questions[SetClassifierEngine.state.currentStep];
        document.getElementById('q-text').innerHTML = q.prompt;
        document.getElementById('feedback').innerText = "";
        SetClassifierEngine.state.scene = q.scene; 
        SetClassifierEngine.state.isResolved = false;
        SetClassifierEngine.initScene();
    },

    handleChoice: (choice) => {
        if (SetClassifierEngine.state.isResolved) {
            if (SetClassifierEngine.state.currentStep < SetClassifierEngine.state.data.questions.length - 1) {
                SetClassifierEngine.state.currentStep++;
                SetClassifierEngine.loadQuestion();
            } else {
                document.getElementById('q-text').innerText = "🎉 All Sets Classified!";
            }
            return;
        }

        const q = SetClassifierEngine.state.data.questions[SetClassifierEngine.state.currentStep];
        const fb = document.getElementById('feedback');
        
        if (choice === q.expected) {
            fb.innerText = "Correct!"; fb.style.color = "#16a34a";
            SetClassifierEngine.state.isResolved = true;
        } else {
            fb.innerText = "Try again!"; fb.style.color = "#dc2626";
        }
    },

    // --- ENHANCED SCENE GENERATION ---
    initScene: () => {
        const { width, height, scene } = SetClassifierEngine.state;
        if(!width) return;
        const p = [];
        
        if (scene === 'stars') {
            for(let i=0; i<80; i++) p.push({ x: Math.random()*width, y: Math.random()*height, z: Math.random()*2 + 0.5, type: 'star' });
        } 
        else if (scene === 'rain') {
            for(let i=0; i<40; i++) p.push({ x: Math.random()*width, y: Math.random()*height, v: Math.random()*5+3, label: Math.floor(Math.random()*100), type: 'text_fall' });
        } 
        else if (scene === 'integers') {
            for(let i=0; i<25; i++) p.push({ x: Math.random()*width, y: Math.random()*height, v: (Math.random()-0.5)*0.5, label: (Math.random()>0.5?'-':'+') + Math.floor(Math.random()*50), type: 'float' });
        }
        else if (scene === 'cows') {
            // Place cows within a "Fence" area (middle 60% of screen)
            const marginX = width * 0.2;
            const marginY = height * 0.2;
            for(let i=0; i<6; i++) {
                p.push({ 
                    x: marginX + Math.random()*(width - marginX*2), 
                    y: marginY + Math.random()*(height - marginY*2), 
                    vx: (Math.random()-0.5)*0.5, // Slow graze
                    vy: (Math.random()-0.5)*0.5, 
                    type: 'cow' 
                });
            }
        }
        else if (scene === 'map' || scene === 'default') {
            // Pins centered around a map location
            for(let i=0; i<6; i++) {
                p.push({ 
                    x: width/2 + (Math.random()-0.5)*150, 
                    y: height/2 + (Math.random()-0.5)*150, 
                    offset: Math.random() * 100, // For bobbing
                    type: 'pin' 
                });
            }
        }
        // ... (Keep other scenes: leaves, fish, sand, class, vowels) ...
        else if (scene === 'leaves') {
             for(let i=0; i<20; i++) p.push({ x: Math.random()*width, y: Math.random()*height, v: Math.random()*2+1, swing: Math.random()*2, type: 'leaf' });
        }
        else if (scene === 'fish') {
             for(let i=0; i<8; i++) p.push({ x: Math.random()*width, y: Math.random()*height, v: (Math.random()+0.5)*(Math.random()>0.5?1:-1), type: 'fish' });
        }
        else if (scene === 'sand') {
             for(let i=0; i<800; i++) p.push({ x: Math.random()*width, y: height - (Math.random()*(height/3)), type: 'dot' });
        }
        else if (scene === 'class') {
             const cols = 4, rows = 3; const gapX = width/cols, gapY = height/rows;
             for(let r=0; r<rows; r++) for(let c=0; c<cols; c++) p.push({ x: (c*gapX)+gapX/2, y: (r*gapY)+gapY/2, type: 'student' });
        }
        else if (scene === 'vowels') {
             ['A','E','I','O','U'].forEach(v => p.push({ x: width/2, y: height/2, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6, label: v, type: 'bounce' }));
        }
        
        SetClassifierEngine.state.particles = p;
    },

    loop: () => {
        const { ctx, width, height, particles, scene, time } = SetClassifierEngine.state;
        if(!ctx) return;
        
        SetClassifierEngine.state.time += 0.05;

        // --- BACKGROUNDS ---
        if (scene === 'stars' || scene === 'integers') {
             // Deep Space
             const grad = ctx.createLinearGradient(0,0,0,height);
             grad.addColorStop(0, '#020617'); grad.addColorStop(1, '#1e1b4b');
             ctx.fillStyle = grad;
        }
        else if (scene === 'rain') ctx.fillStyle = '#022c22';
        else if (scene === 'fish') ctx.fillStyle = '#eff6ff'; 
        else if (scene === 'sand') ctx.fillStyle = '#fff7ed'; 
        else if (scene === 'cows') {
            // Grass Field
            ctx.fillStyle = '#dcfce7'; 
        }
        else if (scene === 'map' || scene === 'default') {
            // Map Table
            ctx.fillStyle = '#f0f9ff';
        }
        else ctx.fillStyle = '#f8fafc';
        
        ctx.fillRect(0, 0, width, height);

        // --- STATIC SCENERY LAYERS ---
        if (scene === 'cows') {
            // Draw Fence
            const mX = width * 0.15; const mY = height * 0.15;
            ctx.strokeStyle = '#92400e'; ctx.lineWidth = 4;
            ctx.strokeRect(mX, mY, width - mX*2, height - mY*2);
            ctx.fillStyle = 'rgba(21, 128, 61, 0.1)';
            ctx.fillRect(mX, mY, width - mX*2, height - mY*2);
            // Label
            ctx.fillStyle = '#166534'; ctx.font = 'bold 20px sans-serif'; 
            ctx.fillText('KRAAL', width/2 - 30, mY - 10);
        }

        if (scene === 'map' || scene === 'default') {
            // Draw Stylized Map Blob
            ctx.fillStyle = '#e2e8f0'; 
            ctx.beginPath();
            ctx.ellipse(width/2, height/2, width*0.35, height*0.25, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
        }
        
        if (scene === 'sand') {
            // Beach Gradient
            const sandGrad = ctx.createLinearGradient(0, height/2, 0, height);
            sandGrad.addColorStop(0, 'transparent'); sandGrad.addColorStop(1, '#fdba74');
            ctx.fillStyle = sandGrad; ctx.fillRect(0, height/2, width, height/2);
        }

        // --- PARTICLE RENDERING ---
        particles.forEach(p => {
            if (p.type === 'star') {
                p.x -= p.z; if(p.x < 0) p.x = width;
                ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.8 + 0.2})`; 
                ctx.beginPath(); ctx.arc(p.x, p.y, p.z, 0, Math.PI*2); ctx.fill();
            } 
            else if (p.type === 'text_fall') {
                p.y += p.v; if(p.y > height) p.y = -20;
                ctx.fillStyle = '#4ade80'; ctx.font = '16px monospace'; 
                ctx.fillText(p.label, p.x, p.y);
            } 
            else if (p.type === 'float') {
                p.y -= 0.5; if(p.y < -20) p.y = height + 20;
                ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 24px sans-serif'; 
                ctx.fillText(p.label, p.x, p.y);
            }
            else if (p.type === 'cow') {
                // Graze logic (bounce off fence)
                p.x += p.vx; p.y += p.vy;
                const mX = width * 0.15; const mY = height * 0.15;
                if (p.x < mX || p.x > width - mX) p.vx *= -1;
                if (p.y < mY || p.y > height - mY) p.vy *= -1;
                
                ctx.font = '36px serif'; 
                ctx.save(); ctx.translate(p.x, p.y);
                if (p.vx < 0) ctx.scale(-1, 1); // Face direction
                ctx.fillText('🐄', -18, 10);
                ctx.restore();
            }
            else if (p.type === 'pin') {
                // Bobbing animation
                const bob = Math.sin(SetClassifierEngine.state.time + p.offset) * 5;
                ctx.font = '32px sans-serif'; 
                ctx.fillText('📍', p.x, p.y + bob);
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.beginPath(); ctx.ellipse(p.x + 8, p.y + 5, 6, 3, 0, 0, Math.PI*2); ctx.fill();
            }
            else if (p.type === 'leaf') {
                p.y += p.v; p.x += Math.sin(p.y/50 + time) * p.swing; 
                if(p.y > height) p.y = -20;
                ctx.font = '24px serif'; ctx.fillText('🍃', p.x, p.y);
            }
            else if (p.type === 'fish') {
                p.x += p.v; 
                if(p.x > width + 40) p.x = -40; if(p.x < -40) p.x = width + 40;
                ctx.save(); ctx.translate(p.x, p.y + Math.sin(time + p.x)*5); 
                if(p.v < 0) ctx.scale(-1, 1); 
                ctx.font = '30px serif'; ctx.fillText('🐟', -15, 10); 
                ctx.restore();
            }
            else if (p.type === 'dot') {
                ctx.fillStyle = '#d97706'; ctx.fillRect(p.x, p.y, 2, 2);
            }
            else if (p.type === 'student') {
                ctx.font = '40px serif'; ctx.fillText('🧑‍🎓', p.x, p.y);
            }
            else if (p.type === 'bounce') {
                p.x += p.vx; p.y += p.vy;
                if(p.x < 20 || p.x > width-20) p.vx *= -1;
                if(p.y < 20 || p.y > height-20) p.vy *= -1;
                ctx.fillStyle = '#7c3aed'; ctx.font = 'bold 40px sans-serif'; 
                ctx.fillText(p.label, p.x, p.y);
            }
        });

        requestAnimationFrame(SetClassifierEngine.loop);
    }
};

window.ManyaClassifier = (val) => SetClassifierEngine.handleChoice(val);