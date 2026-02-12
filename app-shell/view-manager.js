/**
 * MANYA VIEW MANAGER
 * The central controller for navigating between the Hub, Spirals, and Library.
 */

import { renderHome } from './views/home-view.js';
import { renderSpiral } from './views/spiral-view.js';
import { renderLibrary } from './views/library-view.js';
import { renderRankings } from './views/rankings-view.js';
import { renderProfile } from './views/profile-view.js';

export const ViewManager = {
    mount: null,
    currentView: 'home',

    /**
     * Start the engine
     */
    init() {
        this.mount = document.getElementById('view-mount');
        this.show('home');
    },

    /**
     * Primary Navigation Function
     * @param {string} viewName - Name of the view to load
     * @param {HTMLElement} navEl - The nav item clicked (to update active state)
     * @param {any} params - Extra data (like 'math' for the spiral)
     */
    show(viewName, navEl = null, params = null) {
        this.currentView = viewName;

        // 1. UPDATE HEADER NAVIGATION (Menu vs Back Arrow)
        const backBtn = document.getElementById('back-btn');
        const menuBtn = document.getElementById('menu-btn');
        const titleEl = document.getElementById('app-title');

        if (viewName === 'home') {
            backBtn?.classList.add('hidden');
            menuBtn?.classList.remove('hidden');
            if (titleEl) titleEl.innerText = "Manya Prep Hub";
        } else {
            backBtn?.classList.remove('hidden');
            menuBtn?.classList.add('hidden');
        }

        // 2. UPDATE BOTTOM NAV ACTIVE STATE
        if (navEl) {
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            navEl.classList.add('active');
        }

        // 3. ENGINE CLEANUP
        // Always remove engine-mode when switching views to prevent scroll locking
        this.mount.classList.remove('engine-mode');
        this.mount.innerHTML = '';

        // 4. RENDER THE REQUESTED VIEW
        switch (viewName) {
            case 'home':
                renderHome(this.mount);
                break;
            case 'spiral':
                // params = the subject string ('math', 'science', etc)
                renderSpiral(this.mount, params);
                break;
            case 'library':
                renderLibrary(this.mount);
                break;
            case 'rankings':
                renderRankings(this.mount);
                break;
            case 'profile':
                renderProfile(this.mount);
                break;
            default:
                console.error("View not found:", viewName);
                renderHome(this.mount);
        }

        // 5. UX: Scroll to top on page change
        window.scrollTo(0, 0);
    },

    /**
     * SMART BACK LOGIC
     * Handles the back button click contextually
     */
    goBack() {
        // A. If we are currently inside a Quest/Sim (Engine Mode is active)
        if (this.mount.classList.contains('engine-mode')) {
            this.mount.classList.remove('engine-mode');
            // If the user came from the Library, take them back there
            this.show('library');
            return;
        }

        // B. If we are in the Spiral, Library, or Profile
        if (this.currentView !== 'home') {
            this.show('home');
            // Reset the bottom nav highlight to Home
            const homeNav = document.querySelector('.nav-item:first-child');
            if (homeNav) {
                document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                homeNav.classList.add('active');
            }
        }
    }
};