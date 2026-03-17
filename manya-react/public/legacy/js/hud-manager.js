import { ManyaDB } from '/app-shell/manya-db.js';

export const HUDManager = {
    async render(params = null) {
        const user = await ManyaDB.getCurrentUser();
        const view = window.ViewManager.currentView;
        const hud = document.getElementById('hud-content');
        if (!user || !hud) return;

        // Path to your master gem asset
        const masterGem = 'assets/images/gems/master_gem.svg';

        if (view === 'spiral' || document.getElementById('view-mount').classList.contains('engine-mode')) {
            // --- THEME MODE (Subject Specific) ---
            const color = getComputedStyle(document.documentElement).getPropertyValue('--biome-color').trim() || '#7c3aed';
            const subName = (typeof params === 'string' ? params : 'Lesson').toUpperCase();
            
            hud.style.borderColor = color;
            hud.innerHTML = `
                <button class="uni-back-btn tactile-hud-btn" style="--btn-color: ${color}" onclick="ViewManager.goBack()">
                    <i class="fas fa-arrow-left"></i>
                </button>

                <div class="hud-subject-label">
                    <span class="hud-sub-title">${subName}</span>
                    <span class="hud-sub-mission" style="color:${color}">AGGREGATE 4 MISSION</span>
                </div>

                <div class="hud-pill-diamond" onclick="ViewManager.show('achievements')">
                    <img src="${masterGem}" class="hud-gem-img" onerror="this.style.display='none'">
                    <span class="count">${user.diamonds || 0}</span>
                </div>
            `;
        } else {
            // --- HUB MODE (Standard Global Bar) ---
            hud.style.borderColor = "white";
            hud.innerHTML = `
                <div class="hud-avatar-peek" onclick="ViewManager.show('profile')">
                    <div class="peek-circle">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}">
                    </div>
                </div>

                <div class="hud-logo-wrap">
                    <span class="manya-brand-text">${user.nickname.toUpperCase()}</span>
                    <span class="manya-p7-tag">P.7 HERO</span>
                </div>

                <div class="hud-pill-diamond" onclick="ViewManager.show('achievements')">
                    <img src="${masterGem}" class="hud-gem-img" onerror="this.style.display='none'">
                    <span class="count">${user.diamonds || 0}</span>
                </div>
            `;
        }
    }
};