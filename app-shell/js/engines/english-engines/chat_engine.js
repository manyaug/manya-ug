/**
 * Manya Quest Runner & Companion Engine (v2.0)
 * Logic: Orchestrates multiple engines into a single fluid "Duolingo" flow.
 * Visuals: Juicy UI, Spring animations, Character interactions.
 */

export const ManyaQuestRunner = {
    state: {
        manifest: null,
        currentIndex: 0,
        container: null,
        score: 0,
        isTransitioning: false
    },

    injectGlobalStyles: () => {
        if (document.getElementById('manya-global-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-global-styles';
        style.innerHTML = `
            :root {
                --manya-purple: #7e22ce;
                --manya-green: #22c55e;
                --manya-yellow: #fbbf24;
                --bg-soft: #f0f4f8;
            }

            .quest-shell {
                position: absolute; inset: 0;
                display: flex; flex-direction: column;
                background: var(--bg-soft); overflow: hidden;
            }

            /* 1. DUOLINGO PROGRESS BAR */
            .header-bar {
                height: 60px; padding: 0 20px; display: flex; 
                align-items: center; gap: 15px; background: white;
            }
            .progress-track {
                flex: 1; height: 14px; background: #e2e8f0; 
                border-radius: 20px; position: relative; overflow: visible;
            }
            .progress-fill {
                height: 100%; background: var(--manya-green);
                border-radius: 20px; transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .waddling-manya {
                position: absolute; right: -15px; top: -20px;
                font-size: 24px; transition: 0.6s;
                animation: waddle 0.5s infinite alternate;
            }

            /* 2. THE STAGE (CARD SYSTEM) */
            #engine-stage {
                flex: 1; position: relative; width: 100%;
                display: flex; align-items: center; justify-content: center;
            }
            .card-enter { animation: cardPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            
            /* 3. MASCOT SPRITES */
            .mascot-container {
                position: absolute; bottom: 20%; width: 100%;
                display: flex; justify-content: center; pointer-events: none;
                z-index: 5;
            }
            .mascot-sprite {
                font-size: 80px; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.1));
                transition: all 0.3s;
            }
            .mascot-float { animation: float 3s ease-in-out infinite; }

            /* 4. COMPANION BUBBLE */
            .manya-bubble {
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(10px);
                border-radius: 24px; padding: 20px;
                border: 2px solid white; box-shadow: 0 15px 30px rgba(0,0,0,0.1);
                width: 90%; max-width: 400px; position: relative;
            }
            .manya-bubble::after {
                content: ''; position: absolute; top: -15px; left: 50%;
                transform: translateX(-50%); border-left: 15px solid transparent;
                border-right: 15px solid transparent; border-bottom: 15px solid white;
            }

            /* ANIMATIONS */
            @keyframes waddle { from { transform: rotate(-10deg); } to { transform: rotate(10deg); } }
            @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
            @keyframes cardPop { from { transform: scale(0.8) translateY(50px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
            
            /* BUTTONS */
            .footer-zone { padding: 20px; background: white; border-top: 2px solid #e2e8f0; }
            .manya-btn {
                width: 100%; height: 56px; border-radius: 18px; border: none;
                background: var(--manya-green); color: white; font-weight: 800;
                font-size: 1.1rem; cursor: pointer; box-shadow: 0 4px 0 #16a34a;
                transition: all 0.1s;
            }
            .manya-btn:active { transform: translateY(4px); box-shadow: 0 0 0; }
            .manya-btn:disabled { background: #cbd5e1; box-shadow: 0 4px 0 #94a3b8; color: #94a3b8; }
        `;
        document.head.appendChild(style);
    },

    initQuest: (container, manifest) => {
        ManyaQuestRunner.injectGlobalStyles();
        ManyaQuestRunner.state.container = container;
        ManyaQuestRunner.state.manifest = manifest;
        ManyaQuestRunner.state.currentIndex = 0;
        
        ManyaQuestRunner.renderShell();
        ManyaQuestRunner.launchStep();
    },

    renderShell: () => {
        ManyaQuestRunner.state.container.innerHTML = `
            <div class="quest-shell">
                <div class="header-bar">
                    <button style="border:none; background:none; font-size:24px; color:#94a3b8">✕</button>
                    <div class="progress-track">
                        <div class="progress-fill" id="p-fill" style="width: 0%">
                            <div class="waddling-manya" id="manya-icon">🦆</div>
                        </div>
                    </div>
                    <div style="font-weight:800; color:#fbbf24">🔥 3</div>
                </div>
                
                <div id="engine-stage" class="card-enter"></div>

                <div class="footer-zone">
                    <button id="main-action-btn" class="manya-btn" disabled>CONTINUE</button>
                </div>
            </div>
        `;
    },

    launchStep: () => {
        const step = ManyaQuestRunner.state.manifest.steps[ManyaQuestRunner.state.currentIndex];
        const stage = document.getElementById('engine-stage');
        stage.innerHTML = ''; // Clear stage
        
        // Update Progress
        const percent = (ManyaQuestRunner.state.currentIndex / ManyaQuestRunner.state.manifest.steps.length) * 100;
        document.getElementById('p-fill').style.width = `${percent}%`;

        // Routing to Engines
        if (step.engine === "ManyaCompanion") {
            ManyaQuestRunner.renderCompanion(stage, step.data);
        } else if (step.engine === "SyntaxArchitect") {
            window.SyntaxArchitect.renderLabeling(stage, step.data);
            // Connect engine feedback to Runner's button
            ManyaQuestRunner.enableButton(true);
        }
    },

    renderCompanion: (stage, data) => {
        const charMap = {
            manya: { icon: "🦆", name: "MANYA", color: "#7e22ce" },
            polly: { icon: "🦜", name: "POLLY", color: "#10b981" },
            kiki: { icon: "🐱", name: "KIKI", color: "#f472b6" }
        };
        const char = charMap[data.speaker];

        stage.innerHTML = `
            <div class="mascot-container">
                <div class="mascot-sprite mascot-float">${char.icon}</div>
            </div>
            <div class="manya-bubble">
                <div style="color:${char.color}; font-weight:900; font-size:12px; margin-bottom:5px">${char.name}</div>
                <div style="font-size:1.2rem; font-weight:600; color:#1e293b" id="type-text"></div>
            </div>
        `;

        ManyaQuestRunner.typeEffect(data.text, "type-text");
        ManyaQuestRunner.enableButton(true);
    },

    typeEffect: async (text, elId) => {
        const el = document.getElementById(elId);
        let current = "";
        for(let char of text) {
            current += char;
            el.innerHTML = current;
            await new Promise(r => setTimeout(r, 25));
        }
    },

    enableButton: (enabled) => {
        const btn = document.getElementById('main-action-btn');
        btn.disabled = !enabled;
        btn.onclick = ManyaQuestRunner.next;
    },

    next: () => {
        if (ManyaQuestRunner.state.currentIndex < ManyaQuestRunner.state.manifest.steps.length - 1) {
            ManyaQuestRunner.state.currentIndex++;
            ManyaQuestRunner.launchStep();
        } else {
            alert("QUEST COMPLETE! +50 XP");
        }
    }
};

window.ManyaQuestRunner = ManyaQuestRunner;