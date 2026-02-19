/**
 * MANYA VIEW MANAGER
 * The central controller for navigating between the Hub, Spirals, and Library.
 */

import { renderHome } from './views/home-view.js';
import { renderSpiral } from './views/spiral-view.js';
import { renderLibrary } from './views/library-view.js';
import { renderRankings } from './views/rankings-view.js';
import { renderProfile } from './views/profile-view.js';

// Import Audio Service (Make sure you created services/audio-manager.js)
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

        // 2. Just show the home hub. 
        // The index.html script will handle fading the splash overlay on top of this.
        this.show('home');
        console.log("Manya: ViewManager Ready.");
    },

    /**
     * Primary Navigation Function
     */
   show(viewName, navEl = null, params = null) {
    this.currentView = viewName;

    // FULLSCREEN TOGGLE
    if (viewName === 'spiral') {
        document.body.classList.add('fullscreen-mode');
        // No error anymore because we added playAmbient back
        AudioManager.playAmbient(); 
    } else {
        document.body.classList.remove('fullscreen-mode');
        // No error anymore because we added stopAmbient back
        AudioManager.stopAmbient(); 
    }

    // Standard Nav Highlight
    if (navEl && viewName !== 'spiral') {
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
    }

    window.scrollTo(0, 0);
},

    /**
     * SMART BACK LOGIC
     * Handles the back button click contextually
     */
    goBack() {
        // A. If inside a Quest (Engine Mode), return to the specific chapter map
        if (this.mount.classList.contains('engine-mode')) {
            this.mount.classList.remove('engine-mode');
            this.show('spiral', null, localStorage.getItem('last_subject') || 'science');
            return;
        }

        // B. If in the Spiral/Library, return to the Home Hub
        if (this.currentView !== 'home') {
            // Find the Home Nav Item to reset the bottom dock highlight
            const homeNav = document.querySelector('.nav-item:first-child');
            this.show('home', homeNav);
        }
    }
};