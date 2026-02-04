/**
 * English Rule Master v3.1 (Elite Edition)
 * Branded for Manya Smart Learning P.7
 */
export const EnglishRuleMaster = {
    state: {
        container: null,
        data: null,
        step: 0,
        demo: 'A'
    },

    renderLabeling: (container, data) => {
        // Reset state for new Quest
        EnglishRuleMaster.state.container = container;
        EnglishRuleMaster.state.data = data;
        EnglishRuleMaster.state.step = 0;
        EnglishRuleMaster.state.demo = 'A';

        // Bind global functions to window
        window.MasterToggle = EnglishRuleMaster.toggle;
        window.RuleMasterNav = EnglishRuleMaster.nav;

        EnglishRuleMaster.injectStyles();
        EnglishRuleMaster.load();
    },

    load: () => {
        const { data, step, demo, container } = EnglishRuleMaster.state;
        
        // Mode 1: Full Vocabulary List (The "Dictionary" view)
        if (data.type === "VOCABULARY_LIST") {
            container.innerHTML = EnglishRuleMaster.getVocabHTML(data.rules);
            window.ManyaQuestRunner.enableButton(true, () => window.ManyaQuestRunner.next(), "I'VE READ THEM ALL!");
            return;
        }

        // Mode 2: Step-by-Step Grammar Rules
        const rule = data.rules[step];
        const isLastRule = step === data.rules.length - 1;

        container.innerHTML = `
            <div class="manya-rule-card bento-card card-pop">
                <div class="rule-top-meta">
                    <span class="rule-indicator">RULE ${step + 1} OF ${data.rules.length}</span>
                </div>
                
                <h2 class="manya-rule-title">${rule.title}</h2>
                
                <div class="manya-formula-box">
                    <span class="formula-tag">FORMULA</span>
                    <code>${rule.formula}</code>
                </div>

                <div class="manya-interactive-sandbox">
                    <div class="manya-toggle-pill">
                        <button class="m-tgl ${demo==='A'?'active':''}" onclick="MasterToggle('A')">${rule.toggleA}</button>
                        <button class="m-tgl ${demo==='B'?'active':''}" onclick="MasterToggle('B')">${rule.toggleB}</button>
                    </div>
                    
                    <div class="manya-example-display">
                        <div class="manya-sentence">${demo==='A' ? rule.exampleA : rule.exampleB}</div>
                        <div class="manya-explanation">${demo==='A' ? rule.explainA : rule.explainB}</div>
                    </div>
                </div>

                <div class="manya-pro-tip">
                    <div class="tip-icon">🦆</div>
                    <div class="tip-content">
                        <strong>Manya's Pro-Tip:</strong><br>
                        ${rule.teacherNote}
                    </div>
                </div>
            </div>
        `;

        // Update the global footer button
        window.ManyaQuestRunner.enableButton(true, () => {
            if (isLastRule) {
                window.ManyaQuestRunner.next();
            } else {
                EnglishRuleMaster.nav(1);
            }
        }, isLastRule ? "START PRACTICE" : "NEXT RULE");
    },

    getVocabHTML: (words) => `
        <div class="manya-rule-card bento-card card-pop">
            <span class="rule-indicator">CHAPTER DICTIONARY</span>
            <h2 class="manya-rule-title">Master the Meanings</h2>
            <div class="manya-vocab-scroll">
                ${words.map(w => `
                    <div class="manya-vocab-row">
                        <div class="v-word">${w.word}</div>
                        <div class="v-meaning">${w.meaning}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `,

    toggle: (side) => {
        EnglishRuleMaster.state.demo = side;
        EnglishRuleMaster.load();
    },

    nav: (dir) => {
        EnglishRuleMaster.state.step += dir;
        EnglishRuleMaster.state.demo = 'A';
        EnglishRuleMaster.load();
    },

    injectStyles: () => {
        if (document.getElementById('manya-rule-master-styles')) return;
        const s = document.createElement('style');
        s.id = 'manya-rule-master-styles';
        s.innerHTML = `
            .manya-rule-card { width: 100%; max-width: 460px; margin: 0 auto; display: flex; flex-direction: column; }
            .manya-rule-title { font-size: 1.5rem; font-weight: 800; color: #1e293b; margin: 5px 0 15px 0; letter-spacing: -0.5px; }
            .rule-indicator { font-size: 10px; font-weight: 900; color: #7e22ce; background: #f3e8ff; padding: 4px 12px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; }
            
            /* Formula Styling */
            .manya-formula-box { background: #1e293b; border-radius: 18px; padding: 18px; margin-bottom: 20px; border-left: 6px solid #fbbf24; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3); }
            .formula-tag { display: block; font-size: 9px; font-weight: 900; color: #fbbf24; opacity: 0.8; margin-bottom: 6px; letter-spacing: 1px; }
            .manya-formula-box code { color: #fff; font-family: 'Courier New', monospace; font-size: 1.05rem; display: block; line-height: 1.4; }

            /* Toggle Switch */
            .manya-toggle-pill { display: flex; background: #f1f5f9; padding: 5px; border-radius: 16px; margin-bottom: 20px; }
            .m-tgl { flex: 1; padding: 12px; border: none; border-radius: 12px; font-weight: 800; font-size: 12px; cursor: pointer; background: transparent; color: #64748b; transition: 0.2s; }
            .m-tgl.active { background: white; color: #7e22ce; box-shadow: 0 4px 12px rgba(126, 34, 206, 0.15); }

            /* Example Display */
            .manya-example-display { background: #fdfbf7; border: 2px dashed #d8b4fe; border-radius: 20px; padding: 20px; margin-bottom: 20px; text-align: center; }
            .manya-sentence { font-size: 1.35rem; font-weight: 700; color: #1f2937; margin-bottom: 8px; line-height: 1.3; }
            .manya-explanation { font-size: 14px; color: #64748b; font-weight: 600; line-height: 1.4; }

            /* Vocab Scroll */
            .manya-vocab-scroll { max-height: 50vh; overflow-y: auto; padding-right: 5px; margin-top: 10px; }
            .manya-vocab-row { padding: 15px 0; border-bottom: 1px solid #f1f5f9; }
            .v-word { font-weight: 800; color: #7e22ce; font-size: 1.1rem; margin-bottom: 4px; }
            .v-meaning { color: #475569; font-size: 14px; font-weight: 500; line-height: 1.4; }

            /* Pro Tip Box */
            .manya-pro-tip { display: flex; gap: 15px; background: #fff7ed; border: 1px solid #ffedd5; padding: 15px; border-radius: 20px; align-items: flex-start; }
            .tip-icon { font-size: 24px; }
            .tip-content { font-size: 12px; color: #9a3412; line-height: 1.5; }

            .card-pop { animation: cardPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
            @keyframes cardPop { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        `;
        document.head.appendChild(s);
    }
};