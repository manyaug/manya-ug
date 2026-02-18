/**
 * MANYA VIEW MANAGER
 * The central controller for navigating between the Hub, Spirals, and Library.
 */

import { renderHome } from './views/home-view.js';
import { renderSpiral } from './views/spiral-view.js';
import { renderLibrary } from './views/library-view.js';
import { renderRankings } from './views/rankings-view.js';
import { renderProfile } from './views/profile-view.js';
import { renderSplash } from './views/splash-view.js';

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
        
        // 1. ATTACH TO WINDOW: Crucial for making onclick="ViewManager.show()" work in HTML
        window.ViewManager = this; 


        // 1. Repair: Start with Splash instead of Home
        renderSplash(this.mount, () => {
            // 2. When splash finishes (onComplete), show Home Hub
            this.show('home');
        });

   

        // 2. INIT AUDIO: Setup forest ambiance tracks
        if (AudioManager && AudioManager.init) {
            AudioManager.init();
        }

        this.show('home');
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