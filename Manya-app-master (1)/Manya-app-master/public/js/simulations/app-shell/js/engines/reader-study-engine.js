/**
 * Manya General Study Engine (v6.0 - Quest-Ready)
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
            :root { --t-color: #6366f1; --t-dark: #4338ca; --t-light: rgba(99, 102, 241, 0.1); }
            
            .study-root { 
                position: absolute; inset: 0; 
                display: flex; flex-direction: column; 
                font-family: 'Plus Jakarta Sans', sans-serif; 
                overflow: hidden; 
            }

            /* HIDE HEADER/NAV IF IN QUEST MODE */
            .study-root.in-quest .study-header,
            .study-root.in-quest .study-nav { display: none !important; }

            .study-content { 
                flex: 1; overflow-y: auto; padding: 20px; 
                display: flex; flex-direction: column; gap: 20px; 
                scroll-behavior: smooth;
            }

            .study-section-card {
                background: white; border-radius: 24px; padding: 22px;
                border: 1px solid #f1f5f9; box-shadow: 0 4px 10px rgba(0,0,0,0.02);
            }
            .study-section-title { 
                font-size: 0.9rem; font-weight: 800; color: var(--t-color); 
                margin-bottom: 15px; border-left: 4px solid var(--t-color); padding-left: 12px;
                text-transform: uppercase;
            }
            .study-list { padding: 0; margin: 0; list-style: none; }
            .study-list li { 
                margin-bottom: 12px; line-height: 1.6; font-size: 0.95rem; color: #475569;
                position: relative; padding-left: 20px;
            }
            .study-list li::before {
                content: "•"; position: absolute; left: 0; color: var(--t-color); font-weight: 900;
            }

            .study-table-wrapper { border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
            .study-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
            .study-table th { background: #1e293b; color: white; padding: 12px; text-align: left; }
            .study-table td { padding: 12px; border-top: 1px solid #f1f5f9; color: #475569; }

            .study-box-tip { 
                background: #fffbeb; border: 1px solid #fde68a; 
                padding: 16px; border-radius: 20px; color: #92400e; font-size: 0.85rem;
            }

            /* Flashcards (Teller Mode) */
            .study-flash-card { 
                background: white; border-radius: 32px; padding: 40px 25px; 
                border: 2px solid #f1f5f9; width: 100%; text-align: center;
                box-shadow: 0 15px 30px rgba(0,0,0,0.05);
                animation: slideUp 0.4s ease-out;
            }
            .study-card-term { font-size: 1.8rem; font-weight: 800; color: #1e293b; margin-bottom: 10px; }
            .study-card-fact { font-size: 1rem; color: #64748b; line-height: 1.5; }
        `;
        document.head.appendChild(style);
    },

    // Standard Render (Called by Router)
    renderLabeling: (container, data) => {
        GeneralStudyEngine.state.data = data;
        GeneralStudyEngine.state.currentCard = 0;
        GeneralStudyEngine.injectStyles();
        
        const baseColor = data.themeColor || '#7c3aed';
        document.documentElement.style.setProperty('--t-color', baseColor);
        
        // Detect if we are inside the Quest Runner
        const isInsideQuest = !!container.closest('.quest-runner-shell');
        
        GeneralStudyEngine.updateUI(container, isInsideQuest);
    },

    // Added for compatibility with study nodes in library
    renderStudy: (container, data) => GeneralStudyEngine.renderLabeling(container, data),

    updateUI: (container, inQuest = false) => {
        const { data, currentCard } = GeneralStudyEngine.state;
        let contentHtml = '';

        if (data.sections) {
            contentHtml = data.sections.map(sec => {
                if (sec.type === 'bullets') {
                    return `<div class="study-section-card"><div class="study-section-title">${sec.title}</div><ul class="study-list">${sec.points.map(p => `<li>${p}</li>`).join('')}</ul></div>`;
                }
                if (sec.type === 'comparison') {
                    return `<div class="study-section-card"><div class="study-section-title">${sec.title}</div><div class="study-table-wrapper"><table class="study-table"><thead><tr><th>Feature</th><th>${sec.itemA}</th><th>${sec.itemB}</th></tr></thead><tbody>${sec.rows.map(r => `<tr><td><b>${r.feature}</b></td><td>${r.valA}</td><td>${r.valB}</td></tr>`).join('')}</tbody></table></div></div>`;
                }
                if (sec.type === 'warning') {
                    return `<div class="study-box-tip"><b>💡 EXAM TIP:</b><br/>${sec.text}</div>`;
                }
            }).join('');
        } else if (data.cards) {
            const card = data.cards[currentCard];
            contentHtml = `
                <div class="study-flash-card">
                    <div class="study-card-term">${card.term}</div>
                    <div class="study-card-fact">${card.fact}</div>
                    <div style="margin-top:20px; padding:15px; background:#f8fafc; border-radius:15px; font-style:italic; font-size:14px; color:var(--t-color);">
                        Mnemonic: ${card.mnemonic}
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="study-root ${inQuest ? 'in-quest' : ''}">
                <div class="study-header">
                    <div class="study-title-box">
                        <h1>${data.variantTitle || 'Topic Recap'}</h1>
                    </div>
                </div>
                <div class="study-content">${contentHtml}</div>
                <div class="study-nav">
                    <button class="btn-study btn-study-next" style="width:100%; grid-column: span 2;" onclick="QuestRunner.next()">CONTINUE QUEST</button>
                </div>
            </div>
        `;
    }
};