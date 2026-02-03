/**
 * English Rule Master v2.5
 * Professional Manya-Branded Learning Cards
 */
export const EnglishRuleMaster = {
    state: { container: null, data: null, step: 0, demo: 'A' },

    renderLabeling: (container, data) => {
        EnglishRuleMaster.injectStyles();
        EnglishRuleMaster.state = { container, data, step: 0, demo: 'A' };
        EnglishRuleMaster.load();
    },

    load: () => {
        const { data, step, demo, container } = EnglishRuleMaster.state;
        
        // Mode 1: Full Vocabulary List
        if (data.type === "VOCABULARY_LIST") {
            container.innerHTML = `
                <div class="rule-box-elite">
                    <div class="rule-badge">MANYA'S DICTIONARY</div>
                    <h2 class="rule-main-title">New Holiday Words</h2>
                    <div class="vocab-scroll-list">
                        ${data.rules.map(w => `
                            <div class="vocab-row">
                                <div class="v-word">${w.word}</div>
                                <div class="v-meaning">${w.meaning}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            window.ManyaQuestRunner.enableButton(true, () => window.ManyaQuestRunner.next(), "I'VE READ THEM ALL!");
            return;
        }

        // Mode 2: Grammar Rule Steps
        const rule = data.rules[step];
        container.innerHTML = `
            <div class="rule-box-elite card-pop">
                <div class="rule-badge">GRAMMAR FORMULA</div>
                <h2 class="rule-main-title">${rule.title}</h2>
                <div class="manya-formula-card"><code>${rule.formula}</code></div>
                
                <div class="interactive-demo bento-card">
                    <div class="stx-toggle-bar">
                        <button class="stx-t-btn ${demo==='A'?'active':''}" onclick="MasterToggle('A')">${rule.toggleA}</button>
                        <button class="stx-t-btn ${demo==='B'?'active':''}" onclick="MasterToggle('B')">${rule.toggleB}</button>
                    </div>
                    <div class="stx-example-text">${demo==='A' ? rule.exampleA : rule.exampleB}</div>
                    <p class="stx-explain">${demo==='A' ? rule.explainA : rule.explainB}</p>
                </div>

                <div class="manya-note">
                    <b>💡 Manya says:</b><br>${rule.teacherNote}
                </div>
            </div>`;
        
        window.ManyaQuestRunner.enableButton(true, () => {
            if (step < data.rules.length - 1) {
                EnglishRuleMaster.state.step++;
                EnglishRuleMaster.load();
            } else {
                window.ManyaQuestRunner.next();
            }
        }, step === data.rules.length - 1 ? "START PRACTICE" : "NEXT RULE");
    },

    injectStyles: () => {
        if (document.getElementById('rule-elite-v3-styles')) return;
        const style = document.createElement('style');
        style.id = 'rule-elite-v3-styles';
        style.innerHTML = `
            .rule-box-elite { width: 100%; max-width: 500px; display: flex; flex-direction: column; gap: 20px; padding: 10px; }
            .rule-badge { display: inline-block; width: fit-content; padding: 5px 12px; background: #f3e8ff; color: #7e22ce; border-radius: 50px; font-size: 10px; font-weight: 900; letter-spacing: 1px; }
            .rule-main-title { font-size: 1.6rem; font-weight: 800; color: #1e293b; margin: 0; }
            
            .vocab-scroll-list { background: white; border-radius: 24px; border: 2px solid #e5e7eb; max-height: 400px; overflow-y: auto; box-shadow: 0 8px 0 #e5e7eb; }
            .vocab-row { padding: 15px 20px; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 4px; }
            .v-word { font-weight: 800; color: #7e22ce; font-size: 1.1rem; }
            .v-meaning { color: #64748b; font-size: 14px; font-weight: 600; }

            .manya-formula-card { background: #1e293b; color: #fbbf24; padding: 20px; border-radius: 20px; border-left: 8px solid #fbbf24; font-family: monospace; font-size: 1.1rem; }
            .stx-toggle-bar { display: flex; background: #f1f5f9; padding: 5px; border-radius: 15px; margin-bottom: 20px; }
            .stx-t-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-weight: 800; cursor: pointer; background: transparent; color: #64748b; }
            .stx-t-btn.active { background: white; color: #7e22ce; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
            .stx-example-text { font-size: 1.5rem; font-weight: 700; color: #1f2937; margin-bottom: 10px; text-align: center; }
            .stx-explain { font-size: 14px; color: #64748b; text-align: center; font-weight: 600; }
            .manya-note { background: #fff7ed; border: 1px solid #ffedd5; color: #9a3412; padding: 15px; border-radius: 18px; font-size: 13px; font-weight: 600; }
        `;
        document.head.appendChild(style);
    }
};
window.MasterToggle = (s) => { EnglishRuleMaster.state.demo = s; EnglishRuleMaster.load(); };
window.EnglishRuleMaster = EnglishRuleMaster;