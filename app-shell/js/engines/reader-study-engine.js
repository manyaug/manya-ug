/**
 * Manya General Study Engine (v5.0)
 * 
 * USE: Works for all subjects (Science, SST, English, Math).
 * MODES: 
 *  1. Reader (Scrollable sections/tables)
 *  2. Teller (Interactive Flashcards)
 */
export const GeneralStudyEngine = {
    state: {
        data: null,
        currentCard: 0,
        theme: '#6366f1'
    },

    injectStyles: () => {
        if (document.getElementById('manya-study-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-study-styles';
        style.innerHTML = `
            :root { --t-color: #6366f1; --t-dark: #4338ca; --t-light: rgba(99, 102, 241, 0.1); --t-shadow: rgba(99, 102, 241, 0.3); }
            
            .study-root { 
                position: absolute; inset: 0; 
                background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); 
                display: flex; flex-direction: column; 
                font-family: 'Inter', -apple-system, sans-serif; 
                overflow: hidden; 
            }

            .study-header { 
                padding: 18px 20px; background: white; 
                border-bottom: 1px solid rgba(0,0,0,0.06); 
                display: flex; align-items: center; justify-content: space-between; 
                z-index: 50; box-shadow: 0 4px 12px rgba(0,0,0,0.02); 
            }
            .study-title-box h1 { margin: 0; font-size: 1.05rem; color: #1e293b; font-weight: 800; letter-spacing: -0.3px; }
            .study-title-box p { margin: 0; font-size: 0.65rem; color: var(--t-color); font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
            
            .study-content { 
                flex: 1; overflow-y: auto; padding: 20px; 
                display: flex; flex-direction: column; gap: 20px; 
                scroll-behavior: smooth; -webkit-overflow-scrolling: touch;
            }

            /* READER MODE BLOCKS */
            .study-section-card {
                background: white; border-radius: 20px; padding: 22px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04);
                border: 1px solid rgba(0,0,0,0.02);
            }
            .study-section-title { 
                font-size: 0.95rem; font-weight: 900; color: var(--t-color); 
                margin-bottom: 15px; display: flex; align-items: center; gap: 10px;
                text-transform: uppercase; border-left: 4px solid var(--t-color); padding-left: 12px;
            }
            .study-list { padding-left: 10px; margin: 0; list-style: none; }
            .study-list li { 
                margin-bottom: 12px; line-height: 1.6; font-size: 1rem; color: #475569;
                position: relative; padding-left: 20px;
            }
            .study-list li::before {
                content: "•"; position: absolute; left: 0; color: var(--t-color); font-weight: 900; font-size: 1.2rem;
            }
            .study-list b { color: #0f172a; font-weight: 700; background: var(--t-light); padding: 1px 4px; border-radius: 4px; }

            /* TABLES */
            .study-table-wrapper { border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; margin-top: 5px; }
            .study-table { width: 100%; border-collapse: collapse; background: white; font-size: 0.85rem; }
            .study-table th { background: #1e293b; color: white; padding: 12px; text-align: left; font-weight: 800; }
            .study-table td { padding: 12px; border-top: 1px solid #f1f5f9; color: #475569; line-height: 1.4; }
            .study-table tr td:first-child { font-weight: 800; background: #f8fafc; color: #64748b; border-right: 1px solid #f1f5f9; width: 35%; }

            /* WARNING/TIPS */
            .study-box-tip { 
                background: #fff7ed; border: 1px solid #fed7aa; 
                padding: 16px; border-radius: 16px; display: flex; gap: 12px;
            }
            .study-box-text { font-size: 0.85rem; font-weight: 600; color: #9a3412; line-height: 1.5; }

            /* TELLER MODE CARDS */
            .study-flash-wrapper { flex: 1; display: flex; align-items: center; justify-content: center; padding: 10px; }
            .study-flash-card { 
                background: white; border-radius: 32px; padding: 40px 30px; 
                box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.1); 
                border: 1px solid white; width: 100%; position: relative;
                animation: studyCardEnter 0.4s ease-out;
            }
            .study-card-term { font-size: 1.8rem; font-weight: 900; color: #0f172a; margin-bottom: 12px; letter-spacing: -0.5px; line-height: 1.1; }
            .study-card-fact { font-size: 1.1rem; color: #475569; line-height: 1.6; }
            
            .study-mnemonic-box { 
                margin-top: 30px; padding: 20px; 
                background: #f8fafc; border-radius: 20px; border: 1px solid #e2e8f0;
            }
            .study-mnemonic-badge {
                display: inline-block; padding: 4px 10px; background: var(--t-color);
                color: white; border-radius: 8px; font-size: 0.6rem; font-weight: 900;
                text-transform: uppercase; margin-bottom: 8px;
            }
            .study-mnemonic-text { font-size: 1rem; font-weight: 800; color: #1e293b; font-style: italic; }

            /* NAV BUTTONS */
            .study-nav { 
                padding: 18px 20px; background: white; border-top: 1px solid #e2e8f0; 
                display: grid; grid-template-columns: 1fr 2.5fr; gap: 12px;
                padding-bottom: calc(18px + env(safe-area-inset-bottom));
            }
            .btn-study { 
                border: none; border-radius: 16px; font-weight: 800; 
                font-size: 0.95rem; cursor: pointer; height: 54px;
                transition: all 0.2s; display: flex; align-items: center; justify-content: center;
            }
            .btn-study-prev { background: #f1f5f9; color: #64748b; }
            .btn-study-next { 
                background: linear-gradient(135deg, var(--t-color) 0%, var(--t-dark) 100%); 
                color: white; box-shadow: 0 8px 16px -4px var(--t-shadow);
            }
            .btn-study:active { transform: scale(0.96); opacity: 0.9; }

            @keyframes studyCardEnter { 
                from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } 
            }
        `;
        document.head.appendChild(style);
    },

    // Entry point for your App Loader
    renderLabeling: (container, data) => {
        if (!data) return;
        GeneralStudyEngine.state.data = data;
        GeneralStudyEngine.state.currentCard = 0;
        
        const baseColor = data.themeColor || '#6366f1';
        GeneralStudyEngine.state.theme = baseColor;
        
        GeneralStudyEngine.injectStyles();
        
        // Setup Theme Colors
        const root = document.documentElement;
        root.style.setProperty('--t-color', baseColor);
        root.style.setProperty('--t-dark', GeneralStudyEngine.adjustColor(baseColor, -30));
        root.style.setProperty('--t-light', baseColor + '15');
        root.style.setProperty('--t-shadow', baseColor + '40');
        
        GeneralStudyEngine.updateUI(container);
    },

    adjustColor: (col, amt) => {
        let usePound = false;
        if (col[0] == "#") { col = col.slice(1); usePound = true; }
        let num = parseInt(col, 16);
        let r = (num >> 16) + amt;
        let b = ((num >> 8) & 0x00FF) + amt;
        let g = (num & 0x0000FF) + amt;
        const limit = (v) => Math.min(255, Math.max(0, v));
        return (usePound ? "#" : "") + (limit(g) | (limit(b) << 8) | (limit(r) << 16)).toString(16).padStart(6, '0');
    },

    updateUI: (container) => {
        const { data, currentCard } = GeneralStudyEngine.state;
        let contentHtml = '';
        let navHtml = '';

        const isCardMode = data.cards && data.cards.length > 0;
        const isReaderMode = data.sections && data.sections.length > 0;

        if (isReaderMode) {
            contentHtml = data.sections.map(sec => {
                if (sec.type === 'bullets') {
                    return `<div class="study-section-card"><div class="study-section-title">${sec.title}</div><ul class="study-list">${sec.points.map(p => `<li>${p}</li>`).join('')}</ul></div>`;
                }
                if (sec.type === 'comparison') {
                    return `<div class="study-section-card"><div class="study-section-title">${sec.title || 'Comparison'}</div><div class="study-table-wrapper"><table class="study-table"><thead><tr><th>Feature</th><th>${sec.itemA}</th><th>${sec.itemB}</th></tr></thead><tbody>${sec.rows.map(r => `<tr><td>${r.feature}</td><td>${r.valA}</td><td>${r.valB}</td></tr>`).join('')}</tbody></table></div></div>`;
                }
                if (sec.type === 'warning') {
                    return `<div class="study-box-tip"><div>💡</div><div class="study-box-text"><b>EXAM TIP:</b><br/>${sec.text}</div></div>`;
                }
                return '';
            }).join('') + `<div style="text-align:center; padding:30px 0; opacity:0.3; font-weight:800; font-size:0.65rem; letter-spacing:2px;">SUMMARY COMPLETE</div>`;
            
            navHtml = `<div class="study-nav" style="grid-template-columns: 1fr;"><button class="btn-study btn-study-next" onclick="ManyaApp.startQuiz()">PROCEED TO ASSESSMENT</button></div>`;
        } 
        else if (isCardMode) {
            const card = data.cards[currentCard];
            contentHtml = `
                <div class="study-flash-wrapper">
                    <div class="study-flash-card">
                        <div class="study-card-term">${card.term}</div>
                        <div class="study-card-fact">${card.fact}</div>
                        <div class="study-mnemonic-box">
                            <div class="study-mnemonic-badge">Memory Hook</div>
                            <div class="study-mnemonic-text">"${card.mnemonic}"</div>
                        </div>
                    </div>
                </div>
            `;

            const isLast = currentCard === data.cards.length - 1;
            navHtml = `
                <div class="study-nav">
                    ${isLast ? 
                        `<button class="btn-study btn-study-next" style="grid-column: span 2;" onclick="ManyaApp.startQuiz()">START PRACTICE QUIZ 🚀</button>` : 
                        `<button class="btn-study btn-study-prev" onclick="window.ManyaStudyNav('PREV')">BACK</button>
                         <button class="btn-study btn-study-next" onclick="window.ManyaStudyNav('NEXT')">GOT IT, NEXT</button>`
                    }
                </div>
            `;
        }

        container.innerHTML = `
            <div class="study-root">
                <div class="study-header">
                    <div class="study-title-box">
                        <p>${data.topic || 'Revision'}</p>
                        <h1>${data.variantTitle}</h1>
                    </div>
                    ${isCardMode ? `<div style="background:#f1f5f9; padding:6px 12px; border-radius:10px; font-weight:900; color:#64748b; font-size:0.7rem;">${currentCard + 1} / ${data.cards.length}</div>` : ''}
                </div>
                <div class="study-content">${contentHtml}</div>
                ${navHtml}
            </div>
        `;
    },

    navigate: (dir) => {
        const s = GeneralStudyEngine.state;
        if (dir === 'NEXT' && s.currentCard < s.data.cards.length - 1) {
            s.currentCard++;
            GeneralStudyEngine.updateUI(document.querySelector('.study-root').parentElement);
        } else if (dir === 'PREV' && s.currentCard > 0) {
            s.currentCard--;
            GeneralStudyEngine.updateUI(document.querySelector('.study-root').parentElement);
        }
    }
};

window.ManyaStudyNav = (dir) => GeneralStudyEngine.navigate(dir);
if (!window.ManyaApp) window.ManyaApp = { startQuiz: () => console.log("Quiz Logic Here") };