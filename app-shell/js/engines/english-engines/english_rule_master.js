/**
 * MANYA ENGLISH RULE MASTER (v9.0 - Elite Master Edition)
 */
export const EnglishRuleMaster = {
    state: { container: null, data: null, step: 0, demo: 'A' },

    renderStudy: (container, data) => EnglishRuleMaster.renderLabeling(container, data),

    renderLabeling: (container, data) => {
        // Unwrap nested data if necessary
        const actualData = data.data ? data.data : data;
        EnglishRuleMaster.state = { container, data: actualData, step: 0, demo: 'A' };
        EnglishRuleMaster.load();
    },

    load: () => {
        const { data, step, demo, container } = EnglishRuleMaster.state;

        // 1. DICTIONARY MODE
        if (data.type === "VOCABULARY_LIST") {
            container.innerHTML = `
                <div class="rule-master-root animate-in">
                    <div class="rule-card-premium">
                        <span class="rule-badge">Dictionary</span>
                        <h2 class="manya-title" style="margin:15px 0">${data.topicTitle || 'Vocabulary'}</h2>
                        <div class="vocab-scroll" style="max-height: 55vh; overflow-y:auto; scrollbar-width:none;">
                            ${data.rules.map(w => `
                                <div class="v-row" style="padding:15px 0; border-bottom:1px solid #f1f5f9;">
                                    <b style="color:#7c3aed; font-size:1.1rem; display:block;">${w.word}</b>
                                    <span style="color:#64748b; font-size:14px; font-weight:600;">${w.meaning}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>`;
            
            // Tell the Runner we are done reading
            window.QuestRunner.enableButton(true, null, "I'VE READ THEM ALL");
            return;
        }

        // 2. RULE MASTER MODE (The Grammar Card)
        const rule = data.rules[step];
        if (!rule) { window.QuestRunner.next(); return; }

        container.innerHTML = `
            <div class="rule-master-root animate-in">
                <div class="rule-card-premium">
                    <span class="rule-badge">Rule ${step + 1} of ${data.rules.length}</span>
                    <h2 class="manya-title" style="margin:15px 0; font-size:1.4rem;">${rule.title}</h2>
                    
                    <div class="formula-board">${rule.formula}</div>

                    <div class="rule-toggle-wrap">
                        <button class="rule-tab ${demo === 'A' ? 'active' : ''}" onclick="window.MasterToggle('A')">
                            ${rule.toggleA}
                        </button>
                        <button class="rule-tab ${demo === 'B' ? 'active' : ''}" onclick="window.MasterToggle('B')">
                            ${rule.toggleB}
                        </button>
                    </div>

                    <div class="example-focus">
                        <div class="ex-main">${demo === 'A' ? rule.exampleA : rule.exampleB}</div>
                        <div class="ex-sub">${demo === 'A' ? rule.explainA : rule.explainB}</div>
                    </div>

                    <div class="pro-tip-box">
                        <div class="tip-icon">💡</div>
                        <div class="tip-text"><b>Pro-Tip:</b> ${rule.teacherNote}</div>
                    </div>
                </div>
            </div>`;

        // 3. INTERNAL NAVIGATION (Handles multi-rule JSONs)
        const isLastRule = step === data.rules.length - 1;
        const buttonLabel = isLastRule ? "START PRACTICE" : "NEXT RULE";
        
        // Define the callback for the footer button
        const nextAction = () => {
            if (step < data.rules.length - 1) {
                EnglishRuleMaster.state.step++;
                EnglishRuleMaster.load();
            } else {
                // If it was the last rule, move the whole quest forward
                window.QuestRunner.next();
            }
        };

        // Update the footer button
        window.QuestRunner.enableButton(true, nextAction, buttonLabel);
    }
};

window.MasterToggle = (state) => {
    EnglishRuleMaster.state.demo = state;
    EnglishRuleMaster.load();
};