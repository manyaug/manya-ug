// quest.js - Complete Version
console.log('✅✅✅ QUEST.JS LOADING - FIXED VERSION ✅✅✅');

const QuestScreen = {
    questData: null,
    challenge: null,
    currentQuestionIndex: 0,
    questions: [],
    answers: [],
    hintUsed: false,
    hintDisplayed: false,
    onComplete: null,
    
    // Study mode tracking
    studySims: [],
    currentStudySimIndex: -1,
    isStudyMode: false,
    
    // Selection tracking
    selectedOption: null,
    answerSubmitted: false,
    
    // DOM elements
    hintBtn: null,
    submitBtn: null,
    hintDisplay: null,
    
    // Tracking parameters
    startTime: null,
    questionStartTime: null,
    hesitationCount: 0,
    hesitationTimer: null,
    answerChanged: false,
    changeCount: 0,
    
    // Current labeling question reference
    currentLabelingQuestion: null,
    currentSubject: 'science',
    
    // Psychological parameters
    params: {
        accuracy: 0,
        mastery: 0,
        confidence: 70,
        frustration: 0,
        hintUsage: 0,
        hesitationRate: 0
    },
    
    init(questData, challenge, onComplete) {
        console.log('🎮 Initializing quest:', questData);
        
        const template = document.getElementById('gameplay-view');
        if (!template) {
            console.error('❌ Template missing');
            alert('System error: Game template missing.');
            return;
        }
        
        this.questData = questData;
        this.challenge = challenge;
        this.questions = questData.questions || [];
        this.studySims = questData.studySims || [];
        this.currentQuestionIndex = 0;
        this.currentStudySimIndex = -1;
        this.isStudyMode = false;
        this.answers = [];
        this.onComplete = onComplete;
        
        this.currentSubject = this.detectSubject(questData, challenge);
        
        this.startTime = Date.now();
        this.params.frustration = 0;
        this.params.confidence = 70;
        this.hintUsed = false;
        this.selectedOption = null;
        this.answerSubmitted = false;
        
        this.render();
        this.loadNextContent();
        this.loadPsychologicalParams();
        
        if (questData.gameMode && questData.gameMode !== 'none' && window.GameModes) {
            window.GameModes.init(questData.gameMode, questData.gameMode === 'timed' ? 30 : null, () => this.handleTimeUp(), questData.questId);
        }
    },
    
    detectSubject(questData, challenge) {
        if (challenge && challenge.subject) return challenge.subject;
        if (questData && questData.subject) return questData.subject;
        return 'science';
    },
    
    render() {
        console.log('🎨 Rendering gameplay view...');
        
        try {
            const template = document.getElementById('gameplay-view');
            if (!template) return;
            
            const templateContent = template.content.cloneNode(true);
            
            const questNameEl = templateContent.querySelector('.current-quest-name');
            const counterEl = templateContent.querySelector('.question-counter');
            const backBtn = templateContent.querySelector('.back-btn');
            const hintBtn = templateContent.querySelector('.hint-btn');
            const submitBtn = templateContent.querySelector('.submit-btn');
            
            if (questNameEl) questNameEl.textContent = this.questData.name || 'Quest';
            if (counterEl) counterEl.textContent = `0/${this.questions.length}`;
            
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    if (confirm('Exit quest?')) this.exit();
                });
            }
            
            if (hintBtn) hintBtn.addEventListener('click', () => this.getHint());
            if (submitBtn) submitBtn.addEventListener('click', () => this.submitAnswer());
            
            const contentArea = document.getElementById('content-area');
            if (contentArea) {
                contentArea.innerHTML = '';
                contentArea.appendChild(templateContent);
            }
            
            setTimeout(() => {
                this.hintBtn = document.getElementById('hintBtn');
                this.submitBtn = document.getElementById('submitBtn');
                this.hintDisplay = document.getElementById('hintDisplay');
            }, 100);
            
        } catch (err) {
            console.error('Error in render:', err);
        }
    },
    
    loadNextContent() {
        console.log('🔄 Loading next content...');
        
        if (this.currentStudySimIndex < this.studySims.length - 1) {
            this.currentStudySimIndex++;
            const studySim = this.studySims[this.currentStudySimIndex];
            this.showStudySim(studySim);
            return;
        }
        
        if (this.currentQuestionIndex < this.questions.length) {
            this.loadQuestion(this.currentQuestionIndex);
        } else {
            this.completeQuest();
        }
    },
    
    loadQuestion(index) {
        if (index >= this.questions.length) {
            this.completeQuest();
            return;
        }
        
        this.currentQuestionIndex = index;
        const question = this.questions[index];
        
        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) {
            optionsContainer.style.display = 'grid';
            optionsContainer.innerHTML = '';
        }
        
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.style.display = 'block';
            submitBtn.disabled = true;
            submitBtn.textContent = '✅ Submit Answer';
        }
        
        const hintBtn = document.querySelector('.hint-btn');
        if (hintBtn) {
            hintBtn.style.display = 'block';
            hintBtn.disabled = false;
        }
        
        if (question.question_type === 'SIM') {
            this.loadSimulationQuestion(question);
            return;
        }
        
        if (this.hesitationTimer) clearInterval(this.hesitationTimer);
        
        this.selectedOption = null;
        this.answerSubmitted = false;
        this.hintUsed = false;
        this.answerChanged = false;
        this.changeCount = 0;
        
        const counterEl = document.querySelector('.question-counter');
        if (counterEl) counterEl.textContent = `${index + 1}/${this.questions.length}`;
        
        const questionTextEl = document.querySelector('.question-text');
        if (questionTextEl) questionTextEl.textContent = question.text || 'Question text missing';
        
        const topicBadgeEl = document.querySelector('.topic-badge');
        if (topicBadgeEl) topicBadgeEl.textContent = this.challenge?.name || 'Topic';
        
        const difficultyEl = document.querySelector('.difficulty-badge');
        if (difficultyEl) {
            const difficulty = question.difficulty || 'M';
            difficultyEl.textContent = difficulty === 'E' ? 'Easy' : difficulty === 'M' ? 'Medium' : 'Hard';
            difficultyEl.className = 'difficulty-badge ' + (difficulty === 'E' ? 'easy' : difficulty === 'M' ? 'medium' : 'hard');
        }
        
        this.renderOptions(question);
        
        if (this.hintDisplay) {
            this.hintDisplay.style.display = 'none';
            this.hintDisplay.textContent = '';
        }
        
        this.questionStartTime = Date.now();
        this.startHesitationTracking();
    },
    
    renderOptions(question) {
        const optionsContainer = document.getElementById('options-container');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = '';
        const self = this;
        const letters = ['A', 'B', 'C', 'D'];
        
        letters.forEach(letter => {
            const optionText = question.options?.[letter];
            if (!optionText) return;
            
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.dataset.letter = letter;
            optionDiv.innerHTML = `<span class="option-letter">${letter}.</span> ${optionText}`;
            optionDiv.addEventListener('click', () => self.selectOption(letter));
            optionsContainer.appendChild(optionDiv);
        });
    },
    
    selectOption(letter) {
        if (this.answerSubmitted) return;
        
        if (this.selectedOption && this.selectedOption !== letter) {
            this.answerChanged = true;
            this.changeCount++;
        }
        
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.letter === letter) opt.classList.add('selected');
        });
        
        this.selectedOption = letter;
        if (this.submitBtn) this.submitBtn.disabled = false;
    },
    
    async submitAnswer() {
        if (!this.selectedOption || this.answerSubmitted) return;
        
        if (this.hesitationTimer) clearInterval(this.hesitationTimer);
        
        this.answerSubmitted = true;
        if (this.submitBtn) this.submitBtn.disabled = true;
        if (this.hintBtn) this.hintBtn.disabled = true;
        
        document.querySelectorAll('.option').forEach(opt => {
            opt.style.pointerEvents = 'none';
        });
        
        const responseTime = Date.now() - this.questionStartTime;
        const question = this.questions[this.currentQuestionIndex];
        const correctAnswer = this.extractCorrectLetter(question.correctAnswer);
        const isCorrect = this.selectedOption === correctAnswer;
        
        await this.trackEmotion(isCorrect ? 'confident' : 'frustrated', isCorrect ? 80 : 60, 'answer_submitted', responseTime);
        await this.trackReward(isCorrect, this.hintUsed, this.currentSubject);
        await this.updateStreak(isCorrect);
        
        if (window.MANYAAudioSystem) {
            isCorrect ? window.MANYAAudioSystem.playCorrect() : window.MANYAAudioSystem.playWrong();
        }
        
        if (window.MANYACharacterSystem) {
            isCorrect ? window.MANYACharacterSystem.onCorrect() : window.MANYACharacterSystem.onWrong();
        }
        
        if (!isCorrect) {
            this.params.frustration = Math.min(100, this.params.frustration + 15);
            this.params.confidence = Math.max(0, this.params.confidence - 10);
        } else {
            this.params.frustration = Math.max(0, this.params.frustration - 5);
            this.params.confidence = Math.min(100, this.params.confidence + 5);
        }
        
        document.querySelectorAll('.option').forEach(opt => {
            if (opt.dataset.letter === correctAnswer) {
                opt.classList.add('correct');
            } else if (opt.dataset.letter === this.selectedOption && !isCorrect) {
                opt.classList.add('incorrect');
            }
        });
        
        this.updateParameterDisplays();
        await this.showDetailedFeedback(this.selectedOption, correctAnswer, isCorrect, question, responseTime / 1000);
    },
    
    async showDetailedFeedback(selected, correct, isCorrect, question, responseTime) {
        const feedbackModal = document.createElement('div');
        feedbackModal.className = 'feedback-card-detailed';
        
        let detailedSolution = `The correct answer is ${correct}. ${isCorrect ? "Great job!" : "Keep practicing!"}`;
        
        try {
            const response = await fetch(`/api/solution/${question.id}`);
            if (response.ok) {
                const data = await response.json();
                if (data.detailedSolution) detailedSolution = data.detailedSolution;
            }
        } catch (err) {}
        
        feedbackModal.innerHTML = `
            <div class="feedback-header">
                <span class="feedback-icon-large">${isCorrect ? '🎉' : '💪'}</span>
                <span class="feedback-title ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? 'Correct!' : 'Not quite right'}</span>
            </div>
            <div class="feedback-comparison">
                <div class="comparison-row"><span class="comparison-label">Your answer:</span><span>${selected} - ${this.getOptionText(question, selected)}</span></div>
                <div class="comparison-row"><span class="comparison-label">Correct answer:</span><span>${correct} - ${this.getOptionText(question, correct)}</span></div>
            </div>
            <div class="detailed-solution"><h4>📚 Explanation</h4><p>${detailedSolution}</p></div>
            <div class="feedback-actions"><button class="feedback-btn primary" id="continue-feedback-btn">Continue</button></div>
        `;
        
        document.body.appendChild(feedbackModal);
        
        document.getElementById('continue-feedback-btn').addEventListener('click', () => {
            feedbackModal.remove();
            this.currentQuestionIndex++;
            this.loadNextContent();
        });
        
        this.answers.push({
            questionId: question.id,
            selectedAnswer: selected,
            correctAnswer: correct,
            isCorrect: isCorrect,
            timeSpent: responseTime * 1000,
            hintUsed: this.hintUsed,
            answerChanged: this.answerChanged,
            changeCount: this.changeCount
        });
        
        const correctSoFar = this.answers.filter(a => a.isCorrect).length;
        this.params.accuracy = (correctSoFar / this.answers.length) * 100;
        this.updateParameterDisplays();
    },
    
    getOptionText(question, letter) {
        return question.options?.[letter] || '';
    },
    
    extractCorrectLetter(correctAnswer) {
        if (!correctAnswer) return 'A';
        if (correctAnswer.startsWith('Option_')) return correctAnswer.replace('Option_', '');
        if (['A','B','C','D'].includes(correctAnswer)) return correctAnswer;
        return 'A';
    },
    
    async getHint() {
        if (this.hintUsed || this.answerSubmitted) return;
        
        const question = this.questions[this.currentQuestionIndex];
        
        try {
            const response = await fetch(`/api/hint/${question.id}`);
            const data = await response.json();
            
            if (this.hintDisplay) {
                this.hintDisplay.textContent = data.hint || "Think carefully about what you've learned!";
                this.hintDisplay.style.display = 'block';
            }
            
            this.hintUsed = true;
            if (this.hintBtn) this.hintBtn.disabled = true;
        } catch (err) {
            if (this.hintDisplay) {
                this.hintDisplay.textContent = "Try to eliminate wrong answers first!";
                this.hintDisplay.style.display = 'block';
            }
            this.hintUsed = true;
            if (this.hintBtn) this.hintBtn.disabled = true;
        }
    },
    
    async showStudySim(studySim) {
        console.log('📚 Showing study simulation');
        this.isStudyMode = true;
        
        const optionsContainer = document.getElementById('options-container');
        if (optionsContainer) optionsContainer.style.display = 'none';
        
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) submitBtn.style.display = 'none';
        
        const hintBtn = document.querySelector('.hint-btn');
        if (hintBtn) hintBtn.style.display = 'none';
        
        const counterEl = document.querySelector('.question-counter');
        if (counterEl) counterEl.innerHTML = '📚 <span style="color: #9f7aea;">Study Guide</span>';
        
        const questionText = document.querySelector('.question-text');
        if (questionText) questionText.innerHTML = `<span style="color: #9f7aea;">📚 STUDY MODE:</span> ${studySim.title || 'Explore the model'}`;
        
        const simContainer = document.createElement('div');
        simContainer.id = 'simulation-container';
        simContainer.style.cssText = 'width:100%; min-height:500px; margin:20px 0;';
        
        const questionTextEl = document.querySelector('.question-text');
        if (questionTextEl) questionTextEl.parentNode.insertBefore(simContainer, questionTextEl.nextSibling);
        
        try {
            if (!window.SimulationLoader) {
                await this.loadScript('/js/simulation-loader.js');
                await SimulationLoader.init();
            }
            const simElement = await SimulationLoader.loadSimulation(studySim);
            simContainer.appendChild(simElement);
        } catch (err) {
            simContainer.innerHTML = '<div style="color:red;">Failed to load study guide</div>';
        }
        
        this.addStudyMessage();
        this.setupStudyContinueButton(studySim);
    },
    
    addStudyMessage() {
        const questionArea = document.querySelector('.gameplay-area');
        if (!questionArea) return;
        
        const studyMessage = document.createElement('div');
        studyMessage.className = 'study-message';
        studyMessage.style.cssText = 'background:#9f7aea20; border-left:4px solid #9f7aea; padding:15px; margin:20px 0; border-radius:8px;';
        studyMessage.innerHTML = '<strong>📚 Study Guide</strong><p style="margin-top:8px;">Take your time to explore. Click "Continue" when ready.</p>';
        questionArea.insertBefore(studyMessage, questionArea.firstChild);
    },
    
    setupStudyContinueButton(studySim) {
        const footer = document.querySelector('.gameplay-footer');
        if (!footer) return;
        
        const existingBtn = document.getElementById('simulation-done-btn');
        if (existingBtn) existingBtn.remove();
        
        const continueBtn = document.createElement('button');
        continueBtn.id = 'simulation-done-btn';
        continueBtn.className = 'submit-btn';
        continueBtn.textContent = '📚 Continue to Questions';
        continueBtn.style.cssText = 'margin:20px auto; width:250px; display:block; background:#9f7aea;';
        
        continueBtn.onclick = () => {
            this.answers.push({ questionId: studySim.id, type: 'simulation', mode: 'study', timeSpent: (Date.now() - this.startTime) / 1000 });
            this.isStudyMode = false;
            
            document.querySelector('.study-message')?.remove();
            document.getElementById('simulation-container')?.remove();
            
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) optionsContainer.style.display = 'grid';
            
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn) submitBtn.style.display = 'block';
            
            const hintBtn = document.querySelector('.hint-btn');
            if (hintBtn) hintBtn.style.display = 'block';
            
            const counterEl = document.querySelector('.question-counter');
            if (counterEl) counterEl.textContent = `${this.currentQuestionIndex + 1}/${this.questions.length}`;
            
            this.loadNextContent();
        };
        
        footer.appendChild(continueBtn);
    },
    
    async loadSimulationQuestion(question) {
        console.log('🎮 Loading simulation question');
        
        try {
            if (!window.SimulationLoader) {
                await this.loadScript('/js/simulation-loader.js');
                await SimulationLoader.init();
            }
            
            const optionsContainer = document.getElementById('options-container');
            if (optionsContainer) optionsContainer.style.display = 'none';
            
            const simContainer = document.createElement('div');
            simContainer.id = 'simulation-container';
            simContainer.style.cssText = 'width:100%; min-height:500px; margin:20px 0;';
            
            const questionText = document.querySelector('.question-text');
            if (questionText) questionText.parentNode.insertBefore(simContainer, questionText.nextSibling);
            
            const simElement = await SimulationLoader.loadSimulation({ ...question, mode_sim: question.mode_sim || 'labeling' });
            simContainer.appendChild(simElement);
            
            this.setupLabelingSim(question);
        } catch (err) {
            console.error('Error loading simulation:', err);
        }
    },
    
    setupLabelingSim(question) {
        console.log('🏷️ Setting up LABELING mode');
        
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.style.display = 'block';
            submitBtn.disabled = true;
            submitBtn.textContent = '✅ Submit Answers';
        }
        
        const hintBtn = document.querySelector('.hint-btn');
        if (hintBtn) hintBtn.style.display = 'none';
        
        setTimeout(() => {
            window.onSimulationSubmit = (result) => {
                console.log('Simulation result:', result);
                this.answers.push({
                    questionId: question.id,
                    type: 'simulation',
                    mode: 'labeling',
                    isCorrect: result.isCorrect,
                    correctCount: result.correct,
                    totalCount: result.total,
                    timeSpent: (Date.now() - this.questionStartTime) / 1000
                });
                this.currentQuestionIndex++;
                this.loadNextContent();
            };
        }, 1000);
    },
    
    // ========== GAMIFICATION METHODS ==========
    
    async trackReward(isCorrect, hintUsed, subject) {
        const userId = window.App?.currentUser || 'student-001';
        
        try {
            const response = await fetch('/api/gamification/award', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, subject, isCorrect, hintUsed, context: 'answer_correct' })
            });
            const data = await response.json();
            if (data.awarded && (data.awarded.subjectGems > 0 || data.awarded.overallGems > 0)) {
                this.showRewardAnimation(data.awarded);
            }
            return data;
        } catch (err) {
            console.error('Error tracking reward:', err);
            return null;
        }
    },
    
    showRewardAnimation(awarded) {
        if (!awarded.subjectGems && !awarded.overallGems) return;
        
        const animation = document.createElement('div');
        animation.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); pointer-events:none; z-index:10000; background:rgba(0,0,0,0.8); color:gold; padding:15px 25px; border-radius:50px; font-weight:bold; font-size:1.2em; animation:floatUp 1s ease-out forwards;';
        animation.innerHTML = `+${awarded.subjectGems} 🎨 +${awarded.overallGems} ⭐`;
        document.body.appendChild(animation);
        setTimeout(() => animation.remove(), 1000);
        
        if (window.MANYAAudioSystem && awarded.subjectGems > 0) {
            window.MANYAAudioSystem.playGemCollect();
        }
    },
    
    async trackEmotion(emotion, intensity, context, responseTime) {
        const userId = window.App?.currentUser || 'student-001';
        try {
            await fetch('/api/gamification/emotion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, emotion, intensity, context, responseTime: Math.floor(responseTime) })
            });
        } catch (err) {}
    },
    
    async updateStreak(isCorrect) {
        const userId = window.App?.currentUser || 'student-001';
        try {
            const response = await fetch('/api/gamification/streak/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isCorrect })
            });
            const data = await response.json();
            if (window.MANYACharacterSystem && data.currentStreak > 0 && data.currentStreak % 3 === 0) {
                window.MANYACharacterSystem.onStreak(data.currentStreak);
            }
            return data;
        } catch (err) {
            return null;
        }
    },
    
    async completeQuest() {
        console.log('🏁 Completing quest...');
        
        const totalQuestions = this.questions.length;
        const correctAnswers = this.answers.filter(a => a.isCorrect).length;
        let mastery = (correctAnswers / totalQuestions) * 100;
        mastery = Math.min(100, Math.max(0, Math.round(mastery)));
        
        try {
            await fetch('/api/quests/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: window.App?.currentUser || 'student-001',
                    challengeId: this.challenge.id,
                    questId: this.questData?.questId,
                    mastery: mastery,
                    answers: this.answers
                })
            });
            this.showCompletion(mastery);
        } catch (err) {
            console.error('Error completing quest:', err);
            this.exit();
        }
    },
    
    showCompletion(mastery) {
        const overlay = document.querySelector('.quest-complete-overlay');
        if (!overlay) return;
        
        overlay.querySelector('.mastery-score').textContent = mastery + '%';
        overlay.querySelector('.earned-rewards').innerHTML = `<div>✨ Mastery: ${mastery}%</div><div>📊 Accuracy: ${Math.round(this.params.accuracy)}%</div>`;
        overlay.querySelector('.continue-btn').onclick = () => {
            overlay.style.display = 'none';
            this.exit();
        };
        overlay.style.display = 'flex';
    },
    
    updateParameterDisplays() {
        const accuracyEl = document.getElementById('param-accuracy');
        if (accuracyEl) accuracyEl.textContent = Math.round(this.params.accuracy) + '%';
        
        const masteryEl = document.getElementById('param-mastery');
        if (masteryEl) masteryEl.textContent = Math.round(this.params.mastery) + '%';
        
        const confidenceEl = document.getElementById('param-confidence');
        if (confidenceEl) confidenceEl.textContent = Math.round(this.params.confidence) + '%';
        
        const confidenceBar = document.getElementById('confidence-bar');
        if (confidenceBar) confidenceBar.style.width = this.params.confidence + '%';
        
        const frustrationEl = document.getElementById('param-frustration');
        if (frustrationEl) frustrationEl.textContent = Math.round(this.params.frustration) + '%';
        
        const frustrationBar = document.getElementById('frustration-bar');
        if (frustrationBar) frustrationBar.style.width = this.params.frustration + '%';
        
        const hintsEl = document.getElementById('param-hints');
        if (hintsEl) hintsEl.textContent = Math.round(this.params.hintUsage) + '%';
        
        const hintCount = this.answers.filter(a => a.hintUsed).length;
        const hintCountEl = document.getElementById('hint-count');
        if (hintCountEl) hintCountEl.textContent = `${hintCount} used`;
    },
    
    startHesitationTracking() {
        this.questionStartTime = Date.now();
        const self = this;
        
        if (this.hesitationTimer) clearInterval(this.hesitationTimer);
        
        this.hesitationTimer = setInterval(() => {
            const timeOnQuestion = (Date.now() - self.questionStartTime) / 1000;
            if (timeOnQuestion > 5 && !self.answerSubmitted && !self.selectedOption) {
                self.hesitationCount++;
            }
        }, 1000);
    },
    
    async loadPsychologicalParams() {
        try {
            const response = await fetch(`/api/psychological/state/${window.App?.currentUser || 'student-001'}`);
            const data = await response.json();
            this.params.confidence = data.confidence || 70;
            this.params.frustration = data.frustration || 0;
            this.updateParameterDisplays();
        } catch (err) {}
    },
    
    handleTimeUp() {
        console.log('⏰ TIME\'S UP!');
        this.completeQuest();
    },
    
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    
    exit() {
        if (this.onComplete) this.onComplete();
    }
};

window.QuestScreen = QuestScreen;
console.log('✅ QuestScreen registered globally');