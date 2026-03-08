/**
 * MANYA VIEW MANAGER
 * The central controller for navigating between the Hub, Spirals, and Library.
 * Now includes the Onboarding Gate for new students.
 */

import { renderHome } from './views/home-view.js';
import { renderSpiral } from './views/spiral-view.js';
import { renderLibrary } from './views/library-view.js';
import { renderRankings } from './views/rankings-view.js'; // Check this file
import { renderProfile } from './views/profile-view.js';
import { renderOnboarding } from './views/onboarding-view.js';
import { renderAchievements } from './views/achievements-view.js'; // Add this line
import { renderMembership } from './views/membership-view.js';
import { renderSettings } from './views/settings-view.js'; // Import ManyaNotify for notifications
import { ManyaNotify } from './views/manya-notify.js'; // Import ManyaNotify for notifications
// Inside switch(viewName)


// Import Audio Service
import { AudioManager } from '../app-shell/js/audio-manager.js';

export const ViewManager = {
    mount: null,
    currentView: 'home',

    /**
     * Start the engine
     */
    init() {
        this.mount = document.getElementById('view-mount');
        window.ViewManager = this;

        // 1. Initialize Audio
        if (window.AudioManager && window.AudioManager.init) {
            window.AudioManager.init();
        }

        // 2. THE ONBOARDING GATE
        // Check if the student has a profile. If not, send to onboarding.
        const userProfile = localStorage.getItem('manya_user_profile');
        
        if (!userProfile) {
            console.log("Manya: New student detected. Redirecting to Onboarding...");
            this.show('onboarding');
        } else {
            console.log("Manya: Returning student. Opening Hub...");
            this.show('home');
        }
    },

    /**
     * Primary Navigation Function
     */
    show(viewName, navEl = null, params = null) {
        this.currentView = viewName;

        // 1. FULLSCREEN & AUDIO CONTROL
        // Both Spiral and Onboarding need a clean, edge-to-edge screen
        if (viewName === 'spiral' || viewName === 'onboarding') {
            document.body.classList.add('fullscreen-mode');
            
            // Only play forest birds in the spiral
            if (viewName === 'spiral') {
                AudioManager.playAmbient(); 
            } else {
                AudioManager.stopAmbient();
            }
        } else {
            // Reveal global header/nav for Home, Library, Profile, Rankings
            document.body.classList.remove('fullscreen-mode');
            AudioManager.stopAmbient(); 
        }

        // 2. UPDATE BOTTOM NAV ACTIVE STATE
        if (navEl && viewName !== 'spiral' && viewName !== 'onboarding') {
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
            case 'notifications': ManyaNotify.show("This is a notification!", "info"); break;
            default: renderHome(this.mount);
        }

        window.scrollTo(0, 0);
    },

    /**
     * SMART BACK LOGIC
     */
    goBack() {
        // A. If inside a Quest (Engine Mode), return to the subject map
        if (this.mount.classList.contains('engine-mode')) {
            this.mount.classList.remove('engine-mode');
            this.show('spiral', null, localStorage.getItem('last_sub') || 'math');
            return;
        }

        // B. If in any sub-view, return to the Home Hub
        if (this.currentView !== 'home' && this.currentView !== 'onboarding') {
            const homeNav = document.querySelector('.nav-item:first-child');
            this.show('home', homeNav);
        }
    }

    
};

// Logic to handle Locking/Scrolling per view
const updateScrollLock = (viewName) => {
    const mount = document.getElementById('view-mount');
    if (viewName === 'home') {
        mount.style.overflowY = 'hidden'; // Lock Home Page
    } else {
        mount.style.overflowY = 'auto';   // Allow scrolling for others
    }
    mount.scrollTop = 0; // Always start at the top
};