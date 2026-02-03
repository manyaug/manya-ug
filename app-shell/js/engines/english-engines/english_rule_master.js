/**
 * EnglishRuleMaster v2.1
 * Signature Manya Purple Branding - Deep Instruction
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
        const rule = data.rules[step];
        
        container.innerHTML = `
            <div class="rule-box-v2 card-pop">
                <div class="rule-category-badge">Manya's Masterclass</div>
                <h2 class="rule-title">${rule.title}</h2>
                
                <div class="manya-formula-card">
                    <div class="formula-label">GRAMMAR FORMULA</div>
                    <code>${rule.formula}</code>
                </div>

                <div class="demo-interactive bento-card">
                    <div class="toggle-track">
                        <button class="t-btn ${demo==='A'?'active':''}" onclick="StxRuleToggle('A')">${rule.toggleA}</button>
                        <button class="t-btn ${demo==='B'?'active':''}" onclick="StxRuleToggle('B')">${rule.toggleB}</button>
                    </div>
                    <div class="example-text">${demo==='A' ? rule.exampleA : rule.exampleB}</div>
                    <p class="explain-text">${demo==='A' ? rule.explainA : rule.explainB}</p>
                </div>

                <div class="teacher-box">
                    <b>💡 PRO-TIP:</b><br>${rule.teacherNote}
                </div>
            </div>
        `;
        
        window.ManyaQuestRunner.enableButton(true, () => {
            if (step < data.rules.length - 1) {
                EnglishRuleMaster.state.step++;
                EnglishRuleMaster.load();
            } else {
                window.ManyaQuestRunner.next();
            }
        }, step === data.rules.length - 1 ? "GOT IT!" : "NEXT RULE");
    },

    injectStyles: () => {
        if (document.getElementById('rule-master-slick-styles')) return;
        const style = document.createElement('style');
        style.id = 'rule-master-slick-styles';
        style.innerHTML = `
            .rule-box-v2 { width: 100%; max-width: 500px; display: flex; flex-direction: column; gap: 20px; }
            .rule-category-badge { display: inline-block; width: fit-content; padding: 4px 12px; background: #f3e8ff; color: #7e22ce; border-radius: 50px; font-size: 11px; font-weight: 900; }
            .rule-title { font-size: 1.5rem; font-weight: 800; color: #1e293b; margin: 0; }
            
            .manya-formula-card { background: #1e293b; color: #fbbf24; padding: 20px; border-radius: 20px; border-left: 6px solid #fbbf24; }
            .formula-label { font-size: 9px; font-weight: 900; opacity: 0.7; margin-bottom: 5px; }
            
            .toggle-track { display: flex; background: #f1f5f9; padding: 5px; border-radius: 15px; margin-bottom: 20px; }
            .t-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-weight: 800; cursor: pointer; background: transparent; color: #64748b; transition: 0.2s; }
            .t-btn.active { background: white; color: #7e22ce; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
            
            .example-text { font-size: 1.4rem; font-weight: 700; color: #1f2937; margin-bottom: 10px; }
            .explain-text { font-size: 14px; color: #64748b; font-weight: 500; }
            .teacher-box { background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; padding: 15px; border-radius: 18px; font-size: 13px; }
            .card-pop { animation: cardPop 0.4s ease-out; }
            @keyframes cardPop { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }
};
window.StxRuleToggle = (s) => { EnglishRuleMaster.state.demo = s; EnglishRuleMaster.load(); };