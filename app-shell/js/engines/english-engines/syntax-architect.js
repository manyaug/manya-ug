/**
 * SyntaxArchitect v3.5
 * Intelligent Hinting + Batch Retries
 */
export const SyntaxArchitect = {
    state: { container: null, data: null, pool: [], index: 0, wrongQueue: [], nlp: null },

    renderLabeling: async (container, data) => {
        SyntaxArchitect.injectStyles();
        SyntaxArchitect.state = { container, data, pool: [...data.questions], index: 0, wrongQueue: [] };
        
        if (!window.nlp) {
            await new Promise(r => {
                const s = document.createElement('script');
                s.src = "/app-shell/js/lib/compromise.min.js";
                s.onload = r;
                document.head.appendChild(s);
            });
        }
        SyntaxArchitect.state.nlp = window.nlp;
        SyntaxArchitect.showNext();
    },

    showNext: () => {
        const s = SyntaxArchitect.state;
        if (s.index >= s.pool.length) {
            if (s.wrongQueue.length > 0) {
                s.pool = [...s.wrongQueue]; s.wrongQueue = []; s.index = 0;
                SyntaxArchitect.showNext();
            } else {
                window.ManyaQuestRunner.next();
            }
            return;
        }

        const q = s.pool[s.index];
        s.container.innerHTML = `
            <div class="practice-stage card-pop">
                <div class="manya-hint-bubble" id="manya-hint"></div>
                <div class="practice-card bento-card" id="q-card">
                    <div class="q-badge">EXERCISE ${s.index + 1}</div>
                    <div class="q-prompt-text">${q.prompt}</div>
                    
                    <div class="input-area">
                        ${q.mode === 'MCQ' ? `
                            <div class="choice-stack">
                                ${q.options.map(opt => `<button class="slick-choice" onclick="StxSelect('${opt.replace(/'/g, "\\'")}', this)">${opt}</button>`).join('')}
                            </div>
                        ` : `
                            <input type="text" id="user-input" class="slick-input" placeholder="Type your answer..." autocomplete="off">
                            <div class="word-bank">
                                ${q.options ? q.options.map(opt => `<button class="bank-chip" onclick="document.getElementById('user-input').value='${opt}'">${opt}</button>`).join('') : ''}
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
        window.ManyaQuestRunner.enableButton(q.mode === 'MCQ' ? false : true, () => SyntaxArchitect.check(), "CHECK");
    },

    check: () => {
        const s = SyntaxArchitect.state;
        const q = s.pool[s.index];
        const val = q.mode === 'MCQ' ? q.userAns : document.getElementById('user-input').value.trim();
        const card = document.getElementById('q-card');
        const hint = document.getElementById('manya-hint');

        if(!val) return;

        let isCorrect = q.mode === 'MCQ' ? (val === q.answer) : (val.toLowerCase().replace(/[.,!?]$/, "") === q.expected.toLowerCase());

        if (isCorrect) {
            card.classList.add('correct');
            window.ManyaQuestRunner.enableButton(true, () => { s.index++; SyntaxArchitect.showNext(); }, "CONTINUE");
        } else {
            card.classList.add('wrong');
            hint.innerHTML = `🦆 <b>Manya says:</b> ${q.hint || 'Check your spelling and try again!'}`;
            hint.style.display = 'block';
            if(!s.wrongQueue.includes(q)) s.wrongQueue.push(q);
            setTimeout(() => { card.classList.remove('wrong'); }, 1500);
        }
    },

    injectStyles: () => {
        if (document.getElementById('stx-v4-styles')) return;
        const style = document.createElement('style');
        style.id = 'stx-v4-styles';
        style.innerHTML = `
            .practice-stage { width: 100%; max-width: 450px; position: relative; }
            .q-badge { font-weight: 900; font-size: 10px; color: #94a3b8; letter-spacing: 1px; margin-bottom: 10px; }
            .q-prompt-text { font-size: 1.3rem; font-weight: 700; color: #1e293b; line-height: 1.4; }
            
            .slick-input { width: 100%; padding: 18px; border: 3px solid #e5e7eb; border-radius: 20px; font-size: 1.2rem; font-weight: 700; outline: none; margin-top: 20px; }
            .slick-input:focus { border-color: #7e22ce; }
            
            .choice-stack { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
            .slick-choice { padding: 18px; background: white; border: 2px solid #e5e7eb; border-radius: 18px; font-weight: 800; font-size: 16px; text-align: left; cursor: pointer; transition: 0.2s; color: #4b5563; }
            .slick-choice.selected { background: #f3e8ff; border-color: #7e22ce; color: #7e22ce; box-shadow: 0 4px 0 #7e22ce; }
            
            .word-bank { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
            .bank-chip { padding: 8px 14px; background: #f1f5f9; border: 2px solid #e5e7eb; border-radius: 12px; font-weight: 700; font-size: 12px; cursor: pointer; color: #475569; }
            
            .manya-hint-bubble { position: absolute; top: -80px; left: 0; right: 0; background: #7e22ce; color: white; padding: 15px; border-radius: 20px; font-size: 13px; display: none; box-shadow: 0 10px 20px rgba(126, 34, 206, 0.2); z-index: 10; }
            .manya-hint-bubble::after { content: ''; position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid #7e22ce; }
            
            .practice-card.correct { border-color: #58cc02; box-shadow: 0 8px 0 #46a302; }
            .practice-card.wrong { border-color: #ff4b4b; box-shadow: 0 8px 0 #d33131; }
        `;
        document.head.appendChild(style);
    }
};
window.StxSelect = (val, btn) => {
    SyntaxArchitect.state.pool[SyntaxArchitect.state.index].userAns = val;
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    window.ManyaQuestRunner.enableButton(true, () => SyntaxArchitect.check());
};