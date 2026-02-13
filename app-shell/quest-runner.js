import { ManyaRouter } from './router.js';

export const QuestRunner = {
    state: { steps: [], index: 0, mount: null },

    async start(mount, manifest) {
        this.state.steps = manifest;
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
                    <button class="skip-dev-btn" onclick="QuestRunner.next()">[DEV] SKIP</button>
                    <div class="qr-progress"><div class="fill" style="width:${progress}%"></div></div>
                    <button class="qr-exit-btn" onclick="QuestRunner.exit()">EXIT</button>
                </div>
                <div id="qr-content" class="qr-content-area"></div>
                <div class="qr-footer">
                    <button id="next-step-btn" class="manya-btn-pro" onclick="QuestRunner.next()">CONTINUE</button>
                </div>
            </div>`;

        await ManyaRouter.loadInline(step.engine, step.data, document.getElementById('qr-content'));
        
        // Button Logic
        if (step.engine !== "MCQ_STANDALONE") {
            document.getElementById('next-step-btn').disabled = false;
        } else {
            document.getElementById('next-step-btn').disabled = true;
        }
    },

    exit() {
        ViewManager.show('spiral', null, localStorage.getItem('last_sub'));
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
        const idx = parseInt(localStorage.getItem('last_idx'));
        const saved = parseInt(localStorage.getItem(`manya_prog_${sub}`) || 0);

        // Unlock next node
        if(idx === saved) localStorage.setItem(`manya_prog_${sub}`, saved + 1);

        this.state.mount.innerHTML = `
            <div class="quest-finish-screen animate-in">
                <div class="finish-card">
                    <div style="font-size:100px;">🎉</div>
                    <h2>Experiment Complete!</h2>
                    <p>Next node on the path is now unlocked.</p>
                    <button class="manya-btn-pro" onclick="ViewManager.show('spiral', null, '${sub}')">VIEW MAP</button>
                </div>
            </div>`;
    }
};

window.QuestRunner = QuestRunner;