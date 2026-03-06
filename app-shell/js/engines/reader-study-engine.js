/**
 * MANYA GENERAL STUDY ENGINE (v7.0 - THE UNABRIDGED MASTER)
 * --------------------------------------------------------
 * FEATURES:
 * - HANDHELD CARD: Centered layout that fits inside the app frame.
 * - QUEST AWARENESS: Automatically hides internal UI if QuestRunner is present.
 * - MULTI-LAYOUT: Supports Bullets, Comparison Tables, Tips, and Flashcards.
 * - THEME: Manya Pink/Purple accents.
 */

export const GeneralStudyEngine = {
    state: {
        data: null,
        currentCard: 0,
        theme: '#7C3AED' // Default Manya Purple
    },

    // --- 1. PREMIUM STUDY STYLES (ISOLATED) ---
    injectStyles: () => {
        if (document.getElementById('manya-gen-study-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-gen-study-styles';
        style.innerHTML = `
            /* ROOT: Centers the card within view-mount */
            .manya-gen-study-actor { 
                width: 100%; height: 100%; 
                display: flex; justify-content: center; align-items: flex-start; 
                background: #FDFBF7; padding: 20px 15px; box-sizing: border-box; 
                font-family: 'Nunito', sans-serif;
                overflow-y: auto;
            }

            /* THE HANDHELD CARD */
            .study-card-embedded {
                width: 100%; max-width: 420px;
                background: white; border-radius: 35px;
                box-shadow: 0 15px 40px rgba(30, 41, 59, 0.05);
                border: 2px solid #F1EFE9;
                display: flex; flex-direction: column;
                overflow: hidden; padding: 25px;
                animation: studyCardPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            @keyframes studyCardPop {
                from { opacity: 0; transform: translateY(30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            /* CONTENT ELEMENTS */
            .study-section { margin-bottom: 25px; }
            .study-section:last-child { margin-bottom: 0; }

            .study-title-pill { 
                font-size: 0.85rem; font-weight: 900; color: #DB2777; 
                margin-bottom: 12px; border-left: 4px solid #DB2777; padding-left: 12px;
                text-transform: uppercase; letter-spacing: 1px;
            }

            .study-list { padding: 0; margin: 0; list-style: none; }
            .study-list li { 
                margin-bottom: 14px; line-height: 1.6; font-size: 1rem; color: #334155;
                position: relative; padding-left: 22px; font-weight: 600;
            }
            .study-list li::before {
                content: "•"; position: absolute; left: 0; color: #7C3AED; font-weight: 900; font-size: 1.4rem; line-height: 1;
            }

            /* TABLES (Comparisons) */
            .study-table-container { border-radius: 20px; overflow: hidden; border: 2px solid #F1F5F9; margin: 10px 0; }
            .study-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
            .study-table th { background: #1E293B; color: white; padding: 14px; text-align: left; font-weight: 800; }
            .study-table td { padding: 12px 14px; border-top: 1.5px solid #F1F5F9; color: #475569; font-weight: 600; }
            .study-table tr:nth-child(even) { background: #F8FAFC; }

            /* BOXED TIPS */
            .study-exam-tip { 
                background: #FFFBEB; border: 2px solid #FEF3C7; 
                padding: 18px; border-radius: 24px; color: #92400E; 
                font-size: 0.9rem; line-height: 1.5; font-weight: 700;
                display: flex; gap: 12px; align-items: flex-start;
            }
            .tip-icon { font-size: 1.2rem; }

            /* FLASHCARDS */
            .study-flash { 
                padding: 40px 20px; text-align: center; display: flex; flex-direction: column; gap: 15px;
            }
            .flash-term { font-size: 1.8rem; font-weight: 900; color: #1E293B; }
            .flash-fact { font-size: 1.1rem; color: #64748B; line-height: 1.5; font-weight: 600; }
            .flash-mnemonic { margin-top: 15px; padding: 12px; background: #F3E8FF; border-radius: 15px; color: #7C3AED; font-size: 14px; font-weight: 800; font-style: italic; }

            /* INTERNAL NAV (Only shown outside of Quest Runner) */
            .internal-nav { margin-top: 20px; }
            .btn-full { width: 100%; padding: 16px; border-radius: 18px; border: none; background: #7C3AED; color: white; font-weight: 800; font-size: 1rem; cursor: pointer; box-shadow: 0 5px 0 #5B21B6; }
        `;
        document.head.appendChild(style);
    },

    // --- 2. RENDER LOGIC ---
    renderStudy: (container, data) => {
        GeneralStudyEngine.state.data = data;
        GeneralStudyEngine.state.currentCard = 0;
        GeneralStudyEngine.injectStyles();
        
        // Detect context: If container is inside the app mount, we hide internal header/nav
        const isQuestMode = !!document.querySelector('.quest-runner-shell');
        
        GeneralStudyEngine.updateUI(container, isQuestMode);
    },

    // Labeling alias (Standard for Manya Routers)
    renderLabeling: (container, data) => GeneralStudyEngine.renderStudy(container, data),

    // --- 3. UI BUILDER ---
    updateUI: (container, isQuestMode = false) => {
        const { data, currentCard } = GeneralStudyEngine.state;
        let innerHtml = '';

        // Layout A: Structured Sections
        if (data.sections) {
            innerHtml = data.sections.map(sec => {
                if (sec.type === 'bullets') {
                    return `
                        <div class="study-section">
                            <div class="study-title-pill">${sec.title}</div>
                            <ul class="study-list">
                                ${sec.points.map(p => `<li>${p}</li>`).join('')}
                            </ul>
                        </div>`;
                }
                if (sec.type === 'comparison') {
                    return `
                        <div class="study-section">
                            <div class="study-title-pill">${sec.title}</div>
                            <div class="study-table-container">
                                <table class="study-table">
                                    <thead>
                                        <tr>
                                            <th>Feature</th>
                                            <th>${sec.itemA}</th>
                                            <th>${sec.itemB}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${sec.rows.map(r => `
                                            <tr>
                                                <td><b>${r.feature}</b></td>
                                                <td>${r.valA}</td>
                                                <td>${r.valB}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>`;
                }
                if (sec.type === 'warning' || sec.type === 'tip') {
                    return `
                        <div class="study-section">
                            <div class="study-exam-tip">
                                <span class="tip-icon">💡</span>
                                <div><b>PLE EXAM TIP:</b><br>${sec.text}</div>
                            </div>
                        </div>`;
                }
            }).join('');
        } 
        
        // Layout B: Flashcards
        else if (data.cards) {
            const card = data.cards[currentCard];
            innerHtml = `
                <div class="study-flash">
                    <div class="flash-term">${card.term}</div>
                    <div class="flash-fact">${card.fact}</div>
                    ${card.mnemonic ? `<div class="flash-mnemonic">Mnemonic: ${card.mnemonic}</div>` : ''}
                </div>
            `;
        }

        // --- FINAL RENDER ASSEMBLY ---
        container.innerHTML = `
            <div class="manya-gen-study-actor">
                <div class="study-card-embedded">
                    
                    <!-- Internal Header: Only show if NOT in a Quest -->
                    ${!isQuestMode ? `
                        <div style="margin-bottom:20px; text-align:center;">
                            <h2 style="margin:0; font-weight:900; color:#1E293B;">${data.topic || 'Review'}</h2>
                        </div>
                    ` : ''}

                    <div class="card-content-scroll">
                        ${innerHtml}
                    </div>

                    <!-- Internal Nav: Only show if NOT in a Quest -->
                    ${(!isQuestMode && data.cards) ? `
                        <div class="internal-nav">
                            <button class="btn-full" onclick="GeneralStudyEngine.nextCard()">NEXT CARD</button>
                        </div>
                    ` : ''}

                </div>
            </div>
        `;
    },

    // --- 4. ENGINE HELPERS ---
    nextCard: () => {
        const s = GeneralStudyEngine.state;
        if (s.data.cards && s.currentCard < s.data.cards.length - 1) {
            s.currentCard++;
            // Re-render into the current mount point
            const mount = document.querySelector('.manya-gen-study-actor').parentElement;
            GeneralStudyEngine.updateUI(mount, !!document.querySelector('.quest-runner-shell'));
        } else {
            if (window.QuestRunner) window.QuestRunner.next();
        }
    }
};

// Global Registration
window.GeneralStudyEngine = GeneralStudyEngine;