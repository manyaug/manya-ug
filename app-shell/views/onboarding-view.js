/**
 * MANYA ONBOARDING VIEW (v7.0)
 * Fixed: Button visibility, 3D selection logic, and animations.
 */
export const renderOnboarding = (mount) => {
    let currentStep = 1;
    let currentAvatarIdx = 0;

   const avatarList = [
    { id: "barbarian", name: "Barbarian", file: "Barbarian.glb", trait: "Brute Strength" },
    { id: "knight", name: "Knight", file: "Knight.glb", trait: "Iron Defender" },
    { id: "mage", name: "Mage", file: "Mage.glb", trait: "Arcane Master" },
    { id: "ranger", name: "Ranger", file: "Ranger.glb", trait: "Forest Archer" },
    { id: "rogue", name: "Rogue", file: "Rogue.glb", trait: "Silent Assassin" },

    { id: "skeleton_mage", name: "Skeleton Mage", file: "Skeleton_Mage.glb", trait: "Undead Sorcerer" },
    { id: "skeleton_minion", name: "Skeleton Minion", file: "Skeleton_Minion.glb", trait: "Undead Servant" },
    { id: "skeleton_rogue", name: "Skeleton Rogue", file: "Skeleton_Rogue.glb", trait: "Cursed Shadow" },
    { id: "skeleton_warrior", name: "Skeleton Warrior", file: "Skeleton_Warrior.glb", trait: "Bone Fighter" }
];

 
    const profile = {
        fullName: "", nickname: "", 
        avatarId: avatarList[0].id, 
        avatarName: avatarList[0].name,
        school: "", parentWhatsApp: ""
    };

    const render = () => {
        mount.innerHTML = `
            <div class="ob-stage">
                <!-- 1. HUD PROGRESS -->
                <div class="ob-nav">
                    <div class="ob-progress-track"><div class="fill" id="p-bar" style="width: 20%"></div></div>
                </div>

                <!-- 2. MANYA NARRATIVE -->
                <div class="ob-chat">
                    <div class="avatar-glow"><img src="assets/icons/manya_icon.png" class="floating"></div>
                    <h2 id="ob-question">Waddle! Welcome to the Hub.</h2>
                </div>

                <!-- 3. DYNAMIC CONTENT MOUNT -->
                <div id="ob-input-mount" class="ob-inputs animate-up"></div>

                <!-- 4. FIXED FOOTER -->
                <div class="ob-footer">
                    <button id="ob-next-btn" class="manya-btn-primary">CONTINUE</button>
                </div>
            </div>
        `;
        
        document.getElementById('ob-next-btn').onclick = handleStepForward;
        updateStep();
    };

    const updateStep = () => {
        const iMount = document.getElementById('ob-input-mount');
        const qText = document.getElementById('ob-question');
        const pBar = document.getElementById('p-bar');
        const nextBtn = document.getElementById('ob-next-btn');
        
        pBar.style.width = `${(currentStep / 5) * 100}%`;

        if (currentStep === 1) {
            qText.innerText = "What is your full name and your hero nickname?";
            iMount.innerHTML = `
                <input type="text" id="fn" class="elite-input" placeholder="Full Name" value="${profile.fullName}">
                <input type="text" id="nn" class="elite-input" placeholder="Nickname" value="${profile.nickname}">
            `;
        } 
        else if (currentStep === 2) {
            qText.innerText = "Choose your 3D Hero Companion!";
            const hero = avatarList[currentAvatarIdx];
            iMount.innerHTML = `
                <div class="avatar-3d-stage">
                    <model-viewer 
                        id="hero-viewer"
                        src="assets/shared/models/${hero.file}"
                        autoplay
                        shadow-intensity="1"
                        environment-image="neutral"
                        exposure="1.2"
                        camera-orbit="0deg 75deg 105%"
                        disable-zoom
                        style="width: 100%; height: 320px;">
                    </model-viewer>
                    
                    <div class="avatar-selector-hud">
                        <button class="nav-arrow" id="btn-prev">◀</button>
                        <div class="hero-info-stack">
                            <div class="hero-name-tag" id="h-name">${hero.name}</div>
                            <div class="hero-trait-tag" id="h-trait">${hero.trait}</div>
                        </div>
                        <button class="nav-arrow" id="btn-next">▶</button>
                    </div>
                </div>
            `;
            // Attach event listeners directly to prevent arrow failure
            document.getElementById('btn-prev').onclick = () => cycleHero(-1);
            document.getElementById('btn-next').onclick = () => cycleHero(1);
        }
        else if (currentStep === 3) {
            qText.innerText = "Represent your school! What is your school's name?";
            iMount.innerHTML = `<input type="text" id="sch" class="elite-input" placeholder="School Name" value="${profile.school}">`;
        }
        else if (currentStep === 4) {
            qText.innerText = "What are your Super Powers and your Monsters?";
            iMount.innerHTML = `<div style="color:white; opacity:0.6;">Select subjects...</div>`;
        }
        else if (currentStep === 5) {
            qText.innerText = "Last step! Enter your Parent's WhatsApp.";
            iMount.innerHTML = `<input type="tel" id="pwa" class="elite-input" placeholder="+256..." value="${profile.parentWhatsApp}">`;
            nextBtn.innerText = "START ADVENTURE";
        }
    };

    const cycleHero = (dir) => {
        currentAvatarIdx = (currentAvatarIdx + dir + avatarList.length) % avatarList.length;
        const hero = avatarList[currentAvatarIdx];
        
        // Update model and text instantly
        const viewer = document.getElementById('hero-viewer');
        const hName = document.getElementById('h-name');
        const hTrait = document.getElementById('h-trait');

        if(viewer) viewer.src = `assets/shared/models/${hero.file}`;
        if(hName) hName.innerText = hero.name;
        if(hTrait) hTrait.innerText = hero.trait;
        
        profile.avatarId = hero.id;
        profile.avatarName = hero.name;

        if (window.AudioManager && window.AudioManager.playSFX) window.AudioManager.playSFX();
    };

    const handleStepForward = () => {
        if (currentStep === 1) {
            profile.fullName = document.getElementById('fn').value;
            profile.nickname = document.getElementById('nn').value;
        }
        if (currentStep === 3) profile.school = document.getElementById('sch').value;
        if (currentStep === 5) profile.parentWhatsApp = document.getElementById('pwa').value;

        if (currentStep < 5) {
            currentStep++;
            updateStep();
        } else {
            localStorage.setItem('manya_user_profile', JSON.stringify(profile));
            window.ViewManager.init();
        }
    };

    render();
};