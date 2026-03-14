import { renderHome } from './views/home-view.js';
import { renderSpiral } from './views/spiral-view.js';
import { renderLibrary } from './views/library-view.js';
import { renderRankings } from './views/rankings-view.js';
import { renderProfile } from './views/profile-view.js';
import { renderOnboarding } from './views/onboarding-view.js';
import { renderAchievements } from './views/achievements-view.js';
import { renderMembership } from './views/membership-view.js';
import { renderSettings } from './views/settings-view.js';
import { ManyaDB } from './manya-db.js';

export const ViewManager = {
    mount: null,
    currentView: 'home',

    async init() {
        window.ViewManager = this; // SET GLOBAL REFERENCE FIRST
        this.mount = document.getElementById('view-mount');
        
        const user = await ManyaDB.getCurrentUser();

        if (!user || !user.onboarded) {
            this.show('onboarding');
        } else {
            if(window.refreshManyaHUD) await window.refreshManyaHUD();
            this.show('home');
        }
    },

    show(viewName, navEl = null, params = null) {
        window.ViewManager = this; // Ensure reference exists
        this.currentView = viewName;

        // Reset Modes
        document.body.classList.remove('onboarding-active', 'in-spiral');

        if (viewName === 'onboarding') {
            document.body.classList.add('onboarding-active');
        } else if (viewName === 'spiral') {
            document.body.classList.add('in-spiral');
        }

        // Highlights Nav bar
        if (navEl) {
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            navEl.classList.add('active');
        }

        this.mount.innerHTML = '';

        switch (viewName) {
            case 'home': renderHome(this.mount); break;
            case 'spiral': renderSpiral(this.mount, params); break;
            case 'library': renderLibrary(this.mount); break;
            case 'rankings': renderRankings(this.mount); break;
            case 'profile': renderProfile(this.mount); break;
            case 'onboarding': renderOnboarding(this.mount); break;
            case 'achievements': renderAchievements(this.mount); break; 
            case 'membership': renderMembership(this.mount); break;
            case 'settings': renderSettings(this.mount); break;
            default: renderHome(this.mount);
        }
        window.scrollTo(0, 0);
    }
};

window.ViewManager = ViewManager; // SET GLOBAL REFERENCE FOR EXPORT