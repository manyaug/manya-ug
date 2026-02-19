export const renderLibrary = async (mount) => {
    let activeSubject = localStorage.getItem('manya_lib_sub') || 'math';

    // 1. FETCH THE AUTOMATED MANIFEST
    const res = await fetch('../curriculum-master.json');
    const curriculum = await res.json();

    const render = () => {
        const subjectData = curriculum[activeSubject];
        if (!subjectData) {
            mount.innerHTML = `<div class="manya-loader">Subject ${activeSubject} coming soon!</div>`;
            return;
        }

        mount.innerHTML = `
            <div class="library-view animate-in">
                <div class="library-header">
                    <h3 class="lib-title">Self-Study Library</h3>
                    <div class="lib-tabs">
                        ${Object.keys(curriculum).map(sub => `
                            <button class="lib-tab ${activeSubject === sub ? 'active' : ''}" 
                                onclick="window.switchLib('${sub}')">${sub.toUpperCase()}</button>
                        `).join('')}
                    </div>
                </div>

                <div class="library-content" style="--theme: ${subjectData.theme}">
                    ${subjectData.units.map(unit => `
                        <h5 class="unit-title">${unit.title}</h5>
                        ${unit.quests.map((quest, i) => `
                            <div class="lib-topic-card">
                                <div class="topic-header" onclick="this.parentElement.classList.toggle('open')">
                                    <span class="topic-num">${i + 1}</span>
                                    <h4 class="topic-name">${quest.title}</h4>
                                    <span class="chevron">▼</span>
                                </div>
                                <div class="topic-body">
                                    <div class="resource-section">
                                        <h5 class="sec-label">STUDY MATERIAL</h5>
                                        <div class="resource-grid">
                                            ${quest.resources.map(res => `
                                                <button class="res-chip study" 
                                                    onclick="window.launchLibraryStep('${activeSubject}', '${unit.id}', '${quest.folder}', '${res.file}')">
                                                    ${res.label}
                                                </button>
                                            `).join('')}
                                        </div>
                                    </div>

                                    <div class="resource-section">
                                        <h5 class="sec-label">PRACTICE QUESTIONS (${quest.practiceCount})</h5>
                                        <div class="practice-grid">
                                            ${Array.from({length: quest.practiceCount}, (_, q) => {
                                                const qID = `${quest.prefix}-${String(q+1).padStart(3, '0')}`;
                                                return `<button class="res-chip practice" onclick="window.launchLibraryStep('${activeSubject}', '${unit.id}', '${quest.folder}', '${qID}')">Q${q+1}</button>`;
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

    window.switchLib = (sub) => { activeSubject = sub; localStorage.setItem('manya_lib_sub', sub); render(); };
    render();
};