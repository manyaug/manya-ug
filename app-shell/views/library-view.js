/**
 * MANYA LIBRARY VIEW - MOBILE COMPATIBLE v12.0
 */
import { AudioManager } from '../../app-shell/js/audio-manager.js';

export const renderLibrary = async (mount) => {
    // 1. Force the subject to lowercase for consistent checking
    let activeSubject = (localStorage.getItem('manya_lib_sub') || 'math').toLowerCase();

    try {
        // 2. Robust Fetch: relative to the root of the site
        const res = await fetch('./curriculum-master.json');
        if (!res.ok) throw new Error("Manifest not found");
        
        const rawCurriculum = await res.json();
        
        // 3. Case-Insensitive Mapping: 
        // Converts the whole JSON to lowercase keys so 'math' always finds 'MATH'
        const curriculum = {};
        Object.keys(rawCurriculum).forEach(key => {
            curriculum[key.toLowerCase()] = rawCurriculum[key];
        });

        const render = () => {
            const data = curriculum[activeSubject]; 
            
            if (!data) {
                mount.innerHTML = `
                    <div class="library-view animate-in">
                        <div style="padding: 100px 40px; text-align:center;">
                            <h2 style="color:#94A3B8;">Subject Coming Soon!</h2>
                            <p>We couldn't find data for ${activeSubject}</p>
                            <button onclick="window.switchLib('math')" style="padding:10px 20px; border-radius:12px; background:#7C3AED; color:white; border:none; font-weight:900; margin-top:20px;">BACK TO MATH</button>
                        </div>
                    </div>`;
                return;
            }

            // We apply the subject's theme color to a CSS variable
            mount.innerHTML = `
                <div class="library-view animate-in" style="--theme: ${data.theme || '#7C3AED'}">
                    
                    <!-- THE VAULT HEADER -->
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
                                        <svg class="chevron-elite" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                    </div>
                                    
                                    <div class="topic-body-elite">
                                        <div class="resource-section">
                                            <h5 class="sec-label-elite">STUDY MATERIAL</h5>
                                            <div class="resource-grid-elite">
                                                ${quest.resources.map(res => `
                                                    <button class="res-chip-study" 
                                                        onclick="window.launchLibraryStep('${activeSubject}', '${unit.id}', '${quest.folder}', '${res.file}')">
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
                    <div style="height:100px;"></div>
                </div>
            `;
        };

        window.switchLib = (sub) => { 
            activeSubject = sub.toLowerCase(); 
            localStorage.setItem('manya_lib_sub', activeSubject); 
            render(); 
        };
        
        render();

    } catch (err) {
        console.error("Library Error:", err);
        mount.innerHTML = `<div style="padding:100px 20px; text-align:center;">Manifest Error. Please check internet connection.</div>`;
    }
};