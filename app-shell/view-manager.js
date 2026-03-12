/**
 * MANYA VIEW MANAGER - Repaired v4.2
 */
import { renderHome } from './views/home-view.js';
import { renderSpiral } from './views/spiral-view.js';
import { renderLibrary } from './views/library-view.js';
import { renderRankings } from './views/rankings-view.js';
import { renderProfile } from './views/profile-view.js';
import { renderOnboarding } from './views/onboarding-view.js';
import { renderAchievements } from './views/achievements-view.js';
import { renderMembership } from './views/membership-view.js';
import { renderSettings } from './views/settings-view.js';
import { ManyaNotify } from './views/manya-notify.js';
import { AudioManager } from './js/audio-manager.js';

export const ViewManager = {
    mount: null,
    currentView: 'home',

    init() {
        this.mount = document.getElementById('view-mount');
        window.ViewManager = this;
        if (window.AudioManager?.init) window.AudioManager.init();
        
        // Initial route check
        const session = localStorage.getItem('manya_session_id');
        if (!session) {
            this.show('onboarding');
        } else {
            this.show('home');
        }
    },

    show(viewName, navEl = null, params = null) {
    this.currentView = viewName;

    // 1. HUD TOGGLE: Add/Remove the takeover class
    if (viewName === 'spiral') {
        document.body.classList.add('in-spiral');
    } else {
        document.body.classList.remove('in-spiral');
    }

        // 2. UPDATE BOTTOM NAV
        if (navEl) {
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            navEl.classList.add('active');
        }

        // 3. RENDER VIEW
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
            case 'notifications': ManyaNotify.show("Hero Alert!", "info"); break;
            default: renderHome(this.mount);
        }

        window.scrollTo(0, 0);
    }
};