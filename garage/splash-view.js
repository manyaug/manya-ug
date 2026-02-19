/**
 * MANYA SPLASH VIEW (Repaired & Robust)
 * Featuring the interactive blinking mascot and brand reveal.
 */
export const renderSplash = (mount, onComplete) => {
    // 1. Inject the HTML
    mount.innerHTML = `
        <div id="manya-splash" class="splash-stage">
            <div class="splash-content">
                <div class="mascot-portal">
                    <video id="splash-video" class="mascot-video" autoplay muted loop playsinline>
                        <source src="assets/shared/videos/mascot_blink.mp4" type="video/mp4">
                    </video>
                </div>

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

    const splash = document.getElementById('manya-splash');
    const video = document.getElementById('splash-video');

    // 2. FORCE START LOGIC (The "Safety Net")
    // If after 5 seconds we are still here, force the transition
    const forceStartTimeout = setTimeout(() => {
        console.warn("Manya: Splash took too long, forcing transition.");
        handleTransition();
    }, 5000);

    const handleTransition = () => {
        clearTimeout(forceStartTimeout); // Cancel the safety net
        if (!splash) return;

        splash.style.opacity = '0';
        splash.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            mount.innerHTML = ''; // Clear splash
            onComplete(); // Launch the Home Hub
        }, 800);
    };

    // 3. START THE SEQUENCE
    // Play video and wait 3.5s for the mascot to blink
    video.play().catch(e => console.log("Video waiting for interaction"));
    
    setTimeout(handleTransition, 3500);
};