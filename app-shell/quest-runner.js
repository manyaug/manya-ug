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
        
        // Get the title: Use Lesson Title, Topic Name, or Fallback
        const headerTitle = step.topic || localStorage.getItem('last_topic_name') || "LESSON";

        this.state.mount.innerHTML = `
            <div class="quest-runner-shell animate-in">
                
                <!-- 1. CLASSIC SOLID HEADER -->
                <header class="qr-classic-header">
                    <button class="qr-back-btn" onclick="QuestRunner.exit()">
                        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    
                    <div class="qr-title-box">
                        <span class="qr-subject-tag">${headerTitle}</span>
                    </div>

                    <div class="qr-header-right">
                        <!-- Space for coins or timer if needed later -->
                        <div class="mini-coin">💎</div>
                    </div>

                    <!-- PROGRESS UNDERLINE (Classic Manya Theme) -->
                    <div class="qr-progress-bar">
                        <div class="fill" style="width: ${progress}%"></div>
                    </div>
                </header>

                <!-- 2. SCROLLABLE CONTENT AREA -->
                <div id="qr-content" class="qr-content-area">
                    <!-- Engines render here and CANNOT hide behind header -->
                </div>

                
            </div>`;

        // Load the Engine into the content box
        const contentBox = document.getElementById('qr-content');
        await ManyaRouter.loadInline(step.engineType, step, contentBox);
    },

    exit() {
        if (window.AudioManager) window.AudioManager.playSFX();
        const isLibrary = localStorage.getItem('last_idx') === "-1";
        window.ViewManager.show(isLibrary ? 'library' : 'spiral', null, localStorage.getItem('last_sub'));
        document.body.classList.remove('fullscreen-mode');
    },

    next() {
        if (window.AudioManager) window.AudioManager.playSFX();
        if (this.state.index < this.state.steps.length - 1) {
            this.state.index++;
            this.loadStep();
        } else {
            this.finish();
        }
    },

    finish() {
        this.state.mount.innerHTML = `
            <div class="quest-finish-screen animate-in">
                <div class="finish-card">
                    <div style="font-size:80px; margin-bottom:20px;">🏆</div>
                    <h2 style="margin:0; font-weight:900;">Quest Complete!</h2>
                    <p style="color:#64748b; margin:10px 0 25px 0;">You're getting closer to mastering this topic.</p>
                    <button class="manya-btn-pro" onclick="QuestRunner.exit()">DONE</button>
                </div>
            </div>`;
    }
};

window.QuestRunner = QuestRunner;