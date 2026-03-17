/**
 * MANYA GENERAL STUDY ENGINE v8.0 (ELITE MASTER)
 * --------------------------------------------------------
 * FEATURES:
 * - HUD TAKEOVER: Matches Spiral/Globe engine for seamless navigation.
 * - BENTO LAYOUT: Content organized into high-fidelity tactile cards.
 * - THEMED ADAPTATION: Uses --biome-color for subject-specific accents.
 * - DYNAMIC COMPONENTS: Bullets, Comparison Tables, Glowing Tips, Flashcards.
 */



export const GeneralStudyEngine = {
    state: {
        data: null,
        currentCard: 0,
        isQuestMode: false
    },

    // --- 1. THE NUCLEAR CSS REPAIR ---
    injectStyles: () => {
        if (document.getElementById('manya-gen-study-v9-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-gen-study-v9-styles';
        style.innerHTML = `
            .study-wrapper { 
                position: relative; width: 100%; height: 100%; background: #FDFBF7; 
                display: flex; flex-direction: column; z-index: 10;
                overflow: hidden; font-family: 'Plus Jakarta Sans', sans-serif;
            }

            /* CONTENT CONTAINER */
            .study-content-scroll {
                flex: 1; overflow-y: auto; padding: 20px 20px 100px;
                scroll-behavior: smooth; -webkit-overflow-scrolling: touch;
            }
/* ... rest of existing styles ... */
            .concept-card {
                background: white; border-radius: 30px; padding: 25px;
                border: 1.5px solid #F1F5F9; margin-bottom: 20px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.02);
                width: 100%; box-sizing: border-box;
                animation: conceptFadeIn 0.5s ease-out both;
            }

            @keyframes conceptFadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* TITLES & LABELS */
            .concept-tag {
                display: inline-flex; align-items: center; gap: 6px;
                padding: 6px 12px; border-radius: 10px;
                background: var(--biome-color, #7c3aed); color: white;
                font-size: 10px; font-weight: 900; text-transform: uppercase;
                letter-spacing: 1px; margin-bottom: 15px;
            }

            .concept-title { font-size: 1.25rem; font-weight: 900; color: #1E293B; margin-bottom: 12px; line-height: 1.3; }

            /* POINT ROWS (Replaces messy bullets) */
            .point-row {
                display: flex; gap: 15px; padding: 18px; background: #F8FAFC;
                border-radius: 20px; margin-bottom: 10px; border: 1px solid #F1F5F9;
            }
            .point-marker {
                width: 28px; height: 28px; border-radius: 50%;
                background: white; color: var(--biome-color, #7c3aed);
                display: flex; align-items: center; justify-content: center;
                font-weight: 900; font-size: 12px; flex-shrink: 0;
                box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            }
            .point-text { font-size: 14px; font-weight: 600; color: #475569; line-height: 1.5; }
            .point-text b { color: #1E293B; font-weight: 800; }

            /* COMPARISON BENTO (Scroll-Safe) */
            .comparison-container { overflow-x: auto; border-radius: 20px; border: 1.5px solid #F1F5F9; margin-top: 10px; }
            .comparison-table { width: 100%; border-collapse: collapse; min-width: 280px; }
            .comparison-table th { background: #1E293B; color: white; padding: 12px; font-size: 11px; text-align: left; }
            .comparison-table td { padding: 12px; font-size: 13px; font-weight: 700; color: #475569; border-top: 1.5px solid #F1F5F9; }
            .comparison-table tr:nth-child(even) { background: #F8FAFC; }

            /* NEON EXAM TIPS */
            .exam-tip-box {
                background: #FFFBEB; border: 2.5px solid #FBBF24;
                border-radius: 24px; padding: 20px; display: flex; gap: 15px;
                box-shadow: 0 10px 20px rgba(251, 191, 36, 0.1);
            }
            .tip-icon { font-size: 24px; filter: drop-shadow(0 0 10px #FBBF24); }

            /* NAV BUTTONS */
            .study-btn-next {
                width: 100%; height: 65px; border-radius: 22px; border: none;
                background: var(--biome-color, #7c3aed); color: white;
                font-weight: 900; font-size: 1.1rem; cursor: pointer;
                box-shadow: 0 6px 0 rgba(0,0,0,0.15); transition: 0.1s;
                text-transform: uppercase; letter-spacing: 1px;
            }
            .study-btn-next:active { transform: translateY(4px); box-shadow: none; }
        `;
        document.head.appendChild(style);
    },

    // --- 2. THE RENDER ENGINE ---
    renderStudy: async (container, data) => {
        GeneralStudyEngine.state.data = data;
        GeneralStudyEngine.injectStyles();
        
        const isQuestMode = !!document.querySelector('.quest-runner-shell');
        GeneralStudyEngine.state.isQuestMode = isQuestMode;

        // HUD Mutation: Apply subject color if specified
        if(data.themeColor) document.documentElement.style.setProperty('--biome-color', data.themeColor);

        container.innerHTML = `
            <div class="study-wrapper animate-in">
                <div class="study-content-scroll">
                    ${GeneralStudyEngine.buildSections(data)}
                    
                    <!-- Completion Reward Action -->
                    <div style="margin-top: 20px; width: 100%; max-width: 420px;">
                        <button class="study-btn-next" onclick="GeneralStudyEngine.finishLesson()">
                            Complete Lesson +10 💎
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Standardization Alias
    renderLabeling: (container, data) => GeneralStudyEngine.renderStudy(container, data),

    // --- 3. THE UI BUILDER (LITERAL RECONSTRUCTION) ---
    buildSections: (data) => {
        if (!data.sections) return '<p>No content available.</p>';

        return data.sections.map((sec, idx) => {
            // A. BULLET LISTS (Bento)
            if (sec.type === 'bullets') {
                return `
                    <div class="concept-card" style="animation-delay: ${idx * 0.1}s">
                        <span class="concept-tag">Concept #${idx + 1}</span>
                        <div class="concept-title">${sec.title}</div>
                        ${sec.hint ? `<div class="study-hint" style="background:#FFF9EB; border-left:4px solid #FBBF24; padding:12px; border-radius:10px; margin-bottom:15px; font-size:12px; font-weight:700; color:#92400E;">💡 HINT: ${sec.hint}</div>` : ''}
                        <div class="point-list">
                            ${sec.points.map((p, i) => `
                                <div class="point-row">
                                    <div class="point-marker">${i + 1}</div>
                                    <div class="point-text">${p}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>`;
            }

            // B. COMPARISON TABLES (Responsive)
            if (sec.type === 'comparison') {
                return `
                    <div class="concept-card" style="animation-delay: ${idx * 0.1}s">
                        <span class="concept-tag" style="background:#1E293B">Comparison</span>
                        <div class="concept-title">${sec.title}</div>
                        <div class="comparison-container">
                            <table class="comparison-table">
                                <thead>
                                    <tr>
                                        <th>FEATURE</th>
                                        <th>${sec.itemA.toUpperCase()}</th>
                                        <th>${sec.itemB.toUpperCase()}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sec.rows.map(r => `
                                        <tr>
                                            <td>${r.feature}</td>
                                            <td>${r.valA}</td>
                                            <td>${r.valB}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>`;
            }

            // C. NEON EXAM TIPS
            if (sec.type === 'tip' || sec.type === 'warning') {
                return `
                    <div class="concept-card" style="padding:0; border:none; background:none; animation-delay: ${idx * 0.1}s">
                        <div class="exam-tip-box">
                            <div class="tip-icon">💡</div>
                            <div>
                                <div style="font-weight:900; font-size:11px; color:#92400E; margin-bottom:5px;">PLE SUCCESS TIP</div>
                                <div style="font-weight:700; font-size:14px; color:#B45309; line-height:1.4">${sec.text}</div>
                            </div>
                        </div>
                    </div>`;
            }

            return '';
        }).join('');
    },

    // --- 4. ENGINE COMPLETION ---
    finishLesson: async () => {
        if(window.addToast) window.addToast({message: "Lesson Complete!", type: "success"});
        
        if (window.QuestRunner && GeneralStudyEngine.state.isQuestMode) {
            window.QuestRunner.next();
        } else {
            // ViewManager.goBack();
        }
    }
};

window.GeneralStudyEngine = GeneralStudyEngine;