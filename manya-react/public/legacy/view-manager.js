import { renderHome } from './views/home-view.js';
import { renderSpiral } from './views/spiral-view.js';
import { renderLibrary } from './views/library-view.js';
import { renderRankings } from './views/rankings-view.js';
import { renderProfile } from './views/profile-view.js';
import { renderOnboarding } from './views/onboarding-view.js';
import { renderAchievements } from './views/achievements-view.js';
import { renderMembership } from './views/membership-view.js';
import { renderSettings } from './views/settings-view.js';
import { HUDManager } from './js/hud-manager.js';
import { ManyaDB } from './manya-db.js';
import { renderQuestPath } from './views/quest-path-view.js';


export const ViewManager = {
    mount: null,
    currentView: 'home',

    async init() {
        window.ViewManager = this; 
        this.mount = document.getElementById('view-mount');
        const user = await ManyaDB.getCurrentUser();
        if (!user || !user.onboarded) {
            this.show('onboarding');
        } else {
            this.show('home');
        }
    },

    async show(viewName, navEl = null, params = null) {
        // 1. CLEANUP PREVIOUS ENGINE (Stops intervals)
        if (typeof cleanupSpiral === 'function') cleanupSpiral();
        
        this.currentView = viewName;

        // 2. LAYOUT MODES
        document.body.classList.remove('onboarding-active', 'in-spiral', 'view-has-own-hud');
        if (viewName === 'onboarding') document.body.classList.add('onboarding-active');
        if (viewName === 'spiral' || viewName === 'questPath') document.body.classList.add('in-spiral');

        const customHudViews = ['spiral', 'onboarding', 'settings', 'membership', 'achievements', 'questPath'];
        if (customHudViews.includes(viewName)) document.body.classList.add('view-has-own-hud');

        // 3. NAV BAR UPDATE
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            const label = item.querySelector('span')?.innerText.toLowerCase();
            if (label === viewName) item.classList.add('active');
        });

        // 4. RENDER VIEW
        this.mount.innerHTML = '';
        switch (viewName) {
            case 'home': await renderHome(this.mount); break;
            case 'spiral': await renderSpiral(this.mount, params); break;
            case 'questPath': await renderQuestPath(this.mount, params); break;
            case 'library': await renderLibrary(this.mount); break;
            case 'rankings': await renderRankings(this.mount); break;
            case 'profile': await renderProfile(this.mount); break;
            case 'onboarding': renderOnboarding(this.mount); break;
            case 'achievements': await renderAchievements(this.mount); break; 
            case 'membership': await renderMembership(this.mount); break;
            case 'settings': await renderSettings(this.mount); break;
            default: await renderHome(this.mount);
        }

        // 5. UPDATE GLOBAL HUD
        await HUDManager.render(params);
        window.scrollTo(0, 0);
    },

    goBack() {
        if (this.currentView === 'questPath') {
            this.show('spiral', null, localStorage.getItem('last_sub') || 'math');
        } else {
            this.show('home');
        }
    }
};
window.ViewManager = ViewManager;