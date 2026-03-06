/**
 * Manya Elite Gallery Engine (v3.0 - Handheld Card Edition)
 * --------------------------------------------------------
 * FEATURES:
 * - Handheld Card: Sits inside the app frame.
 * - Interactive Bottom Sheet: Expands to show study notes.
 * - Progress Sync: Visual dots for each slide.
 */
export const GalleryStudyEngine = {
    injectStyles: () => {
        if (document.getElementById('manya-gallery-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-gallery-styles';
        style.innerHTML = `
            .set-root { 
                width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; 
                background: #FDFBF7; padding: 10px; box-sizing: border-box; font-family: 'Nunito', sans-serif;
            }

            .set-game-card {
                width: 100%; max-width: 420px; height: 92%; max-height: 660px;
                background: white; border-radius: 40px; box-shadow: 0 20px 60px rgba(30, 41, 59, 0.12); 
                border: 2.5px solid #F1EFE9; display: flex; flex-direction: column; overflow: hidden; position: relative;
            }

            /* PROGRESS TRACKER (Dots) */
            .p-tracker {
                display: flex; gap: 8px; padding: 15px 25px;
                background: white; z-index: 1200; justify-content: center;
            }
            .p-dot { width: 8px; height: 8px; background: #E2E8F0; border-radius: 50%; transition: 0.3s; }
            .p-dot.active { background: #7C3AED; width: 20px; border-radius: 10px; }

            /* IMAGE STAGE */
            .gallery-stage {
                flex: 1; width: 100%; display: flex; align-items: center;
                justify-content: center; padding: 20px; box-sizing: border-box;
                min-height: 0; background: white; cursor: pointer;
            }
            .gallery-stage img {
                max-width: 100%; max-height: 100%; 
                object-fit: contain; border-radius: 20px;
                filter: drop-shadow(0 10px 20px rgba(0,0,0,0.05));
            }

            /* INTERNAL NAVIGATION */
            .gallery-nav {
                position: absolute; top: 45%; left: 0; right: 0;
                display: flex; justify-content: space-between; padding: 0 10px;
                pointer-events: none; z-index: 1000;
            }
            .gal-btn {
                width: 44px; height: 44px; border-radius: 50%; border: none;
                background: rgba(124, 58, 237, 0.9); color: white;
                font-size: 20px; font-weight: bold; cursor: pointer; pointer-events: auto;
                box-shadow: 0 8px 15px rgba(124, 58, 237, 0.3);
            }
            .gal-btn:disabled { background: #E2E8F0; color: #94A3B8; box-shadow: none; }

            /* EXPANDABLE BOTTOM SHEET (Themed Pink) */
            .bottom-sheet {
                position: absolute; bottom: 0; left: 0; right: 0;
                background: #F8FAFC; border-radius: 32px 32px 0 0;
                padding: 20px 25px; box-shadow: 0 -15px 40px rgba(0,0,0,0.05);
                z-index: 1100; transform: translateY(calc(100% - 65px)); 
                transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                border-top: 2px solid #F1F5F9;
            }
            .bottom-sheet.expanded { transform: translateY(0); background: white; }

            .sheet-header {
                display: flex; justify-content: space-between; align-items: center;
                height: 30px; cursor: pointer; margin-bottom: 15px;
            }
            .sheet-title { font-size: 1.1rem; font-weight: 900; color: #1E293B; margin: 0; }
            .toggle-indicator {
                padding: 6px 14px; border-radius: 30px;
                background: #FCE7F3; color: #DB2777;
                font-size: 10px; font-weight: 900; text-transform: uppercase;
            }

            .sheet-content {
                max-height: 40vh; overflow-y: auto; font-size: 15px; line-height: 1.6;
                color: #475569; padding-bottom: 20px; opacity: 0; transition: 0.3s;
            }
            .bottom-sheet.expanded .sheet-content { opacity: 1; }
        `;
        document.head.appendChild(style);
    },

    renderStudy: (container, data) => {
        GalleryStudyEngine.injectStyles();
        let currentIdx = 0;
        let isExpanded = false;

        const refresh = () => {
            const slide = data.slides[currentIdx];
            container.innerHTML = `
                <div class="set-root">
                    <div class="set-game-card">
                        <div class="p-tracker">
                            ${data.slides.map((_, i) => `<div class="p-dot ${i === currentIdx ? 'active' : ''}"></div>`).join('')}
                        </div>

                        <div class="gallery-nav">
                            <button class="gal-btn" id="prev-btn" ${currentIdx === 0 ? 'disabled' : ''}>‹</button>
                            <button class="gal-btn" id="next-btn">
                                ${currentIdx === data.slides.length - 1 ? '✓' : '›'}
                            </button>
                        </div>

                        <div class="gallery-stage" id="img-trigger">
                            <img src="${slide.image}" alt="Simulation Graphic">
                        </div>

                        <div class="bottom-sheet ${isExpanded ? 'expanded' : ''}" id="sheet">
                            <div class="sheet-header" id="header-trigger">
                                <h2 class="sheet-title">${slide.title}</h2>
                                <div class="toggle-indicator" id="status-tag">
                                    ${isExpanded ? 'CLOSE' : 'READ NOTES'}
                                </div>
                            </div>
                            <div class="sheet-content">
                                ${slide.description}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // NAVIGATION LOGIC
            container.querySelector('#prev-btn').onclick = (e) => {
                e.stopPropagation();
                if(currentIdx > 0) { currentIdx--; isExpanded = false; refresh(); }
            };

            container.querySelector('#next-btn').onclick = (e) => {
                e.stopPropagation();
                if(currentIdx < data.slides.length - 1) { 
                    currentIdx++; isExpanded = false; refresh(); 
                } else { 
                    // LINK TO APP SHELL
                    if (window.QuestRunner) window.QuestRunner.next();
                    else alert("Lesson Complete! 🎓"); 
                }
            };

            // TOGGLE LOGIC
            const toggle = () => {
                isExpanded = !isExpanded;
                const sheet = container.querySelector('#sheet');
                const tag = container.querySelector('#status-tag');
                sheet.classList.toggle('expanded');
                tag.innerText = isExpanded ? 'CLOSE' : 'READ NOTES';
            };

            container.querySelector('#img-trigger').onclick = toggle;
            container.querySelector('#header-trigger').onclick = toggle;
        };

        refresh();
    }
};