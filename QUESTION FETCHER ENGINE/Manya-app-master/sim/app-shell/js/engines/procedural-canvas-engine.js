/**
 * Manya Universal Procedural Engine (Hybrid Edition)
 * Supports: Antagonistic Muscle Sim & Multi-Joint Skeletal Puppet.
 * Layout: Mobile-First Scrolling Feed with Floating Nav.
 */
export const ProceduralCanvasEngine = {
    state: {
        flexion: 0,
        targetFlexion: 0,
        joints: {},
        selectedJointId: null,
        hitRegions: [],
        ctx: null,
        canvas: null,
        data: null,
        animationFrame: null
    },

    injectStyles: () => {
        if (document.getElementById('manya-proc-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-proc-styles';
        style.innerHTML = `
            .manya-proc-root { 
                display: flex; flex-direction: column; 
                width: 100%; height: 100%; background: #f8fafc; 
                overflow-y: auto; scroll-behavior: smooth;
                padding-bottom: 100px;
            }
            
            /* NAVIGATION CHEVRONS */
            .float-nav {
                position: fixed; right: 20px; bottom: 85px; 
                display: flex; flex-direction: column; gap: 10px; z-index: 2000;
            }
            .chev-btn {
                width: 45px; height: 45px; border-radius: 50%;
                background: var(--manya-purple); color: white;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4);
                cursor: pointer; font-weight: bold; border: 2px solid white;
            }

            .header-card { background: white; padding: 20px; margin: 15px; border-radius: 24px; border-left: 8px solid var(--manya-purple); box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
            
            .sim-card { 
                background: white; margin: 0 15px 15px 15px; border-radius: 28px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; 
                aspect-ratio: 4/3; position: relative; flex-shrink: 0; 
                overflow: hidden;
            }
            canvas { width: 100%; height: 100%; display: block; cursor: crosshair; }

            .controls-card { background: white; margin: 0 15px 15px 15px; padding: 25px; border-radius: 24px; border: 1px solid #e2e8f0; }
            .control-label { display: flex; justify-content: space-between; font-weight: 800; font-size: 11px; color: #94a3b8; margin-bottom: 8px; }
            
            input[type=range] { width: 100%; accent-color: var(--manya-purple); height: 10px; border-radius: 5px; cursor: pointer; }

            .btn-group { display: flex; gap: 10px; margin-top: 15px; }
            .manya-btn { flex: 1; padding: 14px; border-radius: 16px; border: none; font-weight: 800; cursor: pointer; font-size: 13px; transition: 0.2s; }
            .btn-action { background: #f5f3ff; color: var(--manya-purple); border: 1px solid #ddd; }
            .manya-btn:active { transform: scale(0.95); }

            .info-card { background: white; margin: 0 15px 20px 15px; padding: 25px; border-radius: 28px; border-left: 8px solid var(--success-color); box-shadow: 0 15px 40px rgba(0,0,0,0.06); animation: slideUp 0.4s ease; }
            @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        `;
        document.head.appendChild(style);
    },

    renderStudy: async (container, data) => {
        ProceduralCanvasEngine.injectStyles();
        ProceduralCanvasEngine.data = data;
        
        // --- 1. STATE INITIALIZATION ---
        ProceduralCanvasEngine.state.flexion = 0;
        ProceduralCanvasEngine.state.targetFlexion = 0;
        ProceduralCanvasEngine.state.selectedJointId = null;
        // Deep copy the joints from JSON if they exist
        ProceduralCanvasEngine.state.joints = data.initialJoints ? JSON.parse(JSON.stringify(data.initialJoints)) : {};

        // --- 2. LOAD EXTERNAL RENDER MATH ---
        const module = await import(`../../../../assets/science/scripts/${data.renderScript}`);
        ProceduralCanvasEngine.subEngine = Object.values(module)[0];

        container.innerHTML = `
            <div class="manya-proc-root" id="manya-scroll-parent">
                <!-- Floating Scroll Nav -->
                <div class="float-nav">
                    <div class="chev-btn" onclick="document.getElementById('manya-scroll-parent').scrollTo(0,0)">↑</div>
                    <div class="chev-btn" onclick="document.getElementById('manya-scroll-parent').scrollTo(0, 5000)">↓</div>
                </div>

                <div class="header-card">
                    <h2 style="margin:0; font-size:1.4rem; font-weight:900;">${data.topic}</h2>
                    <p style="margin:5px 0 0 0; color:#64748b; font-weight:600;">${data.intro}</p>
                </div>

                <div class="sim-card">
                    <canvas id="procCanvas"></canvas>
                </div>

                <div class="controls-card">
                    <div class="control-label">
                        <span>${data.labels ? data.labels.min : 'RELAXED'}</span>
                        <span id="slider-target-name" style="color:var(--manya-purple)">${data.initialJoints ? 'TAP A JOINT' : 'CONTROL'}</span>
                        <span>${data.labels ? data.labels.max : 'STRETCHED'}</span>
                    </div>
                    <input type="range" id="procSlider" min="0" max="100" value="0">
                    <div class="btn-group">
                        ${data.actions ? data.actions.map(a => `<button class="manya-btn btn-action" id="act-${a.id}">${a.label}</button>`).join('') : ''}
                        <button class="manya-btn" style="background:#f1f5f9" id="btn-reset">RESET</button>
                    </div>
                </div>

                <div id="info-mount"></div>

                <!-- Concepts Summary -->
                <div style="background:#1e293b; color:white; margin:15px; padding:25px; border-radius:28px; margin-bottom:60px;">
                    <h3 style="margin:0 0 10px 0; font-size:16px;">📋 Key Summary</h3>
                    <div style="font-size:13px; opacity:0.8; line-height:1.7;">
                        ${data.concepts ? data.concepts.map(c => `• ${c}`).join('<br>') : 'Interact to learn.'}
                    </div>
                </div>
            </div>
        `;

        const canvas = container.querySelector('#procCanvas');
        ProceduralCanvasEngine.canvas = canvas;
        ProceduralCanvasEngine.ctx = canvas.getContext('2d');
        const slider = container.querySelector('#procSlider');

        // --- RESIZE & SCALING ---
        const resize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width * 2; canvas.height = rect.height * 2;
            ProceduralCanvasEngine.ctx.scale(2, 2);
        };
        window.addEventListener('resize', resize); resize();

        // --- INPUT LOGIC ---
        slider.oninput = (e) => {
            const val = parseFloat(e.target.value) / 100;
            const sid = ProceduralCanvasEngine.state.selectedJointId;

            if (sid && ProceduralCanvasEngine.state.joints[sid]) {
                // PUPPET MODE: Map slider 0-1 to the joint's specific min/max
                const joint = ProceduralCanvasEngine.state.joints[sid];
                joint.angle = joint.min + (val * (joint.max - joint.min));
            } else {
                // ANTAGONISTIC MODE: Map slider to global flexion
                ProceduralCanvasEngine.state.targetFlexion = val;
            }
        };

        // --- INTERACTION LOGIC (CANVAS CLICK) ---
        canvas.onclick = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / 2 / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / 2 / rect.height);
            
            ProceduralCanvasEngine.state.hitRegions.forEach(reg => {
                if (Math.sqrt((x - reg.x)**2 + (y - reg.y)**2) < (reg.r || 30)) {
                    ProceduralCanvasEngine.handleHit(reg.id, slider);
                }
            });
        };

        // --- BUTTONS ---
        if(data.actions) {
            data.actions.forEach(a => {
                container.querySelector(`#act-${a.id}`).onclick = () => {
                    if (a.id === 'flex') { ProceduralCanvasEngine.state.targetFlexion = 1; slider.value = 100; }
                    if (a.id === 'extend') { ProceduralCanvasEngine.state.targetFlexion = 0; slider.value = 0; }
                    if (ProceduralCanvasEngine.subEngine.onAction) ProceduralCanvasEngine.subEngine.onAction(a.id, ProceduralCanvasEngine.state);
                };
            });
        }
        container.querySelector('#btn-reset').onclick = () => ProceduralCanvasEngine.reset(slider);

        ProceduralCanvasEngine.startLoop();
        // Default View
        ProceduralCanvasEngine.showInfo(data.initialJoints ? 'head' : 'BICEPS');
    },

   // Inside procedural-canvas-engine.js -> handleHit
handleHit: (id, slider) => {
    ProceduralCanvasEngine.showInfo(id);

    if (ProceduralCanvasEngine.state.joints[id]) {
        ProceduralCanvasEngine.state.selectedJointId = id;
        const joint = ProceduralCanvasEngine.state.joints[id];
        
        // HAPTIC FEEDBACK (Visual)
        const nameLabel = document.getElementById('slider-target-name');
        nameLabel.style.transform = "scale(1.2)";
        nameLabel.innerText = "SELECTED: " + joint.label.toUpperCase();
        setTimeout(() => nameLabel.style.transform = "scale(1)", 200);
        
        const percent = ((joint.angle - joint.min) / (joint.max - joint.min)) * 100;
        slider.value = percent;
    }
},

    reset: (slider) => {
        ProceduralCanvasEngine.state.targetFlexion = 0;
        ProceduralCanvasEngine.state.selectedJointId = null;
        if (ProceduralCanvasEngine.data.initialJoints) {
            ProceduralCanvasEngine.state.joints = JSON.parse(JSON.stringify(ProceduralCanvasEngine.data.initialJoints));
        }
        slider.value = 0;
        document.getElementById('slider-target-name').innerText = ProceduralCanvasEngine.data.initialJoints ? "TAP A JOINT" : "CONTROL";
    },

    startLoop: () => {
        if (ProceduralCanvasEngine.animationFrame) cancelAnimationFrame(ProceduralCanvasEngine.animationFrame);
        const tick = () => {
            const diff = ProceduralCanvasEngine.state.targetFlexion - ProceduralCanvasEngine.state.flexion;
            ProceduralCanvasEngine.state.flexion += diff * 0.1;
            ProceduralCanvasEngine.draw();
            ProceduralCanvasEngine.animationFrame = requestAnimationFrame(tick);
        };
        tick();
    },

    draw: () => {
        const ctx = ProceduralCanvasEngine.ctx;
        if (!ctx) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Essential to prevent smearing
        ctx.clearRect(0, 0, ProceduralCanvasEngine.canvas.width, ProceduralCanvasEngine.canvas.height);
        ctx.restore();
        ProceduralCanvasEngine.state.hitRegions = [];
        ProceduralCanvasEngine.subEngine.draw(ctx, ProceduralCanvasEngine.canvas.width/2, ProceduralCanvasEngine.canvas.height/2, ProceduralCanvasEngine.state, ProceduralCanvasEngine.state.hitRegions);
    },

    showInfo: (id) => {
        const part = ProceduralCanvasEngine.data.parts[id];
        if (!part) return;
        const mount = document.getElementById('info-mount');
        mount.innerHTML = `
            <div class="info-card">
                <h2 style="margin:0; font-size:18px; font-weight:900; color:var(--manya-purple);">${part.title}</h2>
                <p style="margin:10px 0; font-size:14px; line-height:1.6; color:#334155;">${part.desc}</p>
                <div style="background:#fffbeb; border:1px solid #fef3c7; padding:12px; border-radius:12px; font-size:12px; color:#92400e;">
                    <b>💡 Exam Tip:</b> ${part.tip}
                </div>
            </div>`;
    }
};