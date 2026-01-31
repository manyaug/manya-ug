/**
 * Manya Universal Science Study Engine (v3.0 - Optimized)
 * 
 * FIXES:
 * 1. Removed unnecessary navigation buttons for Reader (Scroll) mode.
 * 2. "Next" button strictly hidden at the end of content.
 * 3. Integrated "Start Quiz" transition.
 */
export const ScienceStudyEngine = {
    state: {
        data: null,
        currentCard: 0,
        theme: '#9333ea'
    },

    injectStyles: () => {
        if (document.getElementById('sci-study-styles')) return;
        const style = document.createElement('style');
        style.id = 'sci-study-styles';
        style.innerHTML = `
            .sci-study-root { position: absolute; inset: 0; background: #f8fafc; display: flex; flex-direction: column; font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
            .sci-header { padding: 15px 20px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; z-index: 20; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
            .sci-title-box h1 { margin: 0; font-size: 1rem; color: #1e293b; font-weight: 800; }
            .sci-title-box p { margin: 0; font-size: 0.7rem; color: var(--t-color); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            
            .sci-content { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; -webkit-overflow-scrolling: touch; }
            
            /* READER MODE STYLES */
            .sci-section-title { font-size: 0.95rem; font-weight: 800; color: var(--t-color); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; border-left: 3px solid var(--t-color); padding-left: 10px; }
            .sci-bullet-list { padding-left: 20px; margin: 0; color: #334155; }
            .sci-bullet-list li { margin-bottom: 10px; line-height: 1.5; font-size: 0.95rem; }
            .sci-table-wrapper { overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; }
            .sci-table { width: 100%; border-collapse: collapse; background: white; font-size: 0.85rem; }
            .sci-table th { background: #1e293b; color: white; padding: 10px; text-align: left; }
            .sci-table td { padding: 10px; border-top: 1px solid #e2e8f0; }
            .sci-warning { background: #fff7ed; border: 1px dashed #f97316; padding: 12px; border-radius: 12px; display: flex; gap: 10px; font-size: 0.85rem; color: #9a3412; }

            /* CARD MODE STYLES */
            .sci-card { background: white; border-radius: 20px; padding: 25px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; width: 100%; box-sizing: border-box; }
            .sci-card-term { font-size: 1.5rem; font-weight: 900; color: #0f172a; margin-bottom: 10px; }
            .sci-hook { margin-top: 20px; padding: 12px; background: #f8fafc; border-left: 4px solid var(--t-color); border-radius: 0 8px 8px 0; }
            .sci-hook-text { font-size: 0.9rem; font-weight: 700; color: #1e293b; font-style: italic; }

            /* NAVIGATION (Only for Cards) */
            .sci-nav { padding: 15px 20px; background: white; border-top: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr 2fr; gap: 10px; padding-bottom: calc(15px + env(safe-area-inset-bottom)); }
            .btn-sci { border: none; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: 0.2s; height: 50px; }
            .btn-sci-prev { background: #f1f5f9; color: #475569; }
            .btn-sci-next { background: var(--t-color); color: white; box-shadow: 0 4px 0 rgba(0,0,0,0.1); }
            .btn-sci-finish { background: #22c55e; color: white; grid-column: span 2; }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        if (!data) return;
        ScienceStudyEngine.state.data = data;
        ScienceStudyEngine.state.currentCard = 0;
        ScienceStudyEngine.state.theme = data.themeColor || '#9333ea';
        
        ScienceStudyEngine.injectStyles();
        document.documentElement.style.setProperty('--t-color', ScienceStudyEngine.state.theme);
        ScienceStudyEngine.updateUI(container);
    },

    updateUI: (container) => {
        const { data, currentCard } = ScienceStudyEngine.state;
        let contentHtml = '';
        let navHtml = '';

        // --- MODE DETECTION ---
        const isCardMode = data.cards && data.cards.length > 0;
        const isReaderMode = data.sections && data.sections.length > 0;

        if (isReaderMode) {
            contentHtml = data.sections.map(sec => {
                if (sec.type === 'bullets') {
                    return `<div><div class="sci-section-title">${sec.title}</div><ul class="sci-bullet-list">${sec.points.map(p => `<li>${p}</li>`).join('')}</ul></div>`;
                }
                if (sec.type === 'comparison') {
                    return `<div><div class="sci-section-title">Comparison Table</div><div class="sci-table-wrapper"><table class="sci-table"><thead><tr><th>Feature</th><th>${sec.itemA}</th><th>${sec.itemB}</th></tr></thead><tbody>${sec.rows.map(r => `<tr><td style="background:#f8fafc; font-weight:700;">${r.feature}</td><td>${r.valA}</td><td>${r.valB}</td></tr>`).join('')}</tbody></table></div></div>`;
                }
                if (sec.type === 'warning') {
                    return `<div class="sci-warning"><span>⚠️</span><div><b>EXAM TIP:</b> ${sec.text}</div></div>`;
                }
                return '';
            }).join('') + `<div style="text-align:center; padding:30px; color:#94a3b8; font-weight:700; font-size:0.8rem;">--- END OF NOTES ---</div>`;
            
            // In Reader mode, we show a single "START QUIZ" button at the bottom of the scroll
            navHtml = `<div class="sci-nav" style="grid-template-columns: 1fr;"><button class="btn-sci btn-sci-next" onclick="ManyaApp.startQuiz()">START QUEST QUIZ</button></div>`;
        } 
        else if (isCardMode) {
            const card = data.cards[currentCard];
            contentHtml = `
                <div style="flex:1; display:flex; align-items:center;">
                    <div class="sci-card">
                        <div class="sci-card-term">${card.term}</div>
                        <div style="font-size:1rem; color:#475569; line-height:1.5;">${card.fact}</div>
                        <div class="sci-hook">
                            <div style="font-size:0.65rem; font-weight:800; color:var(--t-color); text-transform:uppercase;">💡 Mnemonic Hook</div>
                            <div class="sci-hook-text">${card.mnemonic}</div>
                        </div>
                    </div>
                </div>
            `;

            const isLast = currentCard === data.cards.length - 1;
            navHtml = `
                <div class="sci-nav">
                    ${isLast ? 
                        `<button class="btn-sci btn-sci-finish" onclick="ManyaApp.startQuiz()">START QUEST QUIZ</button>` : 
                        `<button class="btn-sci btn-sci-prev" onclick="window.ManyaStudyNav('PREV')">BACK</button>
                         <button class="btn-sci btn-sci-next" onclick="window.ManyaStudyNav('NEXT')">GOT IT, NEXT</button>`
                    }
                </div>
            `;
        }

        container.innerHTML = `
            <div class="sci-study-root">
                <div class="sci-header">
                    <div class="sci-title-box">
                        <p>${data.topic || 'Revision'}</p>
                        <h1>${data.variantTitle}</h1>
                    </div>
                    ${isCardMode ? `<div style="font-weight:800; color:#94a3b8; font-size:0.8rem;">${currentCard + 1}/${data.cards.length}</div>` : ''}
                </div>
                <div class="sci-content">${contentHtml}</div>
                ${navHtml}
            </div>
        `;
    },

    navigate: (dir) => {
        const s = ScienceStudyEngine.state;
        if (dir === 'NEXT' && s.currentCard < s.data.cards.length - 1) {
            s.currentCard++;
            ScienceStudyEngine.updateUI(document.querySelector('.sci-study-root').parentElement);
        } else if (dir === 'PREV' && s.currentCard > 0) {
            s.currentCard--;
            ScienceStudyEngine.updateUI(document.querySelector('.sci-study-root').parentElement);
        }
    }
};

window.ManyaStudyNav = (dir) => ScienceStudyEngine.navigate(dir);

// Mock fallback if ManyaApp isn't defined in your PWA yet
if (!window.ManyaApp) {
    window.ManyaApp = { startQuiz: () => alert("Switching to Quiz Mode...") };
}