import { ManyaRouter } from './router.js';

export const QuestRunner = {
    state: { steps: [], index: 0, mount: null, isTyping: false },

    async start(mount, stepsArray) {
        this.state.steps = stepsArray;
        this.state.mount = mount;
        this.state.index = 0;
        this.loadStep();
    },

    // CRITICAL: Kills background loops/listeners from previous engines
    cleanup() {
        console.log("Manya Engine: Cleaning up previous step...");
        window.removeEventListener('stop-typing', null);
        // Stop any active game loops globally if they exist
        if (window.ManyaIntervals) {
            window.ManyaIntervals.forEach(clearInterval);
            window.ManyaIntervals = [];
        }
        // Force remove global mouse/touch handlers left by WordGrid
        document.onmousemove = null;
        document.ontouchmove = null;
        document.onmouseup = null;
        document.ontouchend = null;
    },

    async loadStep() {
        this.cleanup(); // Clean before loading new
        const s = this.state;
        const step = s.steps[s.index];
        const progress = ((s.index + 1) / s.steps.length) * 100;
        const headerTitle = step.topic || localStorage.getItem('last_topic_name') || "LESSON";

        s.mount.innerHTML = `
            <div class="quest-runner-shell animate-in">
                
                <div id="qr-content" class="qr-content-area"></div>

                <footer class="qr-classic-footer" id="qr-footer-mount">
                    <button id="next-step-btn" class="manya-btn-pro" onclick="QuestRunner.next()">CONTINUE</button>
                </footer>
            </div>`;

        const contentBox = document.getElementById('qr-content');

        // Logic check for reference paths
        if (step.referencePath) {
            const dir = localStorage.getItem('manya_current_quest_dir') || 'content/english/holidays/quest_1';
            const res = await fetch(`./${dir}/${step.referencePath}`.replace(/\/+/g, '/'));
            step.data = await res.json();
        }

        // Load Engine
        this.enableButton(step.engineType !== "CHAT"); 
        await ManyaRouter.loadInline(step.engineType, step.data || step, contentBox);

        // Hide footer for games with internal buttons
        const immersive = ["PROCEDURAL_CANVAS", "SET_THEORY", "JUNGLE_MAZE", "HARVEST_GAME", "HANGMAN_ENGINE"];
        if (immersive.includes(step.engineType)) {
            document.getElementById('qr-footer-mount').style.display = 'none';
        }
    },

    enableButton(enabled, callback = null, label = "CONTINUE") {
        const btn = document.getElementById('next-step-btn');
        if (!btn) return;
        btn.disabled = !enabled;
        btn.innerText = label;
        btn.onclick = callback || (() => this.next());
    },

    next(isForced = false) {
        if (!isForced && this.state.isTyping) {
            window.dispatchEvent(new CustomEvent('stop-typing'));
            return;
        }
        if (this.state.index < this.state.steps.length - 1) {
            this.state.index++;
            this.loadStep();
        } else {
            this.finish();
        }
    },

    exit() {
        const backTo = localStorage.getItem('last_idx') === "-1" ? 'library' : 'spiral';
        window.ViewManager.show(backTo, null, localStorage.getItem('last_sub'));
        document.body.classList.remove('fullscreen-mode');
    },

    finish() {
        this.state.mount.innerHTML = `
            <div class="quest-finish-screen animate-in">
                <div class="finish-card">
                    <div style="font-size:80px;">🏆</div>
                    <h2 style="font-weight:900;">Mastery Achieved!</h2>
                    <button class="manya-btn-pro" onclick="QuestRunner.exit()">DONE</button>
                </div>
            </div>`;
    },
    // ... existing QuestRunner code ...
    
    // ADD THESE TWO FUNCTIONS inside the QuestRunner object:
    saveStepProgress(qIndex) {
        const step = this.state.steps[this.state.index];
        if (!this.state.stepMemory) this.state.stepMemory = {};
        this.state.stepMemory[step.id] = qIndex;
    },

    jumpToRule() {
        const currentIdx = this.state.index;
        // Find the most recent rule taught before this exercise
        const lastRule = this.state.steps
            .slice(0, currentIdx)
            .reverse()
            .find(s => s.engineType === "ENGLISH_RULE_MASTER");

        if (lastRule) {
            // Save where we were so we can return
            this.state.returnIndex = currentIdx;
            this.state.index = this.state.steps.indexOf(lastRule);
            this.loadStep();
        }
    },
// ... rest of code
};

window.QuestRunner = QuestRunner;
window.ManyaQuestRunner = QuestRunner;