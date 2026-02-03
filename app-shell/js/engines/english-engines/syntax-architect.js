/**
 * SyntaxArchitect v4.0 (Smart Batch Edition)
 * Professional Practice with Adaptive Retry
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
            <div class="practice-stage">
                <div class="manya-hint-popup" id="stx-hint">Manya is thinking...</div>
                <div class="bento-card practice-card" id="q-card">
                    <div class="q-badge">EXERCISE ${s.index + 1} OF ${s.pool.length}</div>
                    <div class="q-prompt-main">${q.prompt}</div>
                    
                    ${q.mode === 'REFLECT' ? `
                        <div class="choice-stack">
                            ${q.options.map(opt => `<button class="slick-option" onclick="StxSelect('${opt.replace(/'/g, "\\'")}', this)">${opt}</button>`).join('')}
                        </div>
                    ` : `
                        <input type="text" id="stx-input" class="purple-input-field" placeholder="Answer here..." autocomplete="off">
                        <div class="word-bank">
                            ${(q.options || []).map(opt => `<button class="bank-pill" onclick="document.getElementById('stx-input').value='${opt}'">${opt}</button>`).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
        window.ManyaQuestRunner.enableButton(q.mode !== 'REFLECT', () => SyntaxArchitect.check(), "CHECK");
    },

    check: () => {
        const s = SyntaxArchitect.state;
        const q = s.pool[s.index];
        const input = document.getElementById('stx-input');
        const val = q.mode === 'REFLECT' ? q.userAns : input.value.trim();
        const card = document.getElementById('q-card');
        const hint = document.getElementById('stx-hint');

        if(!val) return;

        let isCorrect = q.mode === 'REFLECT' ? (val === q.answer) : (val.toLowerCase().replace(/[.,!?]$/, "") === q.expected.toLowerCase());

        if (isCorrect) {
            card.classList.add('correct');
            window.ManyaQuestRunner.enableButton(true, () => { s.index++; SyntaxArchitect.showNext(); }, "CONTINUE");
        } else {
            card.classList.add('wrong');
            hint.innerHTML = `🦆 <b>Manya:</b> ${q.hint || 'Almost! Try again.'}`;
            hint.style.display = 'block';
            if(!s.wrongQueue.includes(q)) s.wrongQueue.push(q);
            setTimeout(() => { card.classList.remove('wrong'); hint.style.display = 'none'; }, 2500);
        }
    },

    injectStyles: () => {
        if (document.getElementById('stx-elite-v4-styles')) return;
        const style = document.createElement('style');
        style.id = 'stx-elite-v4-styles';
        style.innerHTML = `
            .practice-stage { width: 100%; max-width: 460px; position: relative; }
            .q-badge { font-weight: 900; font-size: 10px; color: #94a3b8; letter-spacing: 2px; margin-bottom: 12px; }
            .q-prompt-main { font-size: 1.35rem; font-weight: 700; color: #1e293b; line-height: 1.4; }
            
            .purple-input-field { width: 100%; padding: 20px; border: 3px solid #e5e7eb; border-radius: 24px; font-size: 1.2rem; font-weight: 700; outline: none; margin-top: 25px; color:#7e22ce; box-sizing: border-box; }
            .purple-input-field:focus { border-color: #7e22ce; }
            
            .choice-stack { display: flex; flex-direction: column; gap: 12px; margin-top: 25px; }
            .slick-option { padding: 20px; background: white; border: 2px solid #e5e7eb; border-radius: 20px; font-weight: 800; font-size: 16px; text-align: left; cursor: pointer; transition: 0.2s; color: #4b5563; }
            .slick-option.selected { background: #f3e8ff; border-color: #7e22ce; color: #7e22ce; box-shadow: 0 5px 0 #7e22ce; transform: translateY(-2px); }
            
            .word-bank { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
            .bank-pill { padding: 10px 16px; background: #f5f3ff; border: 2px solid #ddd6fe; border-radius: 14px; font-weight: 800; font-size: 12px; color: #7e22ce; cursor: pointer; }
            
            .manya-hint-popup { position: absolute; top: -100px; left: 0; right: 0; background: #7e22ce; color: white; padding: 18px; border-radius: 24px; font-size: 14px; display: none; box-shadow: 0 10px 30px rgba(126, 34, 206, 0.3); z-index: 100; text-align: center; font-weight: 700; }
            .manya-hint-popup::after { content: ''; position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid #7e22ce; }
            
            .practice-card.correct { border-color: #58cc02; box-shadow: 0 10px 0 #46a302; }
            .practice-card.wrong { border-color: #ff4b4b; box-shadow: 0 10px 0 #d33131; }
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
window.SyntaxArchitect = SyntaxArchitect;