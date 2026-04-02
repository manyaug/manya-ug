export const HangmanEngine = {
    state: {
        container: null,
        words: [], // Stores [{word: "VACATION", hint: "..."}, ...]
        currentWord: '',
        guessedLetters: new Set(),
        incorrectGuesses: 0,
        maxIncorrect: 6,
        hiddenWord: [],
        hint: ''
    },

    renderLabeling: async (container, data) => {
        const s = HangmanEngine.state;
        s.container = container;
        
        // FIX: Correctly map the JSON data structure to extract word and hint
        s.words = data.words.map(w => {
            if (typeof w === 'string') {
                return { word: w.toUpperCase(), hint: "A mystery word." };
            } else if (w && w.word) {
                return { word: w.word.toUpperCase(), hint: w.hint || "A mystery word." };
            }
            return null;
        }).filter(w => w !== null);

        s.incorrectGuesses = 0;
        s.guessedLetters = new Set();
        HangmanEngine.injectStyles();
        HangmanEngine.setupGame();
    },

    setupGame: () => {
        const s = HangmanEngine.state;
        if (s.words.length === 0) {
            s.container.innerHTML = `<div class="bento-card" style="color:red; text-align:center;">Error: No words provided for Hangman.</div>`;
            window.ManyaQuestRunner.enableButton(true);
            return;
        }

        const wordData = s.words[Math.floor(Math.random() * s.words.length)];
        s.currentWord = wordData.word; 
        s.hint = wordData.hint;
        
        // Treat spaces and hyphens as already guessed (so they appear on the board)
        s.hiddenWord = s.currentWord.split('').map(char => {
            if (char === ' ' || char === '-') {
                s.guessedLetters.add(char); 
                return char;
            }
            return '_';
        });

        HangmanEngine.render();
    },

    render: () => {
        const s = HangmanEngine.state;
        const currentHiddenWord = s.hiddenWord.join('').replace(/[ -]/g, '');
        const currentWordNoSpaces = s.currentWord.replace(/[ -]/g, '');
        const gameStatus = s.incorrectGuesses >= s.maxIncorrect ? 'LOST' : (currentHiddenWord === currentWordNoSpaces ? 'WON' : 'PLAYING');
        
        let statusMessage = '';
        let buttonAction = window.ManyaQuestRunner.next;

        if (gameStatus === 'LOST') {
            statusMessage = `<span class="hangman-msg-lost">YOU LOST! The word was: ${s.currentWord}</span>`;
            window.ManyaQuestRunner.enableButton(true, buttonAction, "CONTINUE");
        } else if (gameStatus === 'WON') {
            statusMessage = `<span class="hangman-msg-won">WELL DONE! You guessed the word!</span>`;
            window.ManyaQuestRunner.enableButton(true, buttonAction, "CONTINUE");
        } else {
            statusMessage = `<span class="hangman-msg-playing">Guess a letter. Incorrect: ${s.incorrectGuesses}/${s.maxIncorrect}</span>`;
            window.ManyaQuestRunner.enableButton(false);
        }

        s.container.innerHTML = `
            <div class="hangman-box card-pop">
                <div class="hangman-content-grid">
                    <div class="hangman-gallows-container">
                        ${HangmanEngine.drawGallows(s.incorrectGuesses, gameStatus)}
                    </div>
                    
                    <div class="hangman-info-area">
                        <div class="hangman-word-display">
                            ${s.hiddenWord.map(char => 
                                char === ' ' 
                                ? `<span class="word-char word-space"> </span>`
                                : `<span class="word-char">${char}</span>`
                            ).join('')}
                        </div>
                        <div class="hangman-status">${statusMessage}</div>
                        <div class="hangman-hint-card">💡 **HINT:** ${s.hint}</div>
                    </div>
                </div>
                
                <div class="hangman-keyboard-container">
                    ${HangmanEngine.renderKeyboard(gameStatus)}
                </div>
            </div>`;
    },

    handleGuess: (letter) => {
        const s = HangmanEngine.state;
        letter = letter.toUpperCase();
        
        if (s.guessedLetters.has(letter)) return;

        s.guessedLetters.add(letter);
        
        if (s.currentWord.includes(letter)) {
            for (let i = 0; i < s.currentWord.length; i++) {
                if (s.currentWord[i] === letter) {
                    s.hiddenWord[i] = letter;
                }
            }
        } else {
            s.incorrectGuesses++;
        }

        HangmanEngine.render();
    },

    renderKeyboard: (status) => {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return letters.split('').map(letter => {
            let className = 'key-btn';
            let isDisabled = status !== 'PLAYING';

            if (HangmanEngine.state.guessedLetters.has(letter)) {
                if (HangmanEngine.state.currentWord.includes(letter)) {
                    className += ' correct';
                } else {
                    className += ' incorrect';
                }
                isDisabled = true;
            }
            
            window.ManyaQuestRunner.HangmanEngine_handleGuess = HangmanEngine.handleGuess;

            return `<button class="${className}" ${isDisabled ? 'disabled' : ''} onclick="window.ManyaQuestRunner.HangmanEngine_handleGuess('${letter}')">${letter}</button>`;
        }).join('');
    },

    drawGallows: (stage, gameStatus) => {
        // 6 parts: Head, Body, L-Arm, R-Arm, L-Leg, R-Leg
        const parts = [
            'part-head', 
            'part-body', 
            'part-arm-l', 
            'part-arm-r', 
            'part-leg-l', 
            'part-leg-r'
        ];
        
        const activeParts = parts.slice(0, stage).map(p => `<div class="${p} active"></div>`).join('');
        
        const figureClass = (gameStatus === 'LOST' || gameStatus === 'WON') ? gameStatus.toLowerCase() : 'playing';

        return `
            <div class="hangman-gallows-structure">
                <div class="part-gallows-base"></div>
                <div class="part-gallows-post"></div>
                <div class="part-gallows-beam"></div>
                <div class="part-gallows-rope"></div>

                <div class="hangman-figure ${figureClass}">
                    ${activeParts}
                </div>
            </div>
        `;
    },

    injectStyles: () => {
        if (document.getElementById('hangman-v9-styles')) return;
        const style = document.createElement('style');
        style.id = 'hangman-v9-styles';
        style.innerHTML = `
            /* --- Layout (Reused) --- */
            .hangman-box { width: 100%; max-width: 480px; margin: 0 auto; padding: 15px 15px 0; display: flex; flex-direction: column; }
            .hangman-content-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 15px; margin-bottom: 10px; align-items: start; }
            .hangman-gallows-container { display: flex; justify-content: center; min-height: 140px; padding-top: 5px; }

            /* --- Gallows Structure --- */
            .hangman-gallows-structure { position: relative; width: 100%; max-width: 90px; height: 130px; }
            .part-gallows-base { position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: #666; }
            .part-gallows-post { position: absolute; bottom: 0; left: 10px; width: 3px; height: 100%; background: #666; }
            .part-gallows-beam { position: absolute; top: 0; left: 10px; width: 80px; height: 3px; background: #666; }
            .part-gallows-rope { position: absolute; top: 0; right: 20px; width: 3px; height: 20px; background: #666; }
            
            /* --- Man Figure: Fixed Cohesion & Swing --- */
            .hangman-figure {
                position: absolute;
                top: 20px;
                right: 17px;
                transform-origin: top center;
                width: 3px;
                animation: swing 3s ease-in-out infinite alternate;
            }
            .hangman-figure.lost, .hangman-figure.won {
                animation: none;
                transform: translateY(5px);
            }

            /* Man parts - THIN LINES & Positioning */
            .hangman-figure div[class^="part-"] {
                position: absolute;
                background: #ef4444; 
                transition: opacity 0.3s, transform 0.3s;
                opacity: 0;
            }
            .hangman-figure div.active { opacity: 1; }

            /* Head - Red dot */
            .part-head { 
                top: 0; 
                left: -6px; 
                width: 15px; 
                height: 15px; 
                border-radius: 50%; 
            }
            /* Body - Vertical line */
            .part-body { top: 15px; left: 0px; width: 3px; height: 30px; }

            /* Arms - Now correctly connecting to body (left: 3px centers it) */
            .part-arm-l { top: 20px; left: -15px; width: 15px; height: 3px; transform: rotate(-30deg); transform-origin: center right; }
            .part-arm-r { top: 20px; left: 3px; width: 15px; height: 3px; transform: rotate(30deg); transform-origin: center left; }
            
            /* Legs - Correctly connecting to the body (bottom of body is top: 45px) */
            .part-leg-l { top: 45px; left: -10px; width: 10px; height: 3px; transform: rotate(30deg); transform-origin: center right; }
            .part-leg-r { top: 45px; left: 3px; width: 10px; height: 3px; transform: rotate(-30deg); transform-origin: center left; }

            /* FINAL APPEARANCE */
            .part-head.active, .part-body.active { opacity: 1; transform: scale(1); }
            .part-arm-l.active, .part-arm-r.active, .part-leg-l.active, .part-leg-r.active { 
                opacity: 1; 
            }

            /* --- Word Display & Space FIX --- */
            .hangman-info-area { text-align: left; padding-top: 5px; }
            .hangman-word-display { 
                font-size: 2.0rem; 
                letter-spacing: 5px; 
                font-weight: 900; 
                margin-bottom: 10px; 
                color: #7e22ce;
                display: flex; 
                flex-wrap: wrap; 
                justify-content: flex-start;
                gap: 5px;
            }
            .word-char { 
                display: inline-block; 
                padding: 0 2px;
                min-width: 15px;
                text-align: center;
                line-height: 1;
                border-bottom: 3px solid #7e22ce;
            }
            .word-space {
                border-bottom: none !important; 
                width: 25px; 
            }

            /* --- Other Styles (Keyframe Animations, Keyboard, etc.) remain the same --- */
            .hangman-status { font-size: 1.0rem; }
            .hangman-hint-card { font-size: 12px; padding: 8px; min-height: 40px; margin-top: 8px; background: #f1f5f9; color: #475569;}
            .hangman-keyboard-container { width: 100%; margin-top: 15px; }
            .hangman-keyboard { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
            .key-btn { width: 30px; height: 30px; font-size: 14px; padding: 0; }
            .key-btn.correct { animation: correct-guess 0.3s; }
            .key-btn.incorrect { animation: incorrect-guess 0.3s; }
            @keyframes swing { 0% { transform: rotate(2deg); } 100% { transform: rotate(-2deg); } }
            @keyframes correct-guess { 0% { transform: scale(1); box-shadow: 0 0 10px #22c55e; } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
            @keyframes incorrect-guess { 0% { transform: translateX(0); } 25% { transform: translateX(-4px); } 50% { transform: translateX(4px); } 75% { transform: translateX(-4px); } 100% { transform: translateX(0); } }
        `;
        document.head.appendChild(style);
    }
};