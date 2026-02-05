export const EnglishRuleMaster = {
    state: { container: null, data: null, step: 0, demo: 'A' },

    renderLabeling: (container, data) => {
        EnglishRuleMaster.state = { container, data, step: 0, demo: 'A' };
        EnglishRuleMaster.injectStyles();
        EnglishRuleMaster.load();
    },

    load: () => {
        const { data, step, demo, container } = EnglishRuleMaster.state;
        if (data.type === "VOCABULARY_LIST") {
            container.innerHTML = `
                <div class="bento-card card-pop" style="max-width:450px">
                    <span class="manya-badge">DICTIONARY</span>
                    <h2 class="manya-title">${data.topicTitle}</h2>
                    <div class="vocab-scroll">
                        ${data.rules.map(w => `<div class="v-row"><b>${w.word}</b><br><span>${w.meaning}</span></div>`).join('')}
                    </div>
                </div>`;
            window.ManyaQuestRunner.enableButton(true, null, "I'VE READ THEM ALL!");
        } else if (data.type === "RULE_SELECTION") { // NEW: Rule selection mode
            container.innerHTML = `
                <div class="bento-card rule-selection-card card-pop">
                    <h2 class="manya-title">Choose a Rule to Revise:</h2>
                    <div class="rule-list">
                        ${data.currentChapterRules.map(ruleStep => `
                            <button class="rule-list-item" onclick="window.ManyaQuestRunner.handleBranch('REVIEW_RULE', '', '${ruleStep.id}')">
                                Rule: ${ruleStep.topicTitle || ruleStep.title || ruleStep.id} <span>▶</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
            // The "Continue" button should return to where they came from (the chat before this rule selection)
            window.ManyaQuestRunner.enableButton(true, null, "BACK TO JOURNEY");

        } else { // Existing logic for single rule display
            const rule = data.rules[step];
            container.innerHTML = `
                <div class="bento-card rule-box card-pop" style="max-width:450px">
                    <span class="manya-badge">RULE ${step + 1} OF ${data.rules.length}</span>
                    <h2 class="manya-title">${rule.title}</h2>
                    <div class="chalk-board">${rule.formula}</div>
                    <div class="tgl-track">
                        <button class="tgl ${demo==='A'?'active':''}" onclick="MasterToggle('A')">${rule.toggleA}</button>
                        <button class="tgl ${demo==='B'?'active':''}" onclick="MasterToggle('B')">${rule.toggleB}</button>
                    </div>
                    <div class="example-area">
                        <div class="ex-txt">${demo==='A' ? rule.exampleA : rule.exampleB}</div>
                        <div class="ex-mean">${demo==='A' ? rule.explainA : rule.explainB}</div>
                    </div>
                    <div class="manya-tip">💡 <b>Pro-Tip:</b> ${rule.teacherNote}</div>
                </div>`;
            window.ManyaQuestRunner.enableButton(true, () => {
                if (step < data.rules.length - 1) { EnglishRuleMaster.state.step++; EnglishRuleMaster.load(); }
                else {
                    // If they finished a rule review, return to previous context
                    if (window.ManyaQuestRunner.state.returnIndex !== null) {
                        window.ManyaQuestRunner.next(); // This will trigger the return to task
                    } else {
                        window.ManyaQuestRunner.next(); // Go to next sequential step
                    }
                }
            }, step === data.rules.length - 1 ? "GOT IT!" : "NEXT RULE"); // Changed "START PRACTICE" to "GOT IT!" for final rule in review context
        }
    },

    injectStyles: () => {
        if (document.getElementById('rule-elite-v6-styles')) return;
        const style = document.createElement('style');
        style.id = 'rule-elite-v6-styles';
        style.innerHTML = `
            .manya-badge { font-size: 10px; font-weight: 900; color: #7e22ce; background: #f3e8ff; padding: 4px 12px; border-radius: 50px; }
            .manya-title { font-size: 1.5rem; font-weight: 800; color: #1e293b; margin: 12px 0; }
            .chalk-board { background: #1e293b; color: #fbbf24; padding: 20px; border-radius: 15px; font-family: monospace; border-left: 6px solid #fbbf24; margin-bottom: 20px; text-align:center; }
            .tgl-track { display: flex; background: #f1f5f9; padding: 5px; border-radius: 12px; margin-bottom: 20px; }
            .tgl { flex: 1; padding: 12px; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; background: transparent; color: #64748b; }
            .tgl.active { background: white; color: #7e22ce; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
            .ex-txt { font-size: 1.4rem; font-weight: 700; color: #1f2937; margin-bottom: 5px; text-align:center; }
            .ex-mean { font-size: 13px; color: #64748b; text-align:center; font-weight: 600; }
            .manya-tip { background: #fff7ed; padding: 15px; border-radius: 12px; font-size: 12px; color: #9a3412; margin-top: 20px; border: 1px solid #fef3c7; }
            .vocab-scroll { max-height: 45vh; overflow-y: auto; margin-top: 10px; text-align: left; }
            .v-row { padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
            .v-row b { color: #7e22ce; font-size: 1.1rem; }
            .card-pop { animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
            @keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }
};
window.MasterToggle = (s) => { EnglishRuleMaster.state.demo = s; EnglishRuleMaster.load(); };