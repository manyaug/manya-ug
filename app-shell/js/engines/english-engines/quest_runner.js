/**
 * Manya Quest Runner v4.0 (Premium Conductor)
 * Branded for Manya Smart Learning P.7
 */

const INTERNAL_REGISTRY = {
    "SYNTAX_ENGINE": "/app-shell/js/engines/english-engines/syntax-architect.js",
    "FUNCTIONAL_COMPOSER": "/app-shell/js/engines/english-engines/functional_composer.js",
    "DEEP_READER": "/app-shell/js/engines/english-engines/deep_reader.js",
    "ENGLISH_RULE_MASTER": "/app-shell/js/engines/english-engines/english_rule_master.js"
};

export const ManyaQuestRunner = {
    state: { container: null, manifest: null, currentIndex: 0, isTyping: false, isDev: true },

    renderLabeling: async (container, data) => {
        ManyaQuestRunner.state.container = container;
        ManyaQuestRunner.state.manifest = data;
        ManyaQuestRunner.state.currentIndex = 0;
        ManyaQuestRunner.injectStyles();
        ManyaQuestRunner.renderShell();
        await ManyaQuestRunner.launchStep();
    },

    renderShell: () => {
        ManyaQuestRunner.state.container.innerHTML = `
            <div class="manya-shell">
                <div class="manya-bg-pattern"></div>
                <div class="manya-header">
                    <button class="header-exit" onclick="location.reload()">✕</button>
                    <div class="progress-container">
                        <div class="progress-track">
                            <div class="progress-fill" id="p-fill">
                                <div class="waddle-manya">🦆</div>
                            </div>
                        </div>
                    </div>
                    <div class="header-meta">
                        ${ManyaQuestRunner.state.isDev ? `<button class="dev-skip" onclick="ManyaQuestRunner.next()">SKIP</button>` : '<span class="streak-pill">🔥 3</span>'}
                    </div>
                </div>
                
                <div id="engine-stage" class="engine-stage"></div>

                <div class="manya-footer">
                    <div class="footer-inner">
                        <div id="stx-progress-text" class="step-counter"></div>
                        <button id="main-action-btn" class="manya-btn-primary" disabled>
                            <span>CONTINUE</span>
                            <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M8.59,16.59L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.59Z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    launchStep: async () => {
        const step = ManyaQuestRunner.state.manifest.steps[ManyaQuestRunner.state.currentIndex];
        const stage = document.getElementById('engine-stage');
        stage.innerHTML = '<div class="manya-loader-container"><div class="manya-loader"></div></div>';
        
        ManyaQuestRunner.enableButton(false);
        const percent = ((ManyaQuestRunner.state.currentIndex + 1) / ManyaQuestRunner.state.manifest.steps.length) * 100;
        document.getElementById('p-fill').style.width = `${percent}%`;
        document.getElementById('stx-progress-text').innerText = `STEP ${ManyaQuestRunner.state.currentIndex + 1} OF ${ManyaQuestRunner.state.manifest.steps.length}`;

        if (step.engineType === "CHAT") {
            ManyaQuestRunner.renderCompanion(stage, step.data);
        } else {
            try {
                const path = INTERNAL_REGISTRY[step.engineType];
                const module = await import(path + "?v=" + Date.now());
                const engine = Object.values(module)[0];
                await engine.renderLabeling(stage, step.data);
            } catch (err) {
                console.error("Runner Error:", err);
                stage.innerHTML = `
                    <div class="bento-card error-anim">
                        <h3 style="color:#ef4444">Engine Offline</h3>
                        <p style="color:#64748b">The <b>${step.engineType}</b> is currently unavailable in offline mode.</p>
                        <button class="branch-btn" onclick="ManyaQuestRunner.next()">STAY ON COURSE</button>
                    </div>`;
            }
        }
    },

    renderCompanion: (stage, data) => {
    const charMap = { 
        manya: { icon: "🦆", name: "Manya", color: "#7e22ce" },
        polly: { icon: "🦜", name: "Polly", color: "#ef4444" },
        kiki: { icon: "🐱", name: "Kiki", color: "#f59e0b" }
    };
    const char = charMap[data.speaker || 'manya'];

    // Professional Stage Layout
    stage.innerHTML = `
        <div class="companion-stage">
            <!-- Contextual Background Icon -->
            <div class="bg-decoration">🏡🌳</div> 
            
            <div class="mascot-wrapper float-anim">
                <div class="mascot-main">${char.icon}</div>
                <div class="char-name-tag" style="background:${char.color}">${char.name}</div>
            </div>

            <div class="speech-bubble-v2">
                <div class="speech-text-v2" id="type-text"></div>
            </div>
        </div>
    `;

    // Highlighting grammar logic in text
    let formattedText = data.text
        .replace(/EXCITED/g, '<span class="grammar-feeling">EXCITED</span>')
        .replace(/EXCITING/g, '<span class="grammar-thing">EXCITING</span>');

    ManyaQuestRunner.typeEffect(formattedText, "type-text");
},

    typeEffect: async (text, elId) => {
        ManyaQuestRunner.state.isTyping = true;
        const el = document.getElementById(elId);
        if(!el) return;
        let current = "";
        for(let char of text) {
            current += char;
            el.innerHTML = current;
            await new Promise(r => setTimeout(r, 15));
        }
        ManyaQuestRunner.state.isTyping = false;
        ManyaQuestRunner.enableButton(true);
    },

    enableButton: (enabled, callback, label = "CONTINUE") => {
        const btn = document.getElementById('main-action-btn');
        if(!btn) return;
        btn.disabled = !enabled;
        const labelEl = btn.querySelector('span');
        if(labelEl) labelEl.innerText = label;
        btn.onclick = callback || ManyaQuestRunner.next;
    },

    next: async () => {
        if (ManyaQuestRunner.state.isTyping) return;
        if (ManyaQuestRunner.state.currentIndex < ManyaQuestRunner.state.manifest.steps.length - 1) {
            ManyaQuestRunner.state.currentIndex++;
            await ManyaQuestRunner.launchStep();
        } else {
            ManyaQuestRunner.renderFinalScreen();
        }
    },

    renderFinalScreen: () => {
        ManyaQuestRunner.state.container.innerHTML = `
            <div class="completion-screen">
                <div class="manya-bg-pattern"></div>
                <div class="bento-card celebration-card">
                    <div class="confetti-icon">🎓</div>
                    <h1 class="gradient-text">Quest Complete!</h1>
                    <p>Manya is proud of you! You've mastered these skills. Ready for the next adventure?</p>
                    <div class="final-buttons">
                        <button class="branch-btn primary" onclick="location.reload()">🏁 FINISH CHAPTER</button>
                        <button class="branch-btn" onclick="location.reload()">📚 REVIEW NOTES</button>
                    </div>
                </div>
            </div>`;
    },

    injectStyles: () => {
        if (document.getElementById('manya-master-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-master-styles';
        style.innerHTML = `
            :root {
                --manya-purple: #7e22ce;
                --manya-purple-deep: #581c87;
                --manya-slate: #f8fafc;
                --manya-border: #e5e7eb;
                --manya-text: #1e293b;
            }

            .manya-shell { 
                position: absolute; inset: 0; 
                display: flex; flex-direction: column; 
                background: var(--manya-slate); 
                font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; 
                color: var(--manya-text);
            }

            .manya-bg-pattern {
                position: absolute; inset: 0;
                background-image: radial-gradient(#7e22ce15 1px, transparent 1px);
                background-size: 30px 30px;
                pointer-events: none;
            }

            /* FLOATING HEADER */
            .manya-header { 
                height: 80px; display: flex; align-items: center; 
                padding: 0 20px; background: rgba(255, 255, 255, 0.8); 
                backdrop-filter: blur(10px);
                border-bottom: 1px solid var(--manya-border); gap: 15px; 
                z-index: 100;
            }
            .header-exit { 
                background: none; border: none; font-size: 20px; 
                color: #94a3b8; cursor: pointer; font-weight: bold;
                padding: 10px;
            }

            .progress-container { flex: 1; padding: 0 10px; }
            .progress-track { 
                height: 12px; background: #e2e8f0; 
                border-radius: 20px; overflow: visible; position: relative; 
            }
            .progress-fill { 
                height: 100%; background: linear-gradient(90deg, #a855f7, #7e22ce); 
                border-radius: 20px; width: 0%; 
                transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); 
                position: relative;
                box-shadow: 0 0 15px rgba(126, 34, 206, 0.3);
            }
            .waddle-manya { 
                position: absolute; right: -18px; top: -32px; 
                font-size: 32px; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.1));
                animation: waddle 0.4s infinite alternate ease-in-out; 
            }

            /* STAGE */
            .engine-stage { 
                flex: 1; overflow-y: auto; display: flex; 
                flex-direction: column; align-items: center; 
                justify-content: center; padding: 20px; 
                position: relative; z-index: 10;
            }
            .bento-card { 
                background: white; border: 1px solid var(--manya-border); 
                border-radius: 32px; padding: 32px; 
                box-shadow: 0 12px 0px #e2e8f0, 0 20px 25px -5px rgba(0,0,0,0.05); 
                width: 100%; max-width: 500px;
                transition: transform 0.2s;
            }

            /* FOOTER & BUTTON */
            .manya-footer { 
                padding: 20px; background: white; 
                border-top: 1px solid var(--manya-border); 
                z-index: 50;
            }
            .footer-inner { max-width: 500px; margin: 0 auto; width: 100%; }
            .step-counter { 
                text-align: center; font-size: 11px; font-weight: 800; 
                color: #94a3b8; letter-spacing: 1.5px; margin-bottom: 12px;
            }

            .manya-btn-primary { 
                width: 100%; height: 68px; 
                background: linear-gradient(180deg, #9333ea 0%, #7e22ce 100%);
                color: white; border: none; border-radius: 24px; 
                font-weight: 800; font-size: 1.15rem; 
                box-shadow: 0 6px 0 #581c87; 
                cursor: pointer; transition: all 0.15s cubic-bezier(0.17, 0.67, 0.83, 0.67);
                display: flex; align-items: center; justify-content: center; gap: 12px;
            }
            .manya-btn-primary:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 2px 0 #581c87; }
            .manya-btn-primary:disabled { background: #cbd5e1; color: #94a3b8; box-shadow: 0 6px 0 #94a3b866; cursor: not-allowed; }

            /* COMPANION */
            .mascot-hero-wrapper { position: relative; margin-bottom: -10px; }
            .mascot-hero { font-size: 130px; z-index: 2; position: relative; }
            .mascot-shadow { 
                width: 80px; height: 15px; background: rgba(0,0,0,0.1); 
                border-radius: 50%; margin: -20px auto 0;
                animation: shadow-pulse 3s ease-in-out infinite;
            }
            .speech-text { font-size: 1.35rem; font-weight: 700; color: #334155; line-height: 1.5; text-align: center; }

            /* FINAL SCREEN */
            .completion-screen { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 25px; background: var(--manya-slate); }
            .celebration-card { text-align: center; animation: pop 0.5s cubic-bezier(0.17, 0.67, 0.83, 0.67); }
            .gradient-text { background: linear-gradient(45deg, #7e22ce, #db2777); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2.2rem; margin: 10px 0; }
            .confetti-icon { font-size: 80px; margin-bottom: 10px; display: inline-block; animation: tilt 2s infinite linear; }
            
            .streak-pill { background: #fff7ed; color: #ea580c; padding: 6px 12px; border-radius: 12px; font-weight: 800; font-size: 14px; border: 1px solid #ffedd5; }
            .branch-btn { width: 100%; padding: 18px; border: 2px solid var(--manya-border); border-radius: 20px; font-weight: 800; cursor: pointer; background: white; margin-top: 10px; transition: 0.2s; }
            .branch-btn:active { background: #f1f5f9; }
            .branch-btn.primary { background: #7e22ce; color: white; border-color: #7e22ce; box-shadow: 0 4px 0 #581c87; }

            /* ANIMATIONS */
            @keyframes waddle { from { transform: rotate(-8deg); } to { transform: rotate(12deg); } }
            @keyframes shadow-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.5; } }
            @keyframes tilt { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(10deg); } 75% { transform: rotate(-10deg); } }
            @keyframes pop { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            .manya-loader { width: 40px; height: 40px; border: 5px solid #e2e8f0; border-top-color: #7e22ce; border-radius: 50%; animation: spin 1s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
            /* COMPANION STYLES */
        /* The Stage */
        .companion-stage {
            width: 100%; height: 100%; display: flex; flex-direction: column;
            align-items: center; justify-content: center; position: relative;
        }

        /* Background Decoration */
        .bg-decoration {
            position: absolute; font-size: 150px; opacity: 0.05; z-index: 0;
            top: 20%; pointer-events: none;
        }

        /* Mascot Styling */
        .mascot-wrapper {
            position: relative; margin-bottom: -10px; z-index: 2;
        }
        .mascot-main { font-size: 100px; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1)); }
        
        .char-name-tag {
            position: absolute; bottom: 0; right: -10px;
            color: white; font-size: 10px; font-weight: 900;
            padding: 4px 10px; border-radius: 50px; border: 2px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }

        /* The Professional Bubble */
        .speech-bubble-v2 {
            background: white; border: 3px solid #e5e7eb; border-radius: 30px;
            padding: 30px; width: 90%; max-width: 450px; position: relative;
            box-shadow: 0 12px 0 #e5e7eb; z-index: 1;
        }
        
        /* The Pointy Tail */
        .speech-bubble-v2::before {
            content: ''; position: absolute; top: -20px; left: 50%;
            transform: translateX(-50%);
            border-left: 20px solid transparent; border-right: 20px solid transparent;
            border-bottom: 20px solid #e5e7eb;
        }

        .speech-text-v2 {
            font-size: 1.4rem; font-weight: 700; color: #3c3c3c; line-height: 1.5; text-align: center;
        }

        /* Grammar Highlights */
        .grammar-feeling { color: #3b82f6; text-decoration: underline; } /* Blue for -ed */
        .grammar-thing { color: #f97316; text-decoration: underline; }   /* Orange for -ing */

        /* Button Fix: Match Manya Purple */
        .manya-btn-primary {
            background: #7e22ce !important;
            box-shadow: 0 6px 0 #581c87 !important;
        }
    `;
        document.head.appendChild(style);
    }
};

window.ManyaQuestRunner = ManyaQuestRunner;