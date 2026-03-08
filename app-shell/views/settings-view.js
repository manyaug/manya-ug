import { ManyaDB } from '../manya-db.js';
import { ManyaNotify } from './manya-notify.js';

export const renderSettings = async (mount) => {
    let user = await ManyaDB.getCurrentUser();
    if (!user) return;

    let selectedSeed = user.avatarSeed;
    let localSeeds = [];

    // Helper: Generate 6 fresh seeds for the lab grid
    const generateLabSeeds = () => {
        const base = user.nickname || "Hero";
        localSeeds = Array.from({length: 6}, () => `${base}_${Math.floor(Math.random()*99999)}`);
    };

    const render = () => {
        mount.innerHTML = `
        <div class="settings-page animate-in">
            <!-- HEADER -->
            <div class="lab-header-row">
                <button class="manya-back-btn" onclick="window.ViewManager.show('profile')">←</button>
                <div class="lab-title-text">
                    <h2>Hero Lab</h2>
                </div>
            </div>

            <!-- AVATAR SHUFFLE VAULT -->
            <div class="shuffle-vault">
                <span class="vault-label">Hero DNA Sequence</span>
                <div class="lab-grid">
                    ${localSeeds.map(seed => `
                        <div class="lab-item ${selectedSeed === seed ? 'active' : ''}" onclick="window.selectLabAvatar('${seed}')">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}" style="width:90%">
                        </div>
                    `).join('')}
                </div>
                <button class="btn-shuffle-mega" onclick="window.shuffleLabDNA()">
                    🔄 Shuffle DNA
                </button>
            </div>

            <!-- INPUT AREA -->
            <div class="lab-inputs-area">
                <div class="input-block">
                    <label>Hero Nickname</label>
                    <input type="text" id="lab-nickname" class="elite-input-lab" value="${user.nickname || ''}">
                </div>

                <div class="input-block">
                    <label>Primary School</label>
                    <input type="text" id="lab-school" class="elite-input-lab" value="${user.school || ''}">
                </div>
                
                <div class="input-block">
                    <label>Guardian Contact</label>
                    <input type="text" id="lab-pname" class="elite-input-lab" value="${user.parent?.name || ''}">
                </div>
            </div>

            <button class="btn-save-identity" onclick="window.commitHeroIdentity()">
                Save Hero Identity
            </button>
        </div>
        `;
    };

    // --- WINDOW FUNCTIONS ---
    window.selectLabAvatar = (seed) => {
        selectedSeed = seed;
        render();
    };

    window.shuffleLabDNA = () => {
        generateLabSeeds();
        render();
    };

    window.commitHeroIdentity = async () => {
        const newNickname = document.getElementById('lab-nickname').value;
        const newSchool = document.getElementById('lab-school').value;
        const newParent = document.getElementById('lab-pname').value;

        if (!newNickname) {
            ManyaNotify.show("Hero needs a name!", "error");
            return;
        }

        user.nickname = newNickname;
        user.school = newSchool;
        user.parent = user.parent || {};
        user.parent.name = newParent;
        user.avatarSeed = selectedSeed;

        await ManyaDB.saveUser(user);
        
        ManyaNotify.show("Identity Secure! Profile Updated.", "success");
        window.ViewManager.show('profile');
    };

    // Initial load
    generateLabSeeds();
    render();
};