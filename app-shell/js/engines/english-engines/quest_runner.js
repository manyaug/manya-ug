/**
 * Manya Quest Runner v4.0 (Messaging UI Edition)
 * Features: Optional top-images, messaging-style bubbles, attached small mascots.
 */

const INTERNAL_REGISTRY = {
    "SYNTAX_ENGINE": "/app-shell/js/engines/english-engines/syntax-architect.js",
    "FUNCTIONAL_COMPOSER": "/app-shell/js/engines/english-engines/functional_composer.js",
    "DEEP_READER": "/app-shell/js/engines/english-engines/deep_reader.js",
    "ENGLISH_RULE_MASTER": "/app-shell/js/engines/english-engines/english_rule_master.js"
};

export const ManyaQuestRunner = {
    state: { container: null, manifest: null, currentIndex: 0, isTyping: false },

    renderLabeling: async (container, data) => {
        window.ManyaQuestRunner = ManyaQuestRunner;
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
                <nav class="manya-glass-nav">
                    <div class="level-indicator">
                        <span class="level-text">LEVEL 1 DUCKLING</span>
                        <div class="mini-progress-track"><div class="mini-progress-fill" id="p-fill"></div></div>
                    </div>
                    <button class="skip-btn" onclick="window.ManyaQuestRunner.next()">Skip</button>
                </nav>
                <div id="engine-stage"></div>
                <div class="manya-footer">
                    <button id="main-action-btn" class="pill-button" disabled>CONTINUE</button>
                </div>
            </div>`;
    },

    launchStep: async () => {
        const step = ManyaQuestRunner.state.manifest.steps[ManyaQuestRunner.state.currentIndex];
        const stage = document.getElementById('engine-stage');
        stage.scrollTop = 0;
        ManyaQuestRunner.enableButton(false);

        const percent = ((ManyaQuestRunner.state.currentIndex + 1) / ManyaQuestRunner.state.manifest.steps.length) * 100;
        document.getElementById('p-fill').style.width = `${percent}%`;

        if (step.engineType === "CHAT") {
            ManyaQuestRunner.renderCompanion(stage, step.data);
        } else {
            const path = INTERNAL_REGISTRY[step.engineType];
            const module = await import(path + "?v=" + Date.now());
            const engine = Object.values(module)[0];
            await engine.renderLabeling(stage, step.data);
        }
    },

    renderCompanion: (stage, data) => {
        const charMap = { 
            manya: { icon: "🦆", color: "#7e22ce" }, 
            polly: { icon: "🦜", color: "#ef4444" }, 
            kiki: { icon: "🐱", color: "#f59e0b" } 
        };
        const char = charMap[data.speaker || 'manya'];

        // If data.image exists, we show it at the top. Otherwise, stage just holds the bubble.
        stage.innerHTML = `
            <div class="messaging-layout">
                <div class="image-area">
                    ${data.image ? `<img src="${data.image}" class="chat-image" alt="Scene">` : `<!-- No Image -->`}
                </div>
                
                <div class="chat-row">
                    <div class="mini-mascot-avatar" style="background:${char.color}">
                        ${char.icon}
                    </div>
                    <div class="chat-message-bubble">
                        <div class="speech-text" id="type-text"></div>
                    </div>
                </div>
            </div>`;
            
        ManyaQuestRunner.typeEffect(data.text, "type-text");
    },

    typeEffect: async (text, elId) => {
        ManyaQuestRunner.state.isTyping = true;
        const el = document.getElementById(elId);
        if(!el) return;
        el.innerHTML = text; 
        const content = el.innerHTML;
        el.innerHTML = "";
        let i = 0;
        const typing = setInterval(() => {
            if (i < content.length) {
                if (content[i] === '<') i = content.indexOf('>', i) + 1;
                else i++;
                el.innerHTML = content.substring(0, i);
            } else {
                clearInterval(typing);
                ManyaQuestRunner.state.isTyping = false;
                ManyaQuestRunner.enableButton(true);
            }
        }, 15);
    },

    enableButton: (enabled, callback, label = "CONTINUE") => {
        const btn = document.getElementById('main-action-btn');
        if(!btn) return;
        btn.disabled = !enabled;
        btn.innerText = label;
        btn.onclick = callback || ManyaQuestRunner.next;
    },

    next: () => {
        if (ManyaQuestRunner.state.currentIndex < ManyaQuestRunner.state.manifest.steps.length - 1) {
            ManyaQuestRunner.state.currentIndex++;
            ManyaQuestRunner.launchStep();
        }
    },

    injectStyles: () => {
        if (document.getElementById('manya-messaging-styles')) return;
        const s = document.createElement('style');
        s.id = 'manya-messaging-styles';
        s.innerHTML = `
            .manya-shell { position: absolute; inset: 0; display: flex; flex-direction: column; background: #fdfbf7; z-index: 10; }
            .manya-glass-nav { height: 60px; display: flex; align-items: center; padding: 0 20px; gap: 20px; background: white; border-bottom: 1px solid #eef2ff; }
            .level-indicator { flex: 1; }
            .level-text { font-size: 9px; font-weight: 900; color: #94a3b8; letter-spacing: 1px; }
            .mini-progress-track { width: 100%; height: 8px; background: #f1f5f9; border-radius: 10px; margin-top: 2px; }
            .mini-progress-fill { width: 0%; height: 100%; background: #7e22ce; border-radius: 10px; transition: 0.5s; }
            .skip-btn { background: #f1f5f9; border: none; color: #94a3b8; font-weight: 800; font-size: 11px; padding: 5px 12px; border-radius: 8px; cursor: pointer; }

            /* Content Stage: Messaging Layout */
            #engine-stage { flex: 1; overflow-y: auto; width: 100%; display: flex; flex-direction: column; }
            
            .messaging-layout { flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; }

            /* Top Image Area */
            .image-area { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 100px; padding-bottom: 20px; }
            .chat-image { max-width: 100%; max-height: 250px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 4px solid white; object-fit: contain; animation: slideDown 0.4s ease-out; }

            /* Bottom Chat Row */
            .chat-row { display: flex; align-items: flex-end; gap: 10px; width: 100%; max-width: 500px; margin: 0 auto; }
            .mini-mascot-avatar { width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); flex-shrink: 0; }
            
            .chat-message-bubble { background: white; border: 2px solid #e5e7eb; border-radius: 20px 20px 20px 4px; padding: 18px 22px; flex: 1; box-shadow: 0 8px 0 #f1f5f9; position: relative; animation: popUp 0.3s ease-out; }
            .speech-text { font-size: 1.15rem; font-weight: 700; color: #1e293b; line-height: 1.4; }

            .manya-footer { height: 100px; padding: 0 20px; background: white; border-top: 2px solid #f1f5f9; display: flex; align-items: center; flex-shrink: 0; }
            .pill-button { width: 100%; height: 56px; background: #7e22ce; color: white; border: none; border-radius: 50px; font-weight: 900; font-size: 1rem; box-shadow: 0 5px 0 #581c87; cursor: pointer; transition: 0.1s; }
            .pill-button:active { transform: translateY(3px); box-shadow: 0 2px 0 #581c87; }
            .pill-button:disabled { background: #e5e5e5; color: #afafaf; box-shadow: 0 5px 0 #d1d5db; }

            @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes popUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `;
        document.head.appendChild(s);
    }
};