/**
 * Deep Reader Engine (v1.0)
 * Designed for P.7 Comprehension (Passages, Poems, Graphs, Tables)
 * Entry point: renderLabeling(container, data)
 */

export const DeepReader = {
    state: {
        container: null,
        data: null,
        currentStep: 0,
        isResolved: false,
        scale: window.devicePixelRatio || 2
    },

    injectStyles: () => {
        if (document.getElementById('deep-reader-styles')) return;
        const style = document.createElement('style');
        style.id = 'deep-reader-styles';
        style.innerHTML = `
            .reader-root {
                position: absolute; inset: 0;
                display: flex; flex-direction: column;
                background: #f8fafc; font-family: 'Segoe UI', Tahoma, sans-serif;
                overflow: hidden;
            }

            /* TOP: THE CONTENT PANE (Persistent) */
            .content-pane {
                flex: 1 1 50%; /* Takes 50% of height */
                background: white; border-bottom: 2px solid #e2e8f0;
                overflow-y: auto; padding: 20px;
                position: relative;
            }

            .passage-text { font-size: 1.1rem; line-height: 1.6; color: #334155; }
            .poem-text { font-style: italic; text-align: center; line-height: 1.8; color: #1e293b; }
            
            /* TABLE STYLING */
            .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
            .data-table th { background: #f1f5f9; font-weight: 800; }

            /* GRAPH STYLING (Simple CSS Bar Chart) */
            .bar-chart {
                display: flex; align-items: flex-end; gap: 8px; 
                height: 150px; margin-top: 30px; border-bottom: 2px solid #64748b;
                padding: 0 10px;
            }
            .bar-container { flex: 1; display: flex; flex-direction: column; align-items: center; }
            .bar { width: 100%; background: #6366f1; border-radius: 4px 4px 0 0; transition: height 0.5s; position: relative; }
            .bar::after { content: attr(data-value); position: absolute; top: -20px; font-size: 10px; font-weight: 800; }
            .bar-label { font-size: 10px; margin-top: 5px; font-weight: 700; color: #64748b; }

            /* BOTTOM: THE QUESTION PANE */
            .question-pane {
                flex: 1 1 50%; padding: 16px;
                display: flex; flex-direction: column; gap: 12px;
                background: #fdfbf7; overflow-y: auto;
            }

            .option-btn {
                width: 100%; padding: 16px; background: white; 
                border: 2px solid #e2e8f0; border-radius: 12px;
                text-align: left; font-size: 15px; font-weight: 600;
                cursor: pointer; transition: 0.2s;
            }
            .option-btn:active { background: #f1f5f9; }
            .option-btn.correct { border-color: #22c55e; background: #f0fdf4; color: #15803d; }
            .option-btn.wrong { border-color: #ef4444; background: #fef2f2; color: #b91c1c; }

            .hud {
                flex: 0 0 auto; background: white; padding: 16px;
                padding-bottom: calc(16px + env(safe-area-inset-bottom));
                border-top: 1px solid #e2e8f0;
            }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        DeepReader.injectStyles();
        DeepReader.state.container = container;
        DeepReader.state.data = data;
        DeepReader.state.currentStep = 0;
        DeepReader.loadQuestion();
    },

    loadQuestion: () => {
        const d = DeepReader.state.data;
        const q = d.questions[DeepReader.state.currentStep];
        DeepReader.state.isResolved = false;

        DeepReader.state.container.innerHTML = `
            <div class="reader-root">
                <div class="content-pane">
                    <div class="instruction-badge" style="background:#f3e8ff; color:#7e22ce; padding:4px 10px; border-radius:50px; font-size:10px; font-weight:800; margin-bottom:10px; display:inline-block">
                        READ THE ${d.media.type}
                    </div>
                    <div id="media-mount"></div>
                </div>

                <div class="question-pane">
                    <div style="font-weight: 800; color: #1e293b; margin-bottom: 5px;">Question ${DeepReader.state.currentStep + 1}:</div>
                    <div style="font-size: 1.1rem; font-weight: 600; color: #334155; margin-bottom: 10px;">${q.text}</div>
                    <div id="options-mount" style="display:flex; flex-direction:column; gap:10px;"></div>
                </div>

                <div class="hud" id="reader-hud" style="display:none">
                    <button class="check-btn" style="width:100%; height:52px; background:#22c55e; color:white; border:none; border-radius:14px; font-weight:700" onclick="DeepReader.progress()">
                        NEXT QUESTION
                    </button>
                </div>
            </div>
        `;

        DeepReader.renderMedia();
        DeepReader.renderOptions();
    },

    renderMedia: () => {
        const media = DeepReader.state.data.media;
        const mount = document.getElementById('media-mount');

        if (media.type === "PASSAGE") {
            mount.innerHTML = `<div class="passage-text">${media.content}</div>`;
        } 
        else if (media.type === "POEM") {
            mount.innerHTML = `<div class="poem-text">${media.content.replace(/\n/g, '<br>')}</div>`;
        }
        else if (media.type === "TABLE") {
            mount.innerHTML = `
                <table class="data-table">
                    <thead><tr>${media.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody>${media.rows.map(r => `<tr>${r.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
                </table>
            `;
        }
        else if (media.type === "GRAPH") {
            mount.innerHTML = `
                <div style="text-align:center; font-weight:800; font-size:12px; margin-bottom:10px;">${media.title}</div>
                <div class="bar-chart">
                    ${media.data.map(d => `
                        <div class="bar-container">
                            <div class="bar" data-value="${d.value}" style="height: ${(d.value / media.max) * 100}%"></div>
                            <div class="bar-label">${d.label}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    },

    renderOptions: () => {
        const q = DeepReader.state.data.questions[DeepReader.state.currentStep];
        const mount = document.getElementById('options-mount');
        
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = opt;
            btn.onclick = () => DeepReader.handleSelect(btn, opt);
            mount.appendChild(btn);
        });
    },

    handleSelect: (btn, choice) => {
        if (DeepReader.state.isResolved) return;
        
        const q = DeepReader.state.data.questions[DeepReader.state.currentStep];
        const isCorrect = choice === q.answer;

        if (isCorrect) {
            btn.classList.add('correct');
            DeepReader.state.isResolved = true;
            document.getElementById('reader-hud').style.display = 'block';
        } else {
            btn.classList.add('wrong');
            btn.style.pointerEvents = 'none'; // Prevent re-clicking the wrong one
        }
    },

    progress: () => {
        if (DeepReader.state.currentStep < DeepReader.state.data.questions.length - 1) {
            DeepReader.state.currentStep++;
            DeepReader.loadQuestion();
        } else {
            // DB Bridge
            const result = {
                isCorrect: true,
                score: DeepReader.state.data.questions.length,
                total: DeepReader.state.data.questions.length,
                type: 'reading'
            };
            if (window.onSimulationSubmit) window.onSimulationSubmit(result);
            if (window.captureSimulationResult) window.captureSimulationResult(true, result.score, result.total);

            DeepReader.state.container.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;"><h1 style="color:#22c55e">Reading Master! 📖</h1><p>You completed the comprehension quest.</p></div>`;
        }
    }
};

window.DeepReader = DeepReader;