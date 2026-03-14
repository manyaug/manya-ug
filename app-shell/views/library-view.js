import { ManyaDB } from '../manya-db.js';
import { AudioManager } from '/app-shell/js/audio-manager.js';

export const renderLibrary = async (mount) => {
    // 1. DATA SETUP
    let activeSubject = (localStorage.getItem('manya_lib_sub') || 'math').toLowerCase();
    const user = await ManyaDB.getCurrentUser();

    // Subject Meta for Icons and Colors
    const subMeta = {
        math: { name: 'Math', icon: '❄️', color: '#6366F1' },
        science: { name: 'Science', icon: '🌱', color: '#10B981' },
        sst: { name: 'SST', icon: '🌍', color: '#F59E0B' },
        english: { name: 'English', icon: '📖', color: '#DB2777' }
    };

    try {
        const res = await fetch('./curriculum-master.json');
        if (!res.ok) throw new Error("Manifest Error");
        const rawCurriculum = await res.json();
        
        // Normalize keys to lowercase
        const curriculum = {};
        Object.keys(rawCurriculum).forEach(k => curriculum[k.toLowerCase()] = rawCurriculum[k]);

        const render = () => {
            const data = curriculum[activeSubject];
            const theme = subMeta[activeSubject]?.color || '#7c3aed';
            document.documentElement.style.setProperty('--theme-color', theme);

            mount.innerHTML = `
            <div class="library-page animate-in">
                <!-- HEADER -->
                <div style="text-align:center; margin-bottom: 25px;">
                    <h2 style="font-weight:900; margin:0; font-size:22px; color:var(--text-main)">Syllabus Vault</h2>
                    <p style="margin:5px 0 0; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Uganda Primary Seven Curriculum</p>
                </div>

                <!-- 1. SUBJECT PICKER (FIXED 2x2 GRID) -->
                <div class="subject-vault-picker">
                    ${Object.keys(subMeta).map(key => `
                        <div class="sub-vault-btn ${activeSubject === key ? 'active' : ''}" 
                             style="--theme-color: ${subMeta[key].color}"
                             onclick="window.switchLib('${key}')">
                            <span class="icon">${subMeta[key].icon}</span>
                            <span class="name">${subMeta[key].name}</span>
                        </div>
                    `).join('')}
                </div>

                <!-- 2. CONTENT LIST -->
                <div class="library-content-elite">
                    ${!data ? `<p style="text-align:center; padding:50px; color:var(--text-muted); font-weight:800;">Data for this subject is being synced...</p>` : 
                      data.units.map(unit => `
                        <span class="unit-label-elite">${unit.title}</span>
                        
                        ${unit.quests.map((quest, i) => `
                            <div class="topic-bento-card" id="q-${quest.folder}">
                                <div class="topic-header-elite" onclick="window.toggleLibAccordion('q-${quest.folder}')">
                                    <div class="topic-num-pill">${i + 1}</div>
                                    <h4 class="topic-name-elite">${quest.title}</h4>
                                    <div class="topic-chevron">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                    </div>
                                </div>
                                
                                <div class="topic-body-elite">
                                    <div class="res-sec">
                                        <span class="res-sec-label">STUDY MATERIAL</span>
                                        <div class="study-grid-elite">
                                            ${quest.resources.map(res => `
                                                <button class="btn-res-study" 
                                                    onclick="window.launchLibraryStep('${activeSubject}', '${unit.id}', '${quest.folder}', '${res.file}')">
                                                    ${res.label}
                                                </button>
                                            `).join('')}
                                        </div>
                                    </div>

                                    <div class="res-sec">
                                        <span class="res-sec-label">PRACTICE CHALLENGES</span>
                                        <div class="practice-grid-elite">
                                            ${Array.from({length: quest.practiceCount}, (_, q) => {
                                                const qID = `${quest.prefix}-${String(q+1).padStart(3, '0')}`;
                                                return `<button class="btn-res-practice" onclick="window.launchLibraryStep('${activeSubject}', '${unit.id}', '${quest.folder}', '${qID}')">${q+1}</button>`;
                                            }).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    `).join('')}
                </div>

                <div style="text-align:center; margin-top:50px; opacity:0.1">
                    <img src="assets/icons/manya_icon.png" style="width:60px">
                </div>
            </div>
            `;
        };

        // --- GLOBAL HELPERS ---
        window.switchLib = (sub) => {
            activeSubject = sub;
            localStorage.setItem('manya_lib_sub', sub);
            AudioManager.playSFX();
            render();
        };

        window.toggleLibAccordion = (id) => {
            const card = document.getElementById(id);
            const isOpen = card.classList.contains('open');
            document.querySelectorAll('.topic-bento-card').forEach(c => c.classList.remove('open'));
            if (!isOpen) card.classList.add('open');
        };

        render();

    } catch (err) {
        console.error("Library Manifest Load Failed:", err);
        mount.innerHTML = `<div style="padding:100px 20px; text-align:center; color:var(--text-muted); font-weight:800;">Curriculum manifest could not be loaded. Please check internet connection.</div>`;
    }
};