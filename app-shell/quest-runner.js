import { ManyaRouter } from './router.js';

export const QuestRunner = {
    state: { steps: [], index: 0, mount: null },

    async start(mount, stepsArray) {
        this.state.steps = stepsArray;
        this.state.mount = mount;
        this.state.index = 0;
        this.loadStep();
    },

    async loadStep() {
        const step = this.state.steps[this.state.index];
        const progress = ((this.state.index + 1) / this.state.steps.length) * 100;

        this.state.mount.innerHTML = `
            <div class="quest-runner-shell animate-in">
                <div class="qr-header">
                    <div class="qr-progress"><div class="fill" style="width:${progress}%"></div></div>
                    <button class="qr-exit-btn" onclick="QuestRunner.exit()">EXIT</button>
                </div>
                <div id="qr-content" class="qr-content-area"></div>
                <div class="qr-footer">
                    <button id="next-step-btn" class="manya-btn-pro" onclick="QuestRunner.next()">CONTINUE</button>
                </div>
            </div>`;

        // FIX: Use 'engineType' instead of 'engine'
        // FIX: Pass the whole 'step' as the data
        const engineKey = step.engineType || "MCQ_STANDALONE"; 
        
        await ManyaRouter.loadInline(engineKey, step, document.getElementById('qr-content'));
        
        // Auto-enable button for study modes
        if (engineKey.includes("STUDY") || engineKey.includes("READER")) {
            document.getElementById('next-step-btn').disabled = false;
        }
    },

    exit() {
        const isLibrary = localStorage.getItem('last_idx') === "-1";
        window.ViewManager.show(isLibrary ? 'library' : 'spiral', null, localStorage.getItem('last_sub'));
        document.body.classList.remove('fullscreen-mode');
    },

    next() {
        if (this.state.index < this.state.steps.length - 1) {
            this.state.index++;
            this.loadStep();
        } else {
            this.finish();
        }
    },

    finish() {
        const sub = localStorage.getItem('last_sub');
        this.state.mount.innerHTML = `
            <div class="quest-finish-screen animate-in">
                <div class="finish-card">
                    <div style="font-size:80px;">🏆</div>
                    <h2>Topic Mastered!</h2>
                    <button class="manya-btn-pro" onclick="QuestRunner.exit()">BACK TO LIBRARY</button>
                </div>
            </div>`;
    }
};

window.QuestRunner = QuestRunner;