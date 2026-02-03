/**
 * Manya Quest Runner v3.0 (Professional Branded Edition)
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
                <div class="manya-header">
                    <button class="header-icon" onclick="location.reload()">✕</button>
                    <div class="progress-track">
                        <div class="progress-fill" id="p-fill">
                            <div class="waddle-manya">🦆</div>
                        </div>
                    </div>
                    ${ManyaQuestRunner.state.isDev ? `<button class="dev-skip" onclick="ManyaQuestRunner.next()">SKIP</button>` : ''}
                </div>
                
                <div id="engine-stage"></div>

                <div class="manya-footer">
                    <div id="manya-feedback-area"></div>
                    <button id="main-action-btn" class="manya-btn-primary" disabled>CONTINUE</button>
                </div>
            </div>
        `;
    },

    launchStep: async () => {
        const step = ManyaQuestRunner.state.manifest.steps[ManyaQuestRunner.state.currentIndex];
        const stage = document.getElementById('engine-stage');
        stage.innerHTML = '<div class="manya-loader"></div>';
        ManyaQuestRunner.enableButton(false);

        const percent = (ManyaQuestRunner.state.currentIndex / ManyaQuestRunner.state.manifest.steps.length) * 100;
        document.getElementById('p-fill').style.width = `${percent}%`;

        if (step.engineType === "CHAT") {
            ManyaQuestRunner.renderCompanion(stage, step.data);
        } else {
            try {
                const path = INTERNAL_REGISTRY[step.engineType];
                const module = await import(path + "?v=" + Date.now());
                const engine = Object.values(module)[0];
                await engine.renderLabeling(stage, step.data);
            } catch (err) {
                stage.innerHTML = `<div class="error-card">Failed to load ${step.engineType}</div>`;
            }
        }
    },

    renderCompanion: (stage, data) => {
        const charMap = { manya: "🦆", polly: "🦜", kiki: "🐱" };
        const char = data.speaker || 'manya';
        stage.innerHTML = `
            <div class="companion-layout">
                <div class="mascot-hero float-anim">${charMap[char]}</div>
                <div class="speech-bubble bento-card">
                    <div class="speech-text" id="type-text"></div>
                </div>
            </div>`;
        ManyaQuestRunner.typeEffect(data.text, "type-text");
    },

    typeEffect: async (text, elId) => {
        ManyaQuestRunner.state.isTyping = true;
        const el = document.getElementById(elId);
        let current = "";
        for(let char of text) {
            current += char;
            el.innerHTML = current;
            await new Promise(r => setTimeout(r, 20));
        }
        ManyaQuestRunner.state.isTyping = false;
        ManyaQuestRunner.enableButton(true);
    },

    enableButton: (enabled, callback, label = "CONTINUE") => {
        const btn = document.getElementById('main-action-btn');
        btn.disabled = !enabled;
        btn.innerText = label;
        btn.onclick = callback || ManyaQuestRunner.next;
    },

    next: async () => {
        if (ManyaQuestRunner.state.isTyping) return;
        if (ManyaQuestRunner.state.currentIndex < ManyaQuestRunner.state.manifest.steps.length - 1) {
            ManyaQuestRunner.state.currentIndex++;
            await ManyaQuestRunner.launchStep();
        } else {
            ManyaQuestRunner.state.container.innerHTML = `<div class="finish-screen"><h1>🌟 Quest Complete!</h1><button class="manya-btn-primary" onclick="location.reload()">FINISH</button></div>`;
        }
    },

    injectStyles: () => {
        if (document.getElementById('manya-runner-v3-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-runner-v3-styles';
        style.innerHTML = `
            .manya-shell { position: absolute; inset: 0; display: flex; flex-direction: column; background: #fdfbf7; }
            .manya-header { height: 70px; display: flex; align-items: center; padding: 0 20px; background: white; border-bottom: 2px solid #e5e7eb; gap: 15px; }
            .progress-track { flex: 1; height: 14px; background: #e5e7eb; border-radius: 20px; position: relative; }
            .progress-fill { height: 100%; background: #58cc02; border-radius: 20px; width: 0%; transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); position: relative; }
            .waddle-manya { position: absolute; right: -15px; top: -25px; font-size: 26px; animation: waddle 0.6s infinite alternate; }
            
            #engine-stage { flex: 1; overflow-y: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
            
            .bento-card { background: white; border: 2px solid #e5e7eb; border-radius: 28px; padding: 25px; box-shadow: 0 8px 0 #e5e7eb; }
            .companion-layout { display: flex; flex-direction: column; align-items: center; width: 100%; gap: 30px; }
            .mascot-hero { font-size: 110px; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.1)); }
            .speech-text { font-size: 1.4rem; font-weight: 700; color: #3c3c3c; line-height: 1.4; text-align: center; }

            .manya-footer { padding: 20px; background: white; border-top: 2px solid #e5e7eb; }
            .manya-btn-primary { 
                width: 100%; height: 60px; background: #58cc02; border: none; border-radius: 18px; 
                color: white; font-weight: 900; font-size: 1.1rem; cursor: pointer;
                box-shadow: 0 6px 0 #46a302; transition: 0.1s;
            }
            .manya-btn-primary:active { transform: translateY(4px); box-shadow: none; }
            .manya-btn-primary:disabled { background: #e5e5e5; color: #afafaf; box-shadow: 0 6px 0 #d5d5d5; }

            .dev-skip { background: #f3e8ff; color: #7e22ce; border: none; border-radius: 8px; padding: 5px 10px; font-weight: 800; font-size: 10px; cursor: pointer; }
            .float-anim { animation: float 3s ease-in-out infinite; }
            @keyframes waddle { from { transform: rotate(-10deg); } to { transform: rotate(10deg); } }
            @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        `;
        document.head.appendChild(style);
    }
};
window.ManyaQuestRunner = ManyaQuestRunner;