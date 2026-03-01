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

    // --- MANYA ICON (SVG Data) ---

const profile = { 
        fullName: "", nickname: "", avatarId: avatarList[0].id, school: "", 
        parentName: "", parentWhatsApp: "", parentEmail: "", likes: [], hates: [] 
    };

    const render = () => {
        mount.innerHTML = `
            <div class="ob-stage animate-in">
                <div class="ob-nav">
                    <span class="progress-label">Journey Progress</span>
                    <div class="ob-progress-track"><div class="fill" id="p-bar"></div></div>
                </div>

                <div class="ob-chat">
                    <div class="manya-card-bubble">
                        <img src="assets/icons/manya_icon.png" class="manya-head-icon">
                        <h2 id="ob-question">Waddle! Let's build your profile.</h2>
                    </div>
                </div>

                <!-- Grouping inputs for a tighter center look -->
                <div id="ob-input-mount" class="ob-inputs animate-up"></div>

                <div class="ob-footer">
                    <button id="ob-next-btn" class="manya-btn-primary">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                </div>
            </div>`;
        
        document.getElementById('ob-next-btn').onclick = handleNext;
        updateStep();
    };

    const updateStep = () => {
        const iMount = document.getElementById('ob-input-mount');
        const qText = document.getElementById('ob-question');
        const pBar = document.getElementById('p-bar');
        const nextBtn = document.getElementById('ob-next-btn');
        
        pBar.style.width = `${(currentStep / 5) * 100}%`;

        if (currentStep === 1) {
            qText.innerText = "What is your full name and hero nickname?";
            iMount.innerHTML = `
                <input type="text" id="fn" class="elite-input" placeholder="Your Full Name" value="${profile.fullName}">
                <input type="text" id="nn" class="elite-input" placeholder="Hero Nickname" value="${profile.nickname}">
            `;
        } 
        else if (currentStep === 2) {
            qText.innerText = "Choose your 3D Hero Companion!";
            const hero = avatarList[currentAvatarIdx];
            iMount.innerHTML = `
                <div class="avatar-3d-stage">
                    <model-viewer id="hero-viewer" src="assets/shared/models/${hero.file}" autoplay shadow-intensity="1" camera-orbit="0deg 75deg 105%" disable-zoom style="width: 100%; height: 300px;"></model-viewer>
                    <div class="avatar-selector-hud">
                        <button class="nav-arrow" id="btn-prev">◀</button>
                        <div style="text-align:center; flex:1">
                            <div class="hero-name-tag">${hero.name}</div>
                            <div class="hero-trait-tag">${hero.trait}</div>
                        </div>
                        <button class="nav-arrow" id="btn-next">▶</button>
                    </div>
                </div>`;
            document.getElementById('btn-prev').onclick = () => cycleHero(-1);
            document.getElementById('btn-next').onclick = () => cycleHero(1);
        }
        else if (currentStep === 3) {
            qText.innerText = "Which Primary School do you attend?";
            iMount.innerHTML = `<input type="text" id="sch" class="elite-input" placeholder="Primary School Name" value="${profile.school}">`;
        }
        else if (currentStep === 4) {
            qText.innerText = "What are your Super Powers and Monsters?";
            const subs = ['Math', 'Science', 'SST', 'English'];
            iMount.innerHTML = `
                <div class="progress-label" style="color: #16A34A">I LOVE... ❤️</div>
                <div class="chip-box">${subs.map(s => `<button class="sub-chip ${profile.likes.includes(s)?'active-love':''}" onclick="window.toggleOnboardingPref('likes','${s}',this)">${s}</button>`).join('')}</div>
                <div class="progress-label" style="margin-top:15px; color: #DC2626">I WANT TO BEAT... ⚔️</div>
                <div class="chip-box">${subs.map(s => `<button class="sub-chip ${profile.hates.includes(s)?'active-hate':''}" onclick="window.toggleOnboardingPref('hates','${s}',this)">${s}</button>`).join('')}</div>
            `;
        }
        else if (currentStep === 5) {
            qText.innerText = "Almost done! Enter Parent Info:";
            iMount.innerHTML = `
                <input type="text" id="pn" class="elite-input" placeholder="Parent's Name" value="${profile.parentName}">
                <input type="tel" id="pwa" class="elite-input" placeholder="WhatsApp Number" value="${profile.parentWhatsApp}">
                <input type="email" id="pem" class="elite-input" placeholder="Parent's Email" value="${profile.parentEmail}">
            `;
            nextBtn.classList.add('finish');
            nextBtn.innerText = "START ADVENTURE →";
        }
    };

    const cycleHero = (dir) => {
        currentAvatarIdx = (currentAvatarIdx + dir + avatarList.length) % avatarList.length;
        profile.avatarId = avatarList[currentAvatarIdx].id;
        updateStep();
    };

    const handleNext = () => {
        if (currentStep === 1) { profile.fullName = document.getElementById('fn').value; profile.nickname = document.getElementById('nn').value; }
        if (currentStep === 3) profile.school = document.getElementById('sch').value;
        if (currentStep === 5) {
            profile.parentName = document.getElementById('pn').value;
            profile.parentWhatsApp = document.getElementById('pwa').value;
            profile.parentEmail = document.getElementById('pem').value;
        }

        if (currentStep < 5) { currentStep++; updateStep(); } 
        else { localStorage.setItem('manya_user_profile', JSON.stringify(profile)); window.ViewManager.init(); }
    };

    window.toggleOnboardingPref = (list, sub, el) => {
        const idx = profile[list].indexOf(sub);
        if (idx > -1) { 
            profile[list].splice(idx, 1); 
            el.classList.remove(list==='likes'?'active-love':'active-hate'); 
        } else { 
            profile[list].push(sub); 
            el.classList.add(list==='likes'?'active-love':'active-hate'); 
        }
    };

    render();
};