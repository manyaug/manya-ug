import { ManyaDB } from '../manya-db.js';
import { ManyaNotify } from '/app-shell/views/manya-notify.js';



export const renderOnboarding = (mount) => {
    let currentStep = 1;
    let avatarOptions = [];
    const profile = ManyaDB.createDefaultRecord();

    const generateSeeds = () => {
        const base = profile.nickname || "Hero";
        avatarOptions = Array.from({length: 6}, () => `${base}_${Math.floor(Math.random()*99999)}`);
        if(!profile.avatarSeed || profile.avatarSeed === "Manya") profile.avatarSeed = avatarOptions[0];
    };

    const updateStep = () => {
        const iMount = document.getElementById('ob-input-mount');
        const qText = document.getElementById('ob-question');
        const pFill = document.getElementById('p-fill');
        const nextBtn = document.getElementById('ob-next-btn');
        const stepLabel = document.getElementById('ob-step-label');
        
        if (!iMount) return;

        pFill.style.width = `${(currentStep / 5) * 100}%`;
        stepLabel.innerText = `PHASE ${currentStep} OF 5`;

        if (currentStep === 1) {
            qText.innerText = "What is your Target PLE Aggregate?";
            iMount.innerHTML = `
                <div class="ob-goal-card ${profile.goal === 'Agg 4-8' ? 'active' : ''}" onclick="window.setObGoal('Agg 4-8')">
                    <div class="goal-icon">🏆</div>
                    <div class="goal-text"><h4>Elite Scholar</h4><p>Targeting Aggregate 4 - 8</p></div>
                </div>
                <div class="ob-goal-card ${profile.goal === 'Agg 9-12' ? 'active' : ''}" onclick="window.setObGoal('Agg 9-12')">
                    <div class="goal-icon">⭐</div>
                    <div class="goal-text"><h4>Solid Success</h4><p>Targeting Aggregate 9 - 12</p></div>
                </div>`;
        } 
        else if (currentStep === 2) {
            qText.innerText = "What shall we call you, Hero?";
            iMount.innerHTML = `
                <div class="input-wrapper-elite">
                    <input type="text" id="ob-nn" class="elite-input-ob" placeholder="Hero Nickname" value="${profile.nickname}">
                </div>
                <div class="input-wrapper-elite">
                    <input type="text" id="ob-sch" class="elite-input-ob" placeholder="Primary School Name" value="${profile.school}">
                </div>`;
        }
        else if (currentStep === 3) {
            qText.innerText = "Which subjects are your Superpowers?";
            const subs = ['Math', 'Science', 'SST', 'English'];
            iMount.innerHTML = `<div class="chip-box">${subs.map(s => `<button class="sub-chip ${profile.preferences.likes.includes(s)?'active-love':''}" onclick="window.toggleObPref('${s}')">${s}</button>`).join('')}</div>`;
        }
        else if (currentStep === 4) {
            qText.innerText = "Select your Hero DNA Sequence";
            if(avatarOptions.length === 0) generateSeeds();
            iMount.innerHTML = `
                <div class="ob-avatar-lab">
                    <div class="lab-grid-ob">
                        ${avatarOptions.map(seed => `
                            <div class="lab-item-ob ${profile.avatarSeed === seed ? 'active' : ''}" onclick="window.setObAvatar('${seed}')">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}" style="width:100%">
                            </div>`).join('')}
                    </div>
                    <button class="btn-lab-shuffle" onclick="window.shuffleObDNA()">🔄 SHUFFLE DNA</button>
                </div>`;
        }
        else if (currentStep === 5) {
            qText.innerText = "Final Step: Connect your Guardian";
            iMount.innerHTML = `
                <div class="input-wrapper-elite">
                    <input type="text" id="ob-pn" class="elite-input-ob" placeholder="Guardian's Name" value="${profile.parent.name || ''}">
                </div>
                <div class="input-wrapper-elite">
                    <input type="tel" id="ob-pwa" class="elite-input-ob" placeholder="WhatsApp Number (07...)" value="${profile.parent.whatsapp || ''}">
                </div>`;
            nextBtn.classList.add('finish');
            nextBtn.innerHTML = "BEGIN ADVENTURE →";
        }
    };

    window.setObGoal = (g) => { profile.goal = g; updateStep(); };
    window.toggleObPref = (s) => {
        const idx = profile.preferences.likes.indexOf(s);
        if (idx > -1) profile.preferences.likes.splice(idx, 1);
        else profile.preferences.likes.push(s);
        updateStep();
    };
    window.setObAvatar = (s) => { profile.avatarSeed = s; updateStep(); };
    window.shuffleObDNA = () => { generateSeeds(); updateStep(); };

    const handleNext = async () => {
        if (currentStep === 2) {
            const nn = document.getElementById('ob-nn').value;
            if(!nn || nn.length < 2) return ManyaNotify.show("Enter a Hero name!", "error");
            profile.nickname = nn;
            profile.school = document.getElementById('ob-sch').value;
            generateSeeds();
        }

        if (currentStep === 5) {
            const pn = document.getElementById('ob-pn').value;
            const pwa = document.getElementById('ob-pwa').value;
            if(!pn || !pwa) return ManyaNotify.show("Guardian info required!", "error");
            
            profile.parent.name = pn;
            profile.parent.whatsapp = pwa;
            profile.onboarded = true;

            ManyaNotify.show("Securing Profile...", "info");

            const success = await ManyaDB.saveUser(profile);
            
            if (success) {
                ManyaNotify.show("Welcome, Hero!", "success");
                // Use a slight delay and a more robust way to find the ViewManager
                setTimeout(() => {
                    if (window.ViewManager) {
                        window.ViewManager.init(); 
                    } else {
                        window.location.reload(); // Hard fallback
                    }
                }, 500);
            }
            return;
        }

        currentStep++;
        updateStep();
    };

    mount.innerHTML = `
        <div class="ob-stage animate-in">
            <div class="ob-nav">
                <span class="ob-step-indicator" id="ob-step-label">PHASE 1 OF 5</span>
                <div class="ob-progress-track"><div class="ob-progress-fill" id="p-fill"></div></div>
            </div>
            <div class="ob-chat">
                <div class="manya-bubble-ob">
                    <img src="assets/icons/manya_icon.png">
                    <h2 id="ob-question">Waddle!</h2>
                </div>
            </div>
            <div id="ob-input-mount" class="ob-inputs animate-up"></div>
            <div class="ob-footer">
                <button id="ob-next-btn" class="manya-btn-primary-ob">▶</button>
            </div>
        </div>`;

    document.getElementById('ob-next-btn').onclick = handleNext;
    updateStep();
};