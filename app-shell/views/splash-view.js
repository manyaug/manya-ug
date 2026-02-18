/**
 * MANYA SPLASH VIEW (Repaired & Upgraded)
 * Featuring the interactive blinking mascot and brand reveal.
 */

export const renderSplash = (mount, onComplete) => {
    mount.innerHTML = `
        <div id="manya-splash" class="splash-stage">
            <div class="splash-content">
                <!-- THE BLINKING MASCOT -->
                <div class="mascot-portal">
                    <video 
                        id="splash-video" 
                        class="mascot-video" 
                        autoplay 
                        muted 
                        loop 
                        playsinline
                    >
                        <!-- Ensure your video is saved as assets/shared/mascot_blink.mp4 -->
                        <source src="assets/shared/videos/mascot_blink.mp4" type="video/mp4">
                    </video>
                </div>

                <!-- BRANDING REVEAL -->
                <div class="brand-box">
                    <h1 class="brand-name">Manya Prep Hub</h1>
                    <div class="loading-bar">
                        <div class="loading-progress"></div>
                    </div>
                    <p class="brand-tagline">Uganda's Elite PLE Prep</p>
                </div>
            </div>
        </div>
    `;

    // Sequence: Wait for loading animation, then fade out
    setTimeout(() => {
        const splash = document.getElementById('manya-splash');
        if (splash) {
            splash.style.opacity = '0';
            splash.style.transform = 'scale(1.1)';
            
            // Clean up and proceed to Hub after fade finishes
            setTimeout(() => {
                onComplete(); 
            }, 800);
        }
    }, 3500); // Display for 3.5 seconds
};