export const SentenceTrainEngine = {
    state: {
        container: null,
        levels: [],
        currentLevelIndex: 0,
        score: 0,
        correctSequence: [], 
        poolWords: [],       
        trackWords: [],      
        isAnimating: false,
        playerIcon: "/assets/images/manya_icon.png",
        pollyIcon: "/assets/images/polly_icon.png",
        hint: ""
    },

    renderLabeling: async (container, data) => {
        const s = SentenceTrainEngine.state;
        s.container = container;
        s.levels = data.questions || [];
        s.score = 0;
        s.currentLevelIndex = 0;
        s.hint = data.hint || "";
        
        s.playerIcon = window.QuestRunner?.CHAR_ICONS?.manya || s.playerIcon;
        s.pollyIcon = window.QuestRunner?.CHAR_ICONS?.polly || s.pollyIcon;

        if (window.QuestRunner) window.QuestRunner.enableButton(false);

        SentenceTrainEngine.injectStyles();
        SentenceTrainEngine.loadLevel(0);
    },

    loadLevel: (index) => {
        const s = SentenceTrainEngine.state;
        
        if (index >= s.levels.length) {
            SentenceTrainEngine.showPollyFinale();
            return;
        }

        const levelData = s.levels[index];
        const words = levelData.sentence.split(' ');
        
        s.correctSequence = [...words];
        s.trackWords = []; 
        
        s.poolWords = [...words].map((word, i) => ({ id: i, text: word }));
        SentenceTrainEngine.shuffleArray(s.poolWords);

        s.isAnimating = false;
        
        const track = document.getElementById('train-track-container');
        const feedback = document.getElementById('train-feedback');
        
        if(track) {
            track.classList.remove('departing');
            track.style.transform = 'translateX(0)';
        }
        if(feedback) {
            feedback.className = 'feedback-msg'; 
            feedback.innerHTML = '';
        }

        SentenceTrainEngine.render();
    },

    shuffleArray: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    addToTrain: (wordId) => {
        const s = SentenceTrainEngine.state;
        if (s.isAnimating) return;

        const wordIndex = s.poolWords.findIndex(w => w.id === wordId);
        if (wordIndex === -1) return;

        const wordObj = s.poolWords.splice(wordIndex, 1)[0];
        s.trackWords.push(wordObj);

        // Hide feedback immediately when user interacts
        const feedback = document.getElementById('train-feedback');
        if(feedback) feedback.classList.remove('visible');

        SentenceTrainEngine.render();
        
        if (s.poolWords.length === 0) {
            SentenceTrainEngine.checkWinCondition();
        }
    },

    removeFromTrain: (wordId) => {
        const s = SentenceTrainEngine.state;
        if (s.isAnimating) return;

        const wordIndex = s.trackWords.findIndex(w => w.id === wordId);
        if (wordIndex === -1) return;

        const wordObj = s.trackWords.splice(wordIndex, 1)[0];
        s.poolWords.push(wordObj);

        // Hide feedback immediately when user interacts so they can focus
        const feedback = document.getElementById('train-feedback');
        if(feedback) feedback.classList.remove('visible');

        SentenceTrainEngine.render();
    },

    checkWinCondition: () => {
        const s = SentenceTrainEngine.state;
        
        const currentSentence = s.trackWords.map(w => w.text).join(' ');
        const targetSentence = s.correctSequence.join(' ');

        if (currentSentence === targetSentence) {
            s.score += 100;
            s.isAnimating = true;
            SentenceTrainEngine.animateDeparture();
        } else {
            SentenceTrainEngine.animateFailure();
        }
    },

    animateFailure: () => {
        const trainEl = document.querySelector('.train-assembly');
        const feedback = document.getElementById('train-feedback');
        const smokeStack = document.querySelector('.smoke-stack');
        
        // 1. Shake the train
        if(trainEl) {
            trainEl.classList.add('shake-train');
            setTimeout(() => trainEl.classList.remove('shake-train'), 600);
        }

        // 2. Visual "Sputter" Effect (Grey smoke)
        if(smokeStack) {
            smokeStack.innerHTML += `<div class="puff sputter">💨</div>`;
        }

        // 3. Show Softer Error Message
        if(feedback) {
            feedback.innerHTML = "😅 Almost there!<br><span style='font-size:0.85em; font-weight:normal;'>The engine is sputtering. Rearrange the words!</span>";
            feedback.classList.remove('success');
            feedback.classList.add('error', 'visible');
            
            // 4. AUTO-HIDE after 2.5 seconds so user can try again immediately
            setTimeout(() => {
                feedback.classList.remove('visible');
            }, 2500);
        }
    },

    animateDeparture: () => {
        const s = SentenceTrainEngine.state;
        const trackContainer = document.getElementById('train-track-container');
        const feedback = document.getElementById('train-feedback');
        const whistle = document.getElementById('steam-whistle');
        
        if(feedback) feedback.classList.remove('visible');

        if(whistle) {
            whistle.style.opacity = 1;
            whistle.classList.add('toot');
        }

        setTimeout(() => {
            if(trackContainer) trackContainer.classList.add('departing');
        }, 800); 

        setTimeout(() => {
            if (s.currentLevelIndex < s.levels.length - 1) {
                s.currentLevelIndex++;
                SentenceTrainEngine.loadLevel(s.currentLevelIndex);
            } else {
                SentenceTrainEngine.showPollyFinale();
            }
        }, 2000);
    },

    showPollyFinale: () => {
        const s = SentenceTrainEngine.state;
        const pollyOverlay = document.getElementById('polly-overlay');
        
        if (pollyOverlay) {
            pollyOverlay.classList.add('visible');
        }

        setTimeout(() => {
            SentenceTrainEngine.endGame();
        }, 3500); 
    },

    endGame: () => {
        const s = SentenceTrainEngine.state;
        s.container.innerHTML = `
            <div class="bento-card" style="text-align:center; padding:40px; animation: popIn 0.5s;">
                <div style="font-size:4rem; margin-bottom:10px;">🚂🏆</div>
                <h1 style="color:#1e293b;">JOURNEY COMPLETE!</h1>
                <p>You are a Grammar Conductor!</p>
                <div class="score-badge">Final Score: ${s.score}</div>
                <button className="manya-pill-btn" onclick="window.QuestRunner.next()" style="margin-top:20px;">FINISH QUEST</button>
            </div>
        `;
        if (window.QuestRunner) window.QuestRunner.enableButton(true);
    },

    render: () => {
        const s = SentenceTrainEngine.state;
        
        let trainHTML = `
            <div class="train-engine">
                <div id="steam-whistle" class="whistle-steam">TOOT!</div>
                <div class="smoke-stack">
                    <div class="puff p1"></div><div class="puff p2"></div>
                </div>
                <div class="engine-cabin">
                    <img src="${s.playerIcon}" class="driver-icon">
                    <div class="cabin-roof"></div>
                </div>
                <div class="engine-boiler">
                    <div class="stripe"></div>
                </div>
                <div class="cow-catcher"></div>
                <div class="engine-wheels">
                    <div class="wheel big"><div class="spoke"></div></div>
                    <div class="wheel small"></div>
                    <div class="piston-rod"></div>
                </div>
            </div>
        `;

        s.trackWords.forEach((word, index) => {
            trainHTML += `
                <div class="train-carriage" onclick="window.SentenceTrainEngine_remove(${word.id})" style="animation-delay: ${index * 0.05}s">
                    <div class="carriage-box">
                        <span class="word-text">${word.text}</span>
                    </div>
                    <div class="carriage-base"></div>
                    <div class="carriage-connector"></div>
                    <div class="carriage-wheels">
                        <div class="wheel"></div>
                        <div class="wheel"></div>
                    </div>
                </div>
            `;
        });

        let poolHTML = s.poolWords.map(word => `
            <button class="word-ticket" onclick="window.SentenceTrainEngine_add(${word.id})">
                ${word.text}
            </button>
        `).join('');

        s.container.innerHTML = `
            <div class="train-game-shell">
                <div class="train-stats-bar">
                    <div class="stat-pill">Level ${s.currentLevelIndex + 1}</div>
                    <div class="stat-pill score">Score: ${s.score}</div>
                </div>
                
                <div class="train-scenery">
                    <div class="sun"></div>
                    <div class="cloud c1">☁️</div>
                    <div class="cloud c2">☁️</div>
                    <div class="hills"></div>
                </div>

                <div id="train-track-container" class="track-area">
                    <div class="train-assembly">
                        ${trainHTML}
                    </div>
                    <div class="railway-bed">
                        <div class="rail top"></div>
                        <div class="rail bottom"></div>
                        <div class="ties"></div>
                    </div>
                </div>

                <!-- Feedback moved to top-center to not block words -->
                <div id="train-feedback" class="feedback-msg"></div>

                ${s.hint ? `<div class="train-hint" style="background:#FFF9EB; border-left:4px solid #FBBF24; padding:12px; border-radius:10px; margin: 10px 20px; font-size:12px; font-weight:700; color:#92400E;">💡 HINT: ${s.hint}</div>` : ''}

                <div id="polly-overlay">
                    <img src="${s.pollyIcon}" class="polly-img">
                    <div class="polly-bubble">Squawk! Perfect Grammar!</div>
                </div>

                <div class="word-depot">
                    <div class="depot-roof"></div>
                    <div class="pool-grid">
                        ${poolHTML}
                    </div>
                </div>
            </div>
        `;

        window.SentenceTrainEngine_add = SentenceTrainEngine.addToTrain;
        window.SentenceTrainEngine_remove = SentenceTrainEngine.removeFromTrain;
    },

    injectStyles: () => {
        if (document.getElementById('sentence-train-v5-styles')) return;
        const style = document.createElement('style');
        style.id = 'sentence-train-v5-styles';
        style.innerHTML = `
            .train-game-shell {
                display: flex; flex-direction: column; height: 100%; width: 100%;
                max-width: 500px; margin: 0 auto;
                background: linear-gradient(to bottom, #87CEEB 0%, #E0F7FA 60%, #a3e635 60%);
                border-radius: 16px; overflow: hidden; position: relative;
                box-shadow: 0 10px 20px rgba(0,0,0,0.1); font-family: 'Nunito', sans-serif;
            }
            .train-stats-bar { display: flex; justify-content: space-between; padding: 15px; z-index: 20; }
            .stat-pill { background: white; padding: 5px 15px; border-radius: 20px; font-weight: 800; color: #0f172a; border: 2px solid #e2e8f0; }
            
            /* Scenery */
            .train-scenery { position: absolute; top: 0; left: 0; width: 100%; height: 60%; pointer-events: none; }
            .sun { position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: #fbbf24; border-radius: 50%; border: 4px solid #f59e0b; opacity: 0.8; }
            .cloud { position: absolute; font-size: 3rem; opacity: 0.9; color: white; text-shadow: 0 4px 0 #cbd5e1; }
            .c1 { top: 30px; left: 10%; animation: float 25s linear infinite; }
            .c2 { top: 60px; left: 70%; animation: float 35s linear infinite reverse; }
            .hills { position: absolute; bottom: 0; width: 100%; height: 40px; background: #84cc16; border-radius: 50% 50% 0 0 / 100% 100% 0 0; transform: scaleX(1.5); }

            /* Track */
            .track-area {
                margin-top: auto; position: relative; padding-left: 20px; padding-bottom: 5px;
                transition: transform 3s cubic-bezier(0.55, 0.055, 0.675, 0.19); z-index: 10;
                display: flex; flex-direction: column; overflow-x: visible;
            }
            .track-area.departing { transform: translateX(150vw); }
            .shake-train { animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
            .train-assembly { display: flex; align-items: flex-end; gap: 2px; margin-bottom: -4px; }

            /* Train Graphics */
            .train-engine { position: relative; width: 100px; height: 90px; flex-shrink: 0; animation: idle-chug 0.5s infinite alternate; z-index: 5; }
            .engine-boiler { position: absolute; bottom: 15px; left: 0; width: 60px; height: 45px; background: #ef4444; border: 3px solid #7f1d1d; border-radius: 10px 5px 0 0; z-index: 2; }
            .stripe { width: 100%; height: 10px; background: #fbbf24; margin-top: 15px; }
            .engine-cabin { position: absolute; bottom: 15px; right: 0; width: 45px; height: 65px; background: #b91c1c; border: 3px solid #7f1d1d; border-radius: 5px; display: flex; align-items: flex-end; justify-content: center; z-index: 1; }
            .cabin-roof { position: absolute; top: -5px; width: 110%; height: 8px; background: #1e293b; border-radius: 4px; }
            .driver-icon { width: 35px; height: 35px; margin-bottom: 10px; border-radius: 50%; border: 2px solid white; background:white; }
            .cow-catcher { position: absolute; bottom: 15px; left: -10px; width: 0; height: 0; border-bottom: 25px solid #1e293b; border-left: 15px solid transparent; }
            .smoke-stack { position: absolute; top: 10px; left: 10px; width: 15px; height: 25px; background: #1e293b; border-top: 5px solid #475569; z-index: 3; }
            .puff { position: absolute; background: rgba(255,255,255,0.8); border-radius: 50%; opacity: 0; }
            .p1 { width: 15px; height: 15px; top: -10px; left: 0; animation: puff 2s infinite; }
            .p2 { width: 20px; height: 20px; top: -25px; left: 5px; animation: puff 2s 0.5s infinite; }
            .sputter { width: 20px; height: 20px; background: #9ca3af; animation: puff 0.5s ease-out; top: -20px; left: 0; }
            .whistle-steam { position: absolute; top: -40px; right: 0px; background: white; padding: 4px 8px; border-radius: 8px; font-weight: 800; font-size: 12px; color: #1e293b; opacity: 0; transition: opacity 0.2s; border: 2px solid #1e293b; box-shadow: 2px 2px 0 rgba(0,0,0,0.1); }
            .whistle-steam.toot { animation: toot-bounce 0.5s infinite; }
            .engine-wheels { position: absolute; bottom: -5px; left: 5px; width: 100%; height: 30px; z-index: 4; }
            .wheel { background: #374151; border: 3px solid #9ca3af; border-radius: 50%; position: absolute; bottom: 0; animation: spin 1s linear infinite; }
            .wheel.big { width: 28px; height: 28px; left: 10px; }
            .wheel.small { width: 20px; height: 20px; right: 5px; }
            .spoke { width: 100%; height: 2px; background: #9ca3af; position: absolute; top: 50%; transform: translateY(-50%); }
            .piston-rod { position: absolute; bottom: 12px; left: 24px; width: 50px; height: 4px; background: #cbd5e1; transform-origin: left center; animation: piston 1s linear infinite; }

            .train-carriage { position: relative; margin-left: 2px; animation: dropIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-origin: center bottom; flex-shrink: 0; }
            .carriage-box { background: #f8fafc; border: 3px solid #3b82f6; border-radius: 6px; padding: 8px 12px; min-width: 50px; text-align: center; box-shadow: inset 0 -5px 0 rgba(0,0,0,0.1); cursor: pointer; }
            .word-text { font-weight: 800; color: #1e3a8a; font-size: 1rem; white-space: nowrap; }
            .carriage-base { height: 8px; background: #1e293b; width: 90%; margin: 0 auto; border-radius: 0 0 4px 4px; }
            .carriage-connector { position: absolute; left: -6px; bottom: 12px; width: 8px; height: 6px; background: #334155; border-radius: 2px; }
            .carriage-wheels { display: flex; justify-content: space-between; padding: 0 5px; margin-top: -4px; }
            .carriage-wheels .wheel { position: relative; width: 16px; height: 16px; animation: spin 1s linear infinite; }

            .railway-bed { height: 12px; background: #78350f; border-top: 4px solid #a8a29e; width: 200%; position: relative; }
            .ties { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: repeating-linear-gradient(90deg, transparent, transparent 15px, #451a03 15px, #451a03 20px); }

            .word-depot { background: white; padding: 20px; border-top: 4px solid #f0f9ff; z-index: 20; min-height: 180px; }
            .depot-roof { width: 100%; height: 15px; background: repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 10px, #cbd5e1 10px, #cbd5e1 20px); margin-bottom: 15px; border-bottom: 4px solid #94a3b8; }
            .pool-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
            .word-ticket { background: #e0f2fe; border: 2px solid #7dd3fc; color: #0369a1; padding: 10px 15px; border-radius: 20px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: transform 0.1s; }
            .word-ticket:active { transform: scale(0.95); background: #bae6fd; }

            #polly-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0); display: flex; flex-direction: column; align-items: center; z-index: 50; transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events: none; }
            #polly-overlay.visible { transform: translate(-50%, -50%) scale(1); }
            .polly-img { width: 120px; height: 120px; border-radius: 50%; border: 5px solid white; box-shadow: 0 10px 30px rgba(0,0,0,0.3); background: white; animation: bob 1s infinite alternate; }
            .polly-bubble { background: white; padding: 15px 20px; border-radius: 20px; border: 3px solid #7e22ce; color: #581c87; font-weight: 900; font-size: 1.2rem; margin-top: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.15); animation: popIn 0.5s 0.3s backwards; white-space: nowrap; }

            /* Feedback - Updated Position & Style */
            .feedback-msg {
                position: absolute; top: 20%; left: 50%; transform: translate(-50%, -50%) scale(0);
                padding: 10px 20px; border-radius: 12px; font-size: 1.1rem; font-weight: 900;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                opacity: 0; pointer-events: none; transition: all 0.3s;
                text-align: center; z-index: 60;
                width: 80%;
            }
            .feedback-msg.error { background: #fee2e2; color: #dc2626; border: 3px solid #dc2626; }
            .feedback-msg.visible { opacity: 1; transform: translate(-50%, -50%) scale(1); }

            @keyframes float { from { transform: translateX(0); } to { transform: translateX(100px); } }
            @keyframes puff { 0% { opacity: 0; transform: translateY(0); } 50% { opacity: 1; } 100% { opacity: 0; transform: translateY(-15px); } }
            @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }
            @keyframes toot-bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
            @keyframes bob { from { transform: translateY(0); } to { transform: translateY(-10px); } }
            @keyframes shake { 10%, 90% { transform: translate3d(-2px, 0, 0); } 20%, 80% { transform: translate3d(4px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-6px, 0, 0); } 40%, 60% { transform: translate3d(6px, 0, 0); } }
        `;
        document.head.appendChild(style);
    }
};