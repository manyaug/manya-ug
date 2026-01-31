/**
 * Manya Universal Science Study Engine (v2.0)
 * 
 * CAPABILITIES:
 * 1. Supports "Reader" mode (Bullets, Tables, Warnings).
 * 2. Supports "Teller" mode (Flashcards with Mnemonics).
 * 3. Auto-detects content type from JSON.
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
            .sci-header { padding: 20px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 15px; z-index: 10; }
            .sci-title-box { flex: 1; }
            .sci-title-box h1 { margin: 0; font-size: 1.1rem; color: #1e293b; font-weight: 800; }
            .sci-title-box p { margin: 2px 0 0; font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
            
            .sci-content { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; padding-bottom: 100px; }
            
            /* TYPE: BULLETS */
            .sci-section-title { font-size: 1rem; font-weight: 800; color: var(--t-color); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
            .sci-bullet-list { padding-left: 20px; margin: 0; color: #334155; }
            .sci-bullet-list li { margin-bottom: 12px; line-height: 1.5; font-size: 0.95rem; }
            .sci-bullet-list b { color: #0f172a; }

            /* TYPE: COMPARISON */
            .sci-table-wrapper { overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .sci-table { width: 100%; border-collapse: collapse; background: white; font-size: 0.85rem; }
            .sci-table th { background: #1e293b; color: white; padding: 12px; text-align: left; }
            .sci-table td { padding: 12px; border-top: 1px solid #e2e8f0; line-height: 1.4; }
            .sci-table tr td:first-child { font-weight: 800; background: #f1f5f9; color: #475569; width: 30%; }

            /* TYPE: WARNING */
            .sci-warning { background: #fff7ed; border: 2px dashed #f97316; padding: 15px; border-radius: 12px; display: flex; gap: 12px; }
            .sci-warning-text { font-size: 0.85rem; font-weight: 600; color: #9a3412; }

            /* TYPE: FLASHCARD (TELLER) */
            .sci-card { background: white; border-radius: 20px; padding: 25px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; animation: cardIn 0.3s ease-out; }
            .sci-card-term { font-size: 1.6rem; font-weight: 900; color: #0f172a; margin-bottom: 10px; }
            .sci-card-fact { font-size: 1rem; color: #475569; line-height: 1.5; }
            .sci-hook { margin-top: 20px; padding: 12px; background: #f8fafc; border-left: 4px solid var(--t-color); border-radius: 0 8px 8px 0; }
            .sci-hook-label { font-size: 0.65rem; font-weight: 800; color: var(--t-color); text-transform: uppercase; }
            .sci-hook-text { font-size: 0.9rem; font-weight: 700; color: #1e293b; font-style: italic; }

            .sci-nav { position: absolute; bottom: 0; left: 0; right: 0; padding: 20px; background: white; border-top: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr 2fr; gap: 10px; }
            .sci-btn-prev { background: #f1f5f9; color: #475569; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; }
            .sci-btn-next { background: var(--t-color); color: white; border: none; border-radius: 12px; font-weight: 700; padding: 15px; cursor: pointer; }

            @keyframes cardIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
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
        if (!data) return;

        let contentHtml = '';

        // MODE 1: READER (Scrollable Sections)
        if (data.sections && data.sections.length > 0) {
            contentHtml = data.sections.map(sec => {
                if (sec.type === 'bullets') {
                    return `<div><div class="sci-section-title"><span>•</span> ${sec.title}</div><ul class="sci-bullet-list">${sec.points.map(p => `<li>${p}</li>`).join('')}</ul></div>`;
                }
                if (sec.type === 'comparison') {
                    return `<div><div class="sci-section-title"><span>📊</span> ${sec.title}</div><div class="sci-table-wrapper"><table class="sci-table"><thead><tr><th>Feature</th><th>${sec.itemA}</th><th>${sec.itemB}</th></tr></thead><tbody>${sec.rows.map(r => `<tr><td>${r.feature}</td><td>${r.valA}</td><td>${r.valB}</td></tr>`).join('')}</tbody></table></div></div>`;
                }
                if (sec.type === 'warning') {
                    return `<div class="sci-warning"><span>⚠️</span><div class="sci-warning-text"><b>PLE WATCH OUT:</b> ${sec.text}</div></div>`;
                }
                return '';
            }).join('');
        } 
        // MODE 2: TELLER (Step-by-Step Flashcards)
        else if (data.cards && data.cards.length > 0) {
            const card = data.cards[currentCard];
            contentHtml = `
                <div class="sci-card">
                    <div class="sci-card-term">${card.term}</div>
                    <div class="sci-card-fact">${card.fact}</div>
                    <div class="sci-hook">
                        <div class="sci-hook-label">💡 PLE Secret Hook</div>
                        <div class="sci-hook-text">${card.mnemonic}</div>
                    </div>
                </div>
            `;
        } else {
            contentHtml = '<div style="text-align:center; padding:20px;">No content found in JSON. Check keys: "sections" or "cards".</div>';
        }

        container.innerHTML = `
            <div class="sci-study-root">
                <div class="sci-header">
                    <div class="sci-title-box">
                        <p>${data.topic || 'Science Study'}</p>
                        <h1>${data.variantTitle || 'Summary'}</h1>
                    </div>
                    ${data.cards ? `<div style="font-weight:800; color:#64748b; font-size:0.8rem;">${currentCard + 1}/${data.cards.length}</div>` : ''}
                </div>
                <div class="sci-content">${contentHtml}</div>
                ${data.cards ? `
                    <div class="sci-nav">
                        <button class="sci-btn-prev" onclick="window.ManyaStudyNav('PREV')">BACK</button>
                        <button class="sci-btn-next" onclick="window.ManyaStudyNav('NEXT')">${currentCard === data.cards.length - 1 ? 'FINISH' : 'GOT IT, NEXT!'}</button>
                    </div>
                ` : ''}
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
        } else if (dir === 'NEXT' && s.currentCard === s.data.cards.length - 1) {
            alert("Recap Finished! Ready for the quiz?");
        }
    }
};

window.ManyaStudyNav = (dir) => ScienceStudyEngine.navigate(dir);