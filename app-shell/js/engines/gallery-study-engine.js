/**
 * MANYA ELITE GALLERY ENGINE v4.0 (MASTER BUILD)
 * --------------------------------------------------------
 * FEATURES:
 * - DYNAMIC HUD: Themed header shell with Elite Chevron and ManyaDB gems.
 * - FIXED-GRID STAGE: Perfectly blocked to avoid HUD/Nav overlaps.
 * - BENTO IMAGE VAULT: Images sit in a vibrant, glowing stage.
 * - SMART DRAWER: Tap-to-dismiss notes with glassmorphism blur.
 * - TACTILE DOTS: Animated progress tracking for slides.
 */

import { ManyaDB } from '/app-shell/manya-db.js';
import { ManyaNotify } from '/app-shell/views/manya-notify.js';
export const GalleryStudyEngine = {
    state: {
        data: null,
        currentIdx: 0,
        isExpanded: false
    },

    // --- 1. WORLD-CLASS STYLES ---
    injectStyles: () => {
        if (document.getElementById('manya-gallery-v4-styles')) return;
        const style = document.createElement('style');
        style.id = 'manya-gallery-v4-styles';
        style.innerHTML = `
            .gal-root { 
                position: fixed; inset: 0; background: #FDFBF7; 
                display: grid;
                /* Slot 1: HUD (80px) | Slot 2: Content (1fr) | Slot 3: Nav (95px) */
                grid-template-rows: 80px 1fr 95px;
                z-index: 5000;
                font-family: 'Plus Jakarta Sans', sans-serif;
            }

            /* SLOT 2: THE GALLERY STAGE */
            .gal-stage {
                grid-row: 2;
                display: flex;
                flex-direction: column;
                padding: 0 15px;
                position: relative;
                overflow: hidden;
            }

            /* THE IMAGE BENTO CARD */
            .gal-card-bento {
                flex: 1;
                background: white; border-radius: 35px;
                border: 2.5px solid #F1F5F9; position: relative;
                overflow: hidden; box-shadow: 0 15px 45px rgba(0,0,0,0.03);
                display: flex; flex-direction: column;
            }

            /* PROGRESS DOTS */
            .gal-tracker {
                display: flex; gap: 8px; padding: 20px;
                justify-content: center; align-items: center;
            }
            .gal-dot { width: 8px; height: 8px; background: #E2E8F0; border-radius: 50%; transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            .gal-dot.active { background: #7c3aed; width: 24px; border-radius: 10px; box-shadow: 0 0 10px rgba(124, 58, 237, 0.3); }

            /* IMAGE CONTAINER */
            .gal-img-wrap {
                flex: 1; width: 100%; display: flex; align-items: center; justify-content: center;
                padding: 20px; box-sizing: border-box; background: white;
            }
            .gal-img-wrap img {
                max-width: 100%; max-height: 100%; 
                object-fit: contain; border-radius: 20px;
                filter: drop-shadow(0 10px 30px rgba(0,0,0,0.08));
                animation: slideScale 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            @keyframes slideScale { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

            /* TACTILE SIDE NAV */
            .gal-side-nav {
                position: absolute; top: 50%; width: 100%;
                display: flex; justify-content: space-between; padding: 0 10px;
                pointer-events: none; z-index: 1000; transform: translateY(-50%);
            }
            .gal-nav-btn {
                width: 48px; height: 48px; border-radius: 16px; border: none;
                background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px);
                color: #7c3aed; cursor: pointer; pointer-events: auto;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 8px 20px rgba(0,0,0,0.1); border: 1.5px solid #F1F5F9;
                transition: 0.2s;
            }
            .gal-nav-btn:active { transform: scale(0.9); }
            .gal-nav-btn:disabled { opacity: 0.3; pointer-events: none; }

            /* GLASSMOPHISM DRAWER */
            .gal-drawer {
                position: absolute; bottom: 0; left: 0; right: 0; height: 50%;
                background: rgba(255,255,255,0.95); backdrop-filter: blur(20px);
                z-index: 1100; border-radius: 40px 40px 0 0;
                border-top: 2px solid #F1F5F9;
                transform: translateY(calc(100% - 65px)); 
                transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                display: flex; flex-direction: column;
                box-shadow: 0 -15px 40px rgba(0,0,0,0.06);
            }
            .gal-drawer.expanded { transform: translateY(0); }
            .gal-drawer-handle { width: 40px; height: 5px; background: #E2E8F0; border-radius: 10px; margin: 15px auto; }
            
            .gal-sheet-header { padding: 0 25px 15px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
            .gal-sheet-title { font-size: 1.15rem; font-weight: 900; color: #1E293B; margin: 0; }
            .gal-read-pill {
                padding: 6px 12px; border-radius: 100px;
                background: #FCE7F3; color: #db2777;
                font-size: 10px; font-weight: 900; text-transform: uppercase;
            }

            .gal-sheet-body { flex: 1; overflow-y: auto; padding: 0 25px 40px; font-size: 15px; line-height: 1.6; color: #475569; }
        `;
        document.head.appendChild(style);
    },

    // --- 2. RENDER LOGIC ---
    renderStudy: async (container, data) => {
        GalleryStudyEngine.injectStyles();
        GalleryStudyEngine.state.data = data;
        GalleryStudyEngine.state.currentIdx = 0;
        GalleryStudyEngine.state.isExpanded = false;

        const user = await ManyaDB.getCurrentUser();

        const refresh = () => {
            const slide = data.slides[GalleryStudyEngine.state.currentIdx];
            const isExpanded = GalleryStudyEngine.state.isExpanded;

            container.innerHTML = `
                <div class="gal-root animate-in">
                    <!-- Slot 1: HUD -->
                    <header class="app-header-master">
                        <div class="header-shell" style="border: 2.5px solid #7c3aed">
                            <button class="uni-back-btn" onclick="ViewManager.goBack()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                            </button>
                            <div class="uni-title-box" style="margin-left:15px">
                                <span class="uni-main-title">${data.topic.toUpperCase()}</span>
                                <span class="uni-sub-title" style="color:#7c3aed">ELITE GALLERY</span>
                            </div>
                            <div class="uni-stats">
                                <span class="diamond-sparkle">💎</span>
                                <span class="uni-count">${user.diamonds}</span>
                            </div>
                        </div>
                    </header>

                    <!-- Slot 2: Content -->
                    <main class="gal-stage">
                        <div class="gal-card-bento">
                            <div class="gal-tracker">
                                ${data.slides.map((_, i) => `<div class="gal-dot ${i === GalleryStudyEngine.state.currentIdx ? 'active' : ''}"></div>`).join('')}
                            </div>

                            <div class="gal-side-nav">
                                <button class="gal-nav-btn" id="gal-prev" ${GalleryStudyEngine.state.currentIdx === 0 ? 'disabled' : ''}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                </button>
                                <button class="gal-nav-btn" id="gal-next">
                                    ${GalleryStudyEngine.state.currentIdx === data.slides.length - 1 ? '✓' : `
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                                    `}
                                </button>
                            </div>

                            <div class="gal-img-wrap" id="gal-img-trigger">
                                <img src="${slide.image}" alt="Slide Visual">
                            </div>

                            <div class="gal-drawer ${isExpanded ? 'expanded' : ''}" id="gal-drawer">
                                <div class="gal-drawer-handle"></div>
                                <div class="gal-sheet-header" id="gal-header-trigger">
                                    <h2 class="gal-sheet-title">${slide.title}</h2>
                                    <div class="gal-read-pill" id="gal-status-tag">${isExpanded ? 'CLOSE' : 'READ NOTES'}</div>
                                </div>
                                <div class="gal-sheet-body">
                                    <div style="background:#F8FAFC; padding:15px; border-radius:15px; border-left:4px solid #db2777; margin-bottom:20px; font-weight:700; color:#1E293B; font-size:13px;">
                                        Manya Insight: Tap notes to close or the image to expand!
                                    </div>
                                    ${slide.description}
                                </div>
                            </div>
                        </div>
                    </main>

                    <!-- Slot 3: Nav Spacer -->
                    <div class="nav-spacer"></div>
                </div>
            `;

            // EVENT BINDING
            container.querySelector('#gal-prev').onclick = (e) => {
                e.stopPropagation();
                GalleryStudyEngine.state.currentIdx--;
                GalleryStudyEngine.state.isExpanded = false;
                refresh();
            };

            container.querySelector('#gal-next').onclick = (e) => {
                e.stopPropagation();
                if(GalleryStudyEngine.state.currentIdx < data.slides.length - 1) { 
                    GalleryStudyEngine.state.currentIdx++;
                    GalleryStudyEngine.state.isExpanded = false;
                    refresh(); 
                } else { 
                    ManyaNotify.show("Gallery Mission Complete! 🎓", "success");
                    if (window.QuestRunner) window.QuestRunner.next();
                }
            };

            const toggleDrawer = () => {
                GalleryStudyEngine.state.isExpanded = !GalleryStudyEngine.state.isExpanded;
                refresh();
            };

            container.querySelector('#gal-img-trigger').onclick = toggleDrawer;
            container.querySelector('#gal-header-trigger').onclick = toggleDrawer;
        };

        refresh();
    }
};

window.GalleryStudyEngine = GalleryStudyEngine;