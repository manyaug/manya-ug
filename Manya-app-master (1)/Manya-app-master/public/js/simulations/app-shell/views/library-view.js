import { AudioManager } from '../../app-shell/js/audio-manager.js';

export const renderLibrary = async (mount) => {
    let activeSubject = localStorage.getItem('manya_lib_sub') || 'math';

    // 1. Fetch the automated manifest
    const res = await fetch('../curriculum-master.json');
    const curriculum = await res.json();

    const render = () => {
        const data = curriculum[activeSubject]; 
        
        if (!data) {
            mount.innerHTML = `<div class="manya-loader">Subject coming soon!</div>`;
            return;
        }

        // We apply the subject's theme color to a CSS variable to beautifully tint the UI
        mount.innerHTML = `
            <div class="library-view animate-in" style="--theme: ${data.theme}">
                
                <!-- SEAMLESS HEADER WITH PILL TABS -->
                <div class="library-header-elite">
                    <h3 class="lib-title">Syllabus Vault</h3>
                    <div class="lib-tabs-elite">
                        ${Object.keys(curriculum).map(sub => `
                            <button class="lib-tab-elite ${activeSubject === sub ? 'active' : ''}" 
                                onclick="window.switchLib('${sub}')">
                                ${sub.toUpperCase()}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- CONTENT LIST -->
                <div class="library-content-elite">
                    ${data.units.map(unit => `
                        <h5 class="unit-title-elite">${unit.title}</h5>
                        
                        ${unit.quests.map((quest, i) => `
                            <div class="lib-topic-card-elite">
                                <div class="topic-header-elite" onclick="this.parentElement.classList.toggle('open')">
                                    <div class="topic-num-elite">${i + 1}</div>
                                    <h4 class="topic-name-elite">${quest.title}</h4>
                                    <!-- Premium SVG Chevron -->
                                    <svg class="chevron-elite" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                </div>
                                
                                <div class="topic-body-elite">
                                    <div class="resource-section">
                                        <h5 class="sec-label-elite">STUDY MATERIAL</h5>
                                        <div class="resource-grid-elite">
                                            ${quest.resources.map(res => `
                                                <button class="res-chip-study" 
                                                    onclick="window.launchLibraryStep('${activeSubject}', '${unit.id}', '${quest.folder}', '${res.file}')">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                                                    ${res.label}
                                                </button>
                                            `).join('')}
                                        </div>
                                    </div>

                                    <div class="resource-section">
                                        <h5 class="sec-label-elite">PRACTICE QUESTIONS (${quest.practiceCount})</h5>
                                        <div class="practice-grid-elite">
                                            ${Array.from({length: quest.practiceCount}, (_, q) => {
                                                const qID = `${quest.prefix}-${String(q+1).padStart(3, '0')}`;
                                                return `<button class="res-chip-practice" onclick="window.launchLibraryStep('${activeSubject}', '${unit.id}', '${quest.folder}', '${qID}')">${q+1}</button>`;
                                            }).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    `).join('')}
                </div>
            </div>
        `;
    };

    window.switchLib = (sub) => { 
        if (AudioManager.playSFX) AudioManager.playSFX();
        activeSubject = sub; 
        localStorage.setItem('manya_lib_sub', sub); 
        render(); 
    };
    
    render();
};