/**
 * Manya Ultra-Pro Gallery Engine v5
 * Feature: Top-aligned Image, Floating Sidebar Nav, and Non-blocking Bottom Sheet.
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

            /* 1. TOP PROGRESS TRACKER */
            .p-tracker {
                display: flex; gap: 6px; padding: 12px 20px;
                background: white; z-index: 1000;
            }
            .p-bar { flex: 1; height: 4px; background: #e2e8f0; border-radius: 10px; overflow: hidden; }
            .p-fill { height: 100%; background: var(--manya-purple); width: 0%; transition: width 0.4s ease; }
            .p-bar.active .p-fill { width: 100%; }

            /* 2. THE STAGE (Pushed up for visibility) */
            .gallery-stage {
                flex: 1;
                width: 100%;
                display: flex;
                align-items: flex-start; /* Pushes image to top */
                justify-content: center;
                padding: 10px 20px;
                box-sizing: border-box;
                min-height: 0;
                margin-top: 10px;
            }

            .gallery-stage img {
                max-width: 100%;
                max-height: 65%; /* Leaves room so text-tab doesn't cover it */
                object-fit: contain;
                border-radius: 16px;
                filter: drop-shadow(0 10px 30px rgba(0,0,0,0.08));
            }

            /* 3. FLOATING SIDE CHEVRONS (Always Visible) */
            .side-nav {
                position: absolute;
                top: 40%; /* Center of the image area */
                left: 0; right: 0;
                display: flex;
                justify-content: space-between;
                padding: 0 10px;
                pointer-events: none;
                z-index: 800;
            }

            .side-btn {
                width: 44px; height: 44px;
                border-radius: 50%; border: none;
                background: rgba(124, 58, 237, 0.9); /* Manya Purple with opacity */
                color: white; font-size: 24px; font-weight: bold;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; pointer-events: auto;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                transition: 0.2s;
            }
            .side-btn:disabled { background: rgba(226, 232, 240, 0.8); color: #94a3b8; box-shadow: none; }
            .side-btn:active { transform: scale(0.9); }

            /* 4. SLICK BOTTOM SHEET */
            .bottom-sheet {
                position: absolute;
                bottom: 0; left: 0; right: 0;
                background: white;
                border-radius: 30px 30px 0 0;
                padding: 20px;
                padding-bottom: env(safe-area-inset-bottom, 20px);
                box-shadow: 0 -10px 40px rgba(0,0,0,0.15);
                z-index: 1100;
                transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
            }

            .bottom-sheet.minimized {
                transform: translateY(calc(100% - 75px)); /* Only title bar visible */
            }

            .sheet-header {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 15px; cursor: pointer; height: 40px;
            }

            .sheet-title { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin: 0; }
            
            .sheet-toggle-icon {
                width: 28px; height: 28px; border-radius: 50%;
                background: var(--manya-purple-light); color: var(--manya-purple);
                display: flex; align-items: center; justify-content: center;
                font-size: 14px; font-weight: bold; transition: 0.3s;
            }
            .bottom-sheet.minimized .sheet-toggle-icon { transform: rotate(180deg); }

            .sheet-content {
                max-height: 40vh;
                overflow-y: auto;
                font-size: 14px;
                line-height: 1.6;
                color: #475569;
                padding-bottom: 10px;
            }
        `;
        document.head.appendChild(style);
    },

    renderStudy: (container, data) => {
        GalleryStudyEngine.injectStyles();
        let currentIdx = 0;
        let isMinimized = false;

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

                    <div class="gallery-stage">
                        <img src="${slide.image}" alt="Simulation">
                    </div>

                    <div class="bottom-sheet ${isMinimized ? 'minimized' : ''}" id="sheet">
                        <div class="sheet-header" id="sheet-trigger">
                            <h2 class="sheet-title">${slide.title}</h2>
                            <div class="sheet-toggle-icon">↓</div>
                        </div>
                        <div class="sheet-content">
                            ${slide.description}
                        </div>
                    </div>
                </div>
            `;

            // BUTTON LOGIC
            container.querySelector('#prev-btn').onclick = () => {
                if(currentIdx > 0) { currentIdx--; refresh(); }
            };

            container.querySelector('#next-btn').onclick = () => {
                if(currentIdx < data.slides.length - 1) { currentIdx++; refresh(); }
                else { alert("Module Complete! 🌟"); }
            };

            // SHEET TOGGLE
            container.querySelector('#sheet-trigger').onclick = () => {
                isMinimized = !isMinimized;
                container.querySelector('#sheet').classList.toggle('minimized');
            };
        };

        refresh();
    }
};