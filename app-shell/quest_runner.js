export const QuestRunner = {
    state: { currentIndex: 0, manifest: null, mount: null },

    async renderQuest(container, manifest) {
        this.state.manifest = manifest;
        this.state.mount = container;
        this.state.currentIndex = 0;
        this.renderStep();
    },

    async renderStep() {
        const step = this.state.manifest.steps[this.state.currentIndex];
        const total = this.state.manifest.steps.length;
        const progress = ((this.state.currentIndex + 1) / total) * 100;

        // Render the Shell (Header with Progress + Content Area + Footer)
        this.state.mount.innerHTML = `
            <div class="runner-shell">
                <div class="runner-header">
                    <div class="p-track"><div class="p-fill" style="width:${progress}%"></div></div>
                    <button onclick="ViewManager.goBack()">SKIP</button>
                </div>
                
                <div id="step-content-mount"></div>

                <div class="runner-footer">
                    <button id="quest-continue-btn" class="continue-btn" onclick="QuestRunner.nextStep()">CONTINUE</button>
                </div>
            </div>
        `;

        const stepMount = document.getElementById('step-content-mount');
        
        // Use the Router to load the specific engine for this step
        // We call ManyaRouter.load with a "silent" flag so it doesn't repaint the whole screen
        await ManyaRouter.loadInline(step.engineType, step.data, stepMount);
    },

    nextStep() {
        if (this.state.currentIndex < this.state.manifest.steps.length - 1) {
            this.state.currentIndex++;
            this.renderStep();
        } else {
            // FINISH
            this.state.mount.innerHTML = `<div class="finish-screen"><h1>🏆 Quest Complete!</h1><button onclick="ViewManager.show('home')">Claim Rewards</button></div>`;
        }
    }
};

window.QuestRunner = QuestRunner;