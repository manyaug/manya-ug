export const SyntaxArchitect = {
    state: { container: null, data: null, pool: [], index: 0, wrongQueue: [] },

    renderLabeling: async (container, data) => {
        SyntaxArchitect.state = { container, data, pool: [...data.questions], index: 0, wrongQueue: [] };
        SyntaxArchitect.injectStyles();
        
        // Ensure Global helper
        window.StxSelect = (val, btn) => {
            const s = SyntaxArchitect.state;
            s.pool[s.index].userAns = val;
            btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            // Safely call the runner
            if(window.ManyaQuestRunner) window.ManyaQuestRunner.enableButton(true, () => SyntaxArchitect.check());
        };

        SyntaxArchitect.show();
    },

    show: () => {
        const s = SyntaxArchitect.state;
        if (s.index >= s.pool.length) {
            if (s.wrongQueue.length > 0) {
                s.pool = [...s.wrongQueue]; s.wrongQueue = []; s.index = 0;
                SyntaxArchitect.show();
            } else { 
                window.ManyaQuestRunner.next(); 
            }
            return;
        }

        const q = s.pool[s.index];
        s.container.innerHTML = `
            <div class="bento-practice-card">
                <div class="q-badge">QUESTION ${s.index + 1}</div>
                <div class="q-text-main">${q.prompt}</div>
                <div class="input-zone">
                    ${q.mode === 'REFLECT' ? `
                        <div class="mcq-grid">
                            ${q.options.map(opt => `<button class="stx-btn" onclick="window.StxSelect('${opt.replace(/'/g, "\\'")}', this)">${opt}</button>`).join('')}
                        </div>
                    ` : `
                        <input type="text" id="stx-input" class="purple-field" placeholder="Answer here..." autocomplete="off">
                    `}
                </div>
            </div>`;

        if(window.ManyaQuestRunner) {
            window.ManyaQuestRunner.enableButton(q.mode !== 'REFLECT', () => SyntaxArchitect.check(), "CHECK");
        }
    },

    check: () => {
        const s = SyntaxArchitect.state;
        const q = s.pool[s.index];
        const val = q.mode === 'REFLECT' ? q.userAns : document.getElementById('stx-input').value.trim();
        const correct = val && (q.mode === 'REFLECT' ? (val === q.answer) : (val.toLowerCase() === q.expected.toLowerCase()));

        if (correct) {
            document.getElementById('card')?.classList.add('correct');
            window.ManyaQuestRunner.enableButton(true, () => { s.index++; SyntaxArchitect.show(); }, "CONTINUE");
        } else {
            if(!s.wrongQueue.includes(q)) s.wrongQueue.push(q);
            alert("Almost! Manya says try again.");
        }
    },

    injectStyles: () => {
        if (document.getElementById('stx-fix-styles')) return;
        const s = document.createElement('style');
        s.id = 'stx-fix-styles';
        s.innerHTML = `
            .bento-practice-card { background: white; border: 2px solid #e5e7eb; border-radius: 25px; padding: 25px; width: 100%; max-width: 450px; box-shadow: 0 8px 0 #f1f5f9; }
            .q-badge { font-weight: 900; font-size: 10px; color: #94a3b8; margin-bottom: 10px; }
            .q-text-main { font-size: 1.3rem; font-weight: 700; color: #1e293b; }
            .mcq-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
            .stx-btn { padding: 16px; background: white; border: 2px solid #e5e7eb; border-radius: 15px; font-weight: 800; cursor: pointer; text-align: left; }
            .stx-btn.selected { background: #f3e8ff; border-color: #7e22ce; color: #7e22ce; }
            .purple-field { width: 100%; padding: 15px; border: 2px solid #e5e7eb; border-radius: 15px; margin-top: 20px; font-size: 1.1rem; outline: none; box-sizing: border-box; }
        `;
        document.head.appendChild(s);
    }
};