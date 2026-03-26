/**
 * Manya Elite Gallery Engine (Tap-to-Toggle Edition)
 * Feature: Full-image hit detection to toggle notes expansion.
 */
export const GalleryStudyEngine = {
    injectStyles: () => {
        if (document.getElementById('manya-gallery-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-gallery-styles';
        style.innerHTML = `
            .gallery-root {
                display: flex;
                flex-direction: column;
                height: 100dvh;
                width: 100%;
                background: #ffffff;
                overflow: hidden;
                position: relative;
            }

            /* PROGRESS TRACKER */
            .p-tracker {
                display: flex; gap: 6px; padding: 12px 20px;
                background: white; z-index: 1200;
            }
            .p-bar { flex: 1; height: 4px; background: #e2e8f0; border-radius: 10px; overflow: hidden; }
            .p-fill { height: 100%; background: var(--manya-purple); width: 0%; transition: width 0.4s ease; }
            .p-bar.active .p-fill { width: 100%; }

            /* IMAGE STAGE (The Hitbox) */
            .gallery-stage {
                flex: 1;
                width: 100%;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                padding: 10px 20px;
                box-sizing: border-box;
                min-height: 0;
                margin-top: 10px;
                cursor: pointer; /* Feedback that it's clickable */
            }

            .gallery-stage img {
                max-width: 100%;
                max-height: 65%; 
                object-fit: contain;
                border-radius: 16px;
                filter: drop-shadow(0 10px 30px rgba(0,0,0,0.08));
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* FLOATING SIDE NAV */
            .side-nav {
                position: absolute;
                top: 40%;
                left: 0; right: 0;
                display: flex;
                justify-content: space-between;
                padding: 0 10px;
                pointer-events: none;
                z-index: 1000;
            }

            .side-btn {
                width: 46px; height: 46px;
                border-radius: 50%; border: 2px solid white;
                background: rgba(124, 58, 237, 0.95); 
                color: white; font-size: 24px; font-weight: bold;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; pointer-events: auto;
                box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
                transition: 0.2s;
            }
            .side-btn:disabled { background: rgba(226, 232, 240, 0.9); color: #94a3b8; border-color: transparent; box-shadow: none; }

            /* SLICK EXPANDABLE BOTTOM SHEET */
            .bottom-sheet {
                position: absolute;
                bottom: 0; left: 0; right: 0;
                background: white;
                border-radius: 32px 32px 0 0;
                padding: 24px;
                padding-bottom: env(safe-area-inset-bottom, 24px);
                box-shadow: 0 -15px 50px rgba(0,0,0,0.15);
                z-index: 1100;
                transform: translateY(calc(100% - 80px)); /* Minimized state */
                transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
            }

            .bottom-sheet.expanded {
                transform: translateY(0);
            }

            .sheet-header {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 20px; cursor: pointer; height: 35px;
            }

            .sheet-title { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin: 0; pointer-events: none; }
            
            .toggle-indicator {
                padding: 6px 12px; border-radius: 12px;
                background: var(--manya-purple-light); color: var(--manya-purple);
                font-size: 11px; font-weight: 800; text-transform: uppercase;
            }

            .sheet-content {
                max-height: 45vh;
                overflow-y: auto;
                font-size: 14px;
                line-height: 1.6;
                color: #475569;
                padding-bottom: 10px;
                opacity: 0;
                transition: opacity 0.3s ease;
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
                <div class="gallery-root">
                    <div class="p-tracker">
                        ${data.slides.map((_, i) => `
                            <div class="p-bar ${i <= currentIdx ? 'active' : ''}">
                                <div class="p-fill"></div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="side-nav">
                        <button class="side-btn" id="prev-btn" ${currentIdx === 0 ? 'disabled' : ''}>‹</button>
                        <button class="side-btn" id="next-btn">
                            ${currentIdx === data.slides.length - 1 ? '✓' : '›'}
                        </button>
                    </div>

                    <!-- THE IMAGE TRIGGER AREA -->
                    <div class="gallery-stage" id="img-trigger">
                        <img src="${slide.image}" alt="Slide">
                    </div>

                    <div class="bottom-sheet ${isExpanded ? 'expanded' : ''}" id="sheet">
                        <div class="sheet-header" id="header-trigger">
                            <h2 class="sheet-title">${slide.title}</h2>
                            <div class="toggle-indicator" id="status-tag">
                                ${isExpanded ? 'Hide' : 'Read'}
                            </div>
                        </div>
                        <div class="sheet-content">
                            ${slide.description}
                        </div>
                    </div>
                </div>
            `;

            // NAVIGATION
            container.querySelector('#prev-btn').onclick = (e) => {
                e.stopPropagation();
                if(currentIdx > 0) { currentIdx--; isExpanded = false; refresh(); }
            };

            container.querySelector('#next-btn').onclick = (e) => {
                e.stopPropagation();
                if(currentIdx < data.slides.length - 1) { currentIdx++; isExpanded = false; refresh(); }
                else { alert("Lesson Complete! 🎓"); }
            };

            // THE TOGGLE LOGIC (Unified for Image and Header)
            const toggle = () => {
                isExpanded = !isExpanded;
                const sheet = container.querySelector('#sheet');
                const tag = container.querySelector('#status-tag');
                sheet.classList.toggle('expanded');
                tag.innerText = isExpanded ? 'Hide' : 'Read';
            };

            container.querySelector('#img-trigger').onclick = toggle;
            container.querySelector('#header-trigger').onclick = toggle;
        };

        refresh();
    }
};