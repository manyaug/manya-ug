export const SyntaxArchitect = {
    state: { container: null, data: null, pool: [], index: 0, wrongQueue: [] },

    renderLabeling: async (container, data, resumeIndex = 0) => {
        SyntaxArchitect.state = { container, data, pool: [...data.questions], index: resumeIndex, wrongQueue: [] };
        SyntaxArchitect.injectStyles();
        SyntaxArchitect.show();
    },

    show: () => {
        const s = SyntaxArchitect.state;
        if (s.index >= s.pool.length) {
            if (s.wrongQueue.length > 0) {
                console.log("Retrying wrong questions:", s.wrongQueue.length);
                s.pool = [...s.wrongQueue];
                s.wrongQueue = [];
                s.index = 0;
                SyntaxArchitect.show();
            } else {
                console.log("SyntaxArchitect complete, moving to next step.");
                window.ManyaQuestRunner.next();
            }
            return;
        }

        window.ManyaQuestRunner.saveStepProgress(s.index);
        const q = s.pool[s.index];
        s.container.innerHTML = `
            <div class="practice-box card-pop">
                <button class="rule-jump-btn" onclick="window.ManyaQuestRunner.jumpToRule()">💡 View Rule</button>
                <div class="bento-card q-card">
                    <div class="q-label">EXERCISE ${s.index + 1} OF ${s.pool.length}</div>
                    <div class="q-prompt">${q.prompt}</div>
                    <div class="stx-input-zone">
                        <input type="text" id="stx-input" class="stx-field" placeholder="Answer here..." autocomplete="off">
                        <div class="stx-word-bank">
                            ${(q.options || []).map(o => `<button class="stx-pill" onclick="window.ManyaQuestRunner.SyntaxArchitect_fillInput('${o}')">${o}</button>`).join('')}
                        </div>
                    </div>
                </div>
            </div>`;

        const inputEl = document.getElementById('stx-input');
        if (inputEl) {
            inputEl.oninput = () => {
                window.ManyaQuestRunner.enableButton(inputEl.value.trim().length > 0, window.ManyaQuestRunner.SyntaxArchitect_check, "CHECK");
            };
            inputEl.onkeydown = (event) => {
                if (event.key === 'Enter' && !document.getElementById('main-action-btn').disabled) {
                    window.ManyaQuestRunner.SyntaxArchitect_check(); // Use the globally exposed function
                }
            };
        }

        // Expose fillInput and check to ManyaQuestRunner for global access from HTML
        window.ManyaQuestRunner.SyntaxArchitect_fillInput = SyntaxArchitect.fillInput;
        window.ManyaQuestRunner.SyntaxArchitect_check = SyntaxArchitect.check;


        window.ManyaQuestRunner.enableButton(false, window.ManyaQuestRunner.SyntaxArchitect_check, "CHECK"); // Initially disabled
    },

    fillInput: (option) => {
        const input = document.getElementById('stx-input');
        if (input) {
            input.value = option;
            window.ManyaQuestRunner.enableButton(true, window.ManyaQuestRunner.SyntaxArchitect_check, "CHECK");
        }
    },

    check: () => {
        const s = SyntaxArchitect.state;
        const q = s.pool[s.index];
        const input = document.getElementById('stx-input');
        if (!input) return;
        const val = input.value.trim();

        // FIX: Make normalize robust to handle undefined/null input
        const normalize = (text) => {
            if (text === null || text === undefined) {
                return ""; // Treat null/undefined as an empty string for comparison
            }
            return String(text).toLowerCase().replace(/[.,!?]$/, "").trim();
        };

        const correct = normalize(val) === normalize(q.expected);

        if (correct) {
            input.style.borderColor = "#22c55e"; // Green border for correct
            input.style.color = "#22c55e";
            window.ManyaQuestRunner.enableButton(true, () => {
                s.index++;
                SyntaxArchitect.show();
            }, "CONTINUE");
        } else {
            input.style.borderColor = "#ef4444"; // Red border for incorrect
            input.style.color = "#ef4444";
            if (!s.wrongQueue.includes(q)) s.wrongQueue.push(q);
            alert(q.hint || "Manya says: Check your spelling or grammar!");
            window.ManyaQuestRunner.enableButton(true, () => {
                input.value = ''; // Clear input after incorrect attempt
                input.style.borderColor = "#e5e7eb"; // Reset border
                input.style.color = "#7e22ce";
                window.ManyaQuestRunner.enableButton(false, window.ManyaQuestRunner.SyntaxArchitect_check, "CHECK"); // Re-disable until new input
            }, "TRY AGAIN"); // Change button label for wrong answer
        }
    },

    injectStyles: () => {
        if (document.getElementById('stx-elite-v7-styles')) return;
        const style = document.createElement('style');
        style.id = 'stx-elite-v7-styles';
        style.innerHTML = `
            .practice-box { width: 100%; max-width: 450px; position: relative; }
            .rule-jump-btn { position: absolute; top: -10px; right: 0; background: #7e22ce; color: white; border: none; padding: 6px 14px; border-radius: 50px; font-size: 10px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 10px rgba(126, 34, 206, 0.3); z-index: 5; }
            .q-card { background: white; border: 2px solid #e5e7eb; border-radius: 25px; padding: 25px; box-shadow: 0 8px 0 #f1f5f9; }
            .q-label { font-size: 10px; font-weight: 900; color: #94a3b8; margin-bottom: 10px; }
            .q-prompt { font-size: 1.3rem; font-weight: 700; color: #1e293b; line-height: 1.4; margin-bottom: 20px; }
            .stx-input-zone { margin-top: 10px; }
            .stx-field { width: 100%; padding: 18px; border: 3px solid #e5e7eb; border-radius: 20px; font-size: 1.1rem; font-weight: 700; outline: none; margin-top: 20px; color:#7e22ce; box-sizing: border-box; transition: border-color 0.3s, color 0.3s; }
            .stx-field:focus { border-color: #7e22ce; }
            .stx-word-bank { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
            .stx-pill { padding: 10px 16px; background: #f3e8ff; border: 2px solid #d8b4fe; border-radius: 14px; font-weight: 800; font-size: 12px; color: #7e22ce; cursor: pointer; transition: background 0.2s, transform 0.1s; }
            .stx-pill:hover { background: #ede9fe; transform: translateY(-1px); }
            .card-pop { animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
            @keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }
};