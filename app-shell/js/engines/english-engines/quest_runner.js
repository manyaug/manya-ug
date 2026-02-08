/**
 * Manya Quest Runner v6.6 (Stable Edition) - Image Icon Update
 */
const INTERNAL_REGISTRY = {
    "SYNTAX_ENGINE": "/app-shell/js/engines/english-engines/syntax-architect.js",
    "FUNCTIONAL_COMPOSER": "/app-shell/js/engines/english-engines/functional_composer.js",
    "DEEP_READER": "/app-shell/js/engines/english-engines/deep_reader.js",
    "ENGLISH_RULE_MASTER": "/app-shell/js/engines/english-engines/english_rule_master.js",
    "HANGMAN_ENGINE": "/app-shell/js/engines/english-engines/game-hangman.js",
    "WORDGRID_ENGINE": "/app-shell/js/engines/english-engines/game-wordgrid.js",
    "JUNGLE_MAZE": "/app-shell/js/engines/english-engines/game-grammar-maze.js"
};

// NEW: Character Icon Paths
const CHAR_ICONS = {
    manya: "/assets/icons/manya_icon.png", // Assuming you'll add Manya and Polly icons here too
    polly: "/assets/icons/polly_icon.png",
    kiki: "/assets/icons/kiki_icon.png"
};

// Helper function to generate the avatar HTML
const getCharAvatar = (speaker) => {
    const src = CHAR_ICONS[speaker.toLowerCase()] || CHAR_ICONS['manya'];
    return `<img src="${src}" alt="${speaker} avatar" class="manya-avatar-img">`;
};


export const ManyaQuestRunner = {
    state: { container: null, manifest: null, currentIndex: 0, returnIndex: null, isTyping: false, stepMemory: {} },

    renderLabeling: async (container, data) => {
        window.ManyaQuestRunner = ManyaQuestRunner; // Ensure global access for onclicks
        ManyaQuestRunner.state.container = container;
        ManyaQuestRunner.state.manifest = data;
        ManyaQuestRunner.state.currentIndex = 0;
        ManyaQuestRunner.state.returnIndex = null;
        ManyaQuestRunner.state.stepMemory = {};

        // Sync Title
        const titleEl = document.getElementById('quest-title');
        if (titleEl) titleEl.innerText = data.topic || data.title || "English Quest";

        ManyaQuestRunner.injectStyles();
        ManyaQuestRunner.renderShell();
        await ManyaQuestRunner.launchStep();
    },

    renderShell: () => {
        ManyaQuestRunner.state.container.innerHTML = `
            <div class="manya-pwa-shell">
                <nav class="manya-pwa-nav">
                    <div class="manya-pwa-prog-track">
                        <div class="manya-pwa-prog-fill" id="p-fill">
                            <div class="manya-pwa-waddler"><img src="${CHAR_ICONS.manya}" alt="Manya" class="waddler-img"></div>
                        </div>
                    </div>
                    <button class="manya-pwa-skip" onclick="window.ManyaQuestRunner.next()">SKIP</button>
                </nav>
                <div id="engine-stage"></div>
                <div class="manya-pwa-footer">
                    <button id="main-action-btn" class="manya-pill-btn" disabled>CONTINUE</button>
                </div>
            </div>`;
        // Attach initial button handler
        document.getElementById('main-action-btn').onclick = ManyaQuestRunner.next;
    },

    launchStep: async () => {
        const step = ManyaQuestRunner.state.manifest.steps[ManyaQuestRunner.state.currentIndex];
        const stage = document.getElementById('engine-stage');
        stage.scrollTop = 0;
        ManyaQuestRunner.enableButton(false); // Disable button by default when launching new step

        const total = ManyaQuestRunner.state.manifest.steps.length;
        const percent = ((ManyaQuestRunner.state.currentIndex + 1) / total) * 100;
        document.getElementById('p-fill').style.width = `${percent}%`;

        if (step.engineType === "CHAT") {
            ManyaQuestRunner.renderCompanion(stage, step.data);
        } else if (step.engineType === "RULE_SELECTOR") { // New engine type for rule selection
            await ManyaQuestRunner.renderRuleSelection(stage, step.data);
        } else {
            try {
                const path = INTERNAL_REGISTRY[step.engineType];
                const module = await import(path + "?v=" + Date.now());
                const engine = Object.values(module)[0];
                const savedIndex = ManyaQuestRunner.state.stepMemory[step.id] || 0;
                await engine.renderLabeling(stage, step.data, savedIndex);
            } catch (err) {
                console.error(err);
                stage.innerHTML = `<div class="bento-card" style="color:red">Failed to load ${step.engineType}<br>${err.message}</div>`;
                ManyaQuestRunner.enableButton(true); // Allow continuing past error
            }
        }
    },

    renderCompanion: (stage, data) => {
        // const chars = { manya: "🦆", polly: "🦜", kiki: "🐱" }; // Emojis removed
        stage.innerHTML = `
            <div class="manya-msg-ui">
                ${data.image ? `<div class="manya-msg-img-box"><img src="${data.image}" class="manya-chat-img"></div>` : ''}
                <div class="manya-msg-row ${data.speaker === 'manya' ? 'speaker-manya' : ''}">
                    <div class="manya-msg-avatar">${getCharAvatar(data.speaker || 'manya')}</div>
                    <div class="manya-msg-bubble">
                        <div id="type-text" class="manya-msg-text"></div>
                        ${data.choices ? `<div class="manya-msg-choices" id="chat-choices">
                            ${data.choices.map(c => `<button class="manya-c-btn" onclick="window.ManyaQuestRunner.handleBranch('${c.action || ''}','${c.targetId || ''}','${c.ruleId || ''}')">${c.text}</button>`).join('')}
                        </div>` : ''}
                    </div>
                </div>
            </div>`;
        ManyaQuestRunner.typeEffect(data.text, "type-text", !!data.choices);
    },

    renderRuleSelection: async (stage, data) => {
        const path = INTERNAL_REGISTRY["ENGLISH_RULE_MASTER"];
        const module = await import(path + "?v=" + Date.now());
        const engine = Object.values(module)[0];

        const ruleSteps = ManyaQuestRunner.state.manifest.steps.filter(s => s.engineType === "ENGLISH_RULE_MASTER");
        await engine.renderLabeling(stage, { type: "RULE_SELECTION", rules: ruleSteps, currentChapterRules: data.chapterRules || [] });
        
        ManyaQuestRunner.enableButton(false);
    },

    saveStepProgress: (qIndex) => {
        const step = ManyaQuestRunner.state.manifest.steps[ManyaQuestRunner.state.currentIndex];
        ManyaQuestRunner.state.stepMemory[step.id] = qIndex;
    },

    jumpToRule: () => {
        const currentIdx = ManyaQuestRunner.state.currentIndex;
        const lastRule = ManyaQuestRunner.state.manifest.steps
            .slice(0, currentIdx)
            .reverse()
            .find(s => s.engineType === "ENGLISH_RULE_MASTER");

        if (lastRule) {
            ManyaQuestRunner.state.returnIndex = currentIdx;
            ManyaQuestRunner.state.currentIndex = ManyaQuestRunner.state.manifest.steps.indexOf(lastRule);
            ManyaQuestRunner.launchStep();
        }
    },

    enableButton: (enabled, callback, label = "CONTINUE") => {
        const btn = document.getElementById('main-action-btn');
        if (!btn) return;
        btn.disabled = !enabled;
        btn.innerText = ManyaQuestRunner.state.returnIndex !== null ? "RETURN TO TASK" : label;
        btn.onclick = callback || ManyaQuestRunner.next;
    },

    next: () => {
        if (ManyaQuestRunner.state.isTyping) return; 
        if (ManyaQuestRunner.state.returnIndex !== null) {
            ManyaQuestRunner.state.currentIndex = ManyaQuestRunner.state.returnIndex;
            ManyaQuestRunner.state.returnIndex = null;
            ManyaQuestRunner.launchStep();
            return;
        }
        if (ManyaQuestRunner.state.currentIndex < ManyaQuestRunner.state.manifest.steps.length - 1) {
            ManyaQuestRunner.state.currentIndex++;
            ManyaQuestRunner.launchStep();
        } else {
            // End of quest - Show completion message
            ManyaQuestRunner.state.container.innerHTML = `
                <div class="manya-pwa-shell" style="justify-content: center; align-items: center;">
                    <div class="bento-card" style="text-align:center; max-width: 400px; padding: 40px;">
                        <h1>🏆 Quest Complete!</h1>
                        <p style="margin-bottom: 20px;">You've mastered this chapter. Well done!</p>
                        <button class="manya-pill-btn" onclick="location.reload()">BACK TO MENU</button>
                    </div>
                </div>`;
        }
    },

    typeEffect: async (text, elId, hasChoices) => {
        ManyaQuestRunner.state.isTyping = true;
        const el = document.getElementById(elId);
        const choicesEl = document.getElementById('chat-choices');

        if (!el) return;

        el.innerHTML = "";
        if (choicesEl) choicesEl.style.display = 'none';
        ManyaQuestRunner.enableButton(false);

        let i = 0;
        const typingInterval = 15;
        const content = text;

        const typeChar = () => {
            if (i < content.length) {
                if (content[i] === '<') {
                    const endIndex = content.indexOf('>', i);
                    if (endIndex !== -1) {
                        el.innerHTML = content.substring(0, endIndex + 1);
                        i = endIndex + 1;
                    } else {
                        el.innerHTML += content[i];
                        i++;
                    }
                } else {
                    el.innerHTML += content[i];
                    i++;
                }
                setTimeout(typeChar, typingInterval);
            } else {
                ManyaQuestRunner.state.isTyping = false;
                if (choicesEl) choicesEl.style.display = 'flex';
                if (!hasChoices) {
                    ManyaQuestRunner.enableButton(true);
                }
            }
        };
        setTimeout(typeChar, typingInterval);
    },

    handleBranch: (action, targetId, ruleId) => {
        if (ManyaQuestRunner.state.isTyping) return; 

        if (action === "COMPLETE") {
            ManyaQuestRunner.state.currentIndex = ManyaQuestRunner.state.manifest.steps.length - 1;
            ManyaQuestRunner.next();
            return;
        }

        if (ruleId) {
            const targetRuleStep = ManyaQuestRunner.state.manifest.steps.find(s => s.id === ruleId);
            if (targetRuleStep) {
                ManyaQuestRunner.state.returnIndex = ManyaQuestRunner.state.currentIndex; 
                ManyaQuestRunner.state.currentIndex = ManyaQuestRunner.state.manifest.steps.indexOf(targetRuleStep);
                ManyaQuestRunner.launchStep();
                return;
            }
        }

        if (targetId) {
            const idx = ManyaQuestRunner.state.manifest.steps.findIndex(s => s.id === targetId);
            if (idx !== -1) { ManyaQuestRunner.state.currentIndex = idx; ManyaQuestRunner.launchStep(); }
        } else {
            ManyaQuestRunner.next();
        }
    },

    // ... (All other methods in ManyaQuestRunner.js remain unchanged) ...

    injectStyles: () => {
        if (document.getElementById('manya-v6-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-v6-styles';
        style.innerHTML = `
            .manya-pwa-shell { position: absolute; inset: 0; display: flex; flex-direction: column; background: #fdfbf7; z-index: 100; }
            .manya-pwa-nav { height: 60px; display: flex; align-items: center; padding: 0 20px; background: white; border-bottom: 2px solid #eef2ff; flex-shrink: 0; }
            .manya-pwa-prog-track { flex: 1; height: 10px; background: #f1f5f9; border-radius: 10px; position: relative; margin-right: 15px; }
            .manya-pwa-prog-fill { height: 100%; background: #7e22ce; border-radius: 10px; width: 0%; transition: width 0.5s; position: relative; }
            .manya-pwa-waddler { position: absolute; right: -12px; top: -20px; font-size: 24px; animation: waddle 0.6s infinite alternate; }
            
            /* Waddler image style */
            .waddler-img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
            
            .manya-pwa-skip { background: #f3e8ff; border: none; color: #7e22ce; font-weight: 800; font-size: 11px; padding: 6px 12px; border-radius: 8px; cursor: pointer; }
            #engine-stage { flex: 1; overflow-y: auto; width: 100%; display: flex; flex-direction: column; align-items: center; padding: 20px 10px; position: relative; }
            
            /* Chat UI Improvements */
            .manya-msg-ui { width: 100%; max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
            .manya-msg-img-box { width: 100%; text-align: center; margin-bottom: 10px; }
            .manya-chat-img { max-width: 95%; max-height: 280px; border-radius: 20px; border: 4px solid white; box-shadow: 0 10px 20px rgba(0,0,0,0.05); object-fit: cover; }
            .manya-msg-row { display: flex; align-items: flex-start; gap: 10px; width: 100%; margin: 0 auto; }
            
            /* Avatar replacement styles - FINAL FIX */
            .manya-msg-avatar { 
                width: 48px; /* SLIGHTLY LARGER */
                height: 48px; /* SLIGHTLY LARGER */
                background: none; /* REMOVE BACKGROUND COLOR */
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                flex-shrink: 0; 
                border: none; /* REMOVE BORDER */
                box-shadow: 0 4px 10px rgba(0,0,0,0.15); /* ADD SLIGHT SHADOW FOR FLOATING EFFECT */
                overflow: hidden;
            }
            .manya-avatar-img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%; /* Ensure the image is circular */
            }

            .manya-msg-row.speaker-manya .manya-msg-avatar { background: none; border-color: none; } /* Ensure no override for Manya */
            
            .manya-msg-bubble { background: white; border: 2px solid #e5e7eb; border-radius: 20px 20px 20px 4px; padding: 20px; flex: 1; box-shadow: 0 8px 0 #f1f5f9; position: relative; }
            .manya-msg-text { font-size: 1.15rem; font-weight: 700; color: #1e293b; line-height: 1.4; }
            .manya-msg-choices { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
            .manya-c-btn { padding: 15px; background: #f5f3ff; border: 2px solid #ddd6fe; border-radius: 12px; color: #7e22ce; font-weight: 800; font-size: 14px; cursor: pointer; text-align: left; transition: background 0.2s, transform 0.1s; }
            .manya-c-btn:hover { background: #ede9fe; transform: translateY(-1px); }

            /* ... (Rule Selection Styles remain the same) ... */

            .manya-pwa-footer { height: 100px; padding: 0 20px; background: white; border-top: 2px solid #f1f5f9; display: flex; align-items: center; flex-shrink: 0; }
            .manya-pill-btn { width: 100%; height: 56px; background: #7e22ce; color: white; border: none; border-radius: 50px; font-weight: 900; font-size: 1rem; box-shadow: 0 5px 0 #581c87; cursor: pointer; transition: background 0.2s, box-shadow 0.2s; }
            .manya-pill-btn:hover:not(:disabled) { background: #6d20b6; box-shadow: 0 4px 0 #4a177a; }
            .manya-pill-btn:disabled { background: #e5e5e5; color: #afafaf; box-shadow: 0 5px 0 #d1d5db; cursor: not-allowed; }
            .bento-card { background: white; border: 2px solid #e5e7eb; border-radius: 28px; padding: 25px; box-shadow: 0 8px 0 #e5e7eb; width: 100%; box-sizing: border-box; }
            @keyframes waddle { from { transform: rotate(-8deg); } to { transform: rotate(8deg); } }
        `;
        document.head.appendChild(style);
    }
};
