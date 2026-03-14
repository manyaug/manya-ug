import { ManyaDB } from '/app-shell/manya-db.js';
import { ManyaNotify } from '/app-shell/views/manya-notify.js';
import { ThemeEngine } from '/app-shell/js/theme-engine.js';

export const renderSettings = async (mount) => {
    let user = await ManyaDB.getCurrentUser();
    if (!user) return;

    let selectedSeed = user.avatarSeed;
    let labSeeds = [];

    const generateSeeds = () => {
        const base = user.nickname || "Hero";
        labSeeds = Array.from({length: 6}, () => `${base}_${Math.floor(Math.random()*99999)}`);
    };

    const render = () => {
        mount.innerHTML = `
        <div class="settings-page animate-in">
            <!-- HEADER -->
            <div class="lab-header-row">
                <button class="manya-back-btn" onclick="ViewManager.show('profile')">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <h2 style="font-weight:900; margin:0;">Hero Lab</h2>
            </div>

            <!-- NIGHT MODE TOGGLE -->
            <div class="lab-toggle-pill">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:20px;">${user.theme === 'dark' ? '🌕' : '🌑'}</span>
                    <span style="font-weight:900; font-size:14px;">Night Mode</span>
                </div>
                <div class="manya-switch" id="theme-trigger"></div>
            </div>

            <!-- THE DNA VAULT -->
            <div class="dna-vault">
                <span class="vault-label">DNA SEQUENCE</span>
                <div class="lab-grid">
                    ${labSeeds.map(seed => `
                        <div class="lab-avatar-item ${selectedSeed === seed ? 'active' : ''}" onclick="window.selectLabDNA('${seed}')">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}" style="width:100%">
                        </div>
                    `).join('')}
                </div>
                <button class="btn-lab-shuffle" style="width:100%; margin-top:20px; border:none; background:transparent; color:#818CF8; font-weight:900; font-size:11px; cursor:pointer;" onclick="window.shuffleLabDNA()">
                   🔄 GENERATE NEW SEQUENCES
                </button>
            </div>

            <!-- IDENTITY MATRIX (FIELDS) -->
            <div class="identity-matrix-grid">
                <div class="lab-field">
                    <label class="field-label">Real Name</label>
                    <input type="text" id="lab-fullname" class="lab-input-elite" value="${user.fullName || ''}" placeholder="E.g. Musa Okello">
                </div>

                <div class="lab-field">
                    <label class="field-label">Hero Nickname</label>
                    <input type="text" id="lab-nickname" class="lab-input-elite" value="${user.nickname || ''}" placeholder="E.g. BrainStorm">
                </div>

                <div class="lab-field">
                    <label class="field-label">Hero Specialty</label>
                    <select id="lab-subject" class="lab-input-elite">
                        <option value="Mathematics" ${user.preferences?.likes?.includes('Math') ? 'selected' : ''}>Mathematics</option>
                        <option value="Science" ${user.preferences?.likes?.includes('Science') ? 'selected' : ''}>Science</option>
                        <option value="SST" ${user.preferences?.likes?.includes('SST') ? 'selected' : ''}>SST</option>
                        <option value="English" ${user.preferences?.likes?.includes('English') ? 'selected' : ''}>English</option>
                    </select>
                </div>

                <div class="lab-field">
                    <label class="field-label">Battle Cry (Hero Motto)</label>
                    <input type="text" id="lab-motto" class="lab-input-elite" value="${user.motto || ''}" placeholder="E.g. First Grade or Nothing!">
                </div>
            </div>

            <div style="height:40px"></div>

            <button class="btn-commit-identity" onclick="window.saveHeroChanges()">
                Commit Identity
            </button>
        </div>`;

        // Direct binding for the Switch
        document.getElementById('theme-trigger').onclick = async () => {
            const newTheme = await ThemeEngine.toggle();
            user.theme = newTheme;
            ManyaNotify.show(`Matrix Theme: ${newTheme.toUpperCase()}`, "success");
            render();
        };
    };

    // --- GLOBAL ACTIONS ---
    window.selectLabDNA = (seed) => { selectedSeed = seed; render(); };
    window.shuffleLabDNA = () => { generateSeeds(); render(); };
    window.saveHeroChanges = async () => {
        user.fullName = document.getElementById('lab-fullname').value;
        user.nickname = document.getElementById('lab-nickname').value;
        user.motto = document.getElementById('lab-motto').value;
        user.avatarSeed = selectedSeed;

        await ManyaDB.saveUser(user);
        ManyaNotify.show("Identity Stabilized!", "success");
        window.ViewManager.show('profile');
    };

    generateSeeds();
    render();
};