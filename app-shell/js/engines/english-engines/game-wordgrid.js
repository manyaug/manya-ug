export const WordGridEngine = {
    state: {
        container: null,
        wordsToFind: [], 
        wordsToPlace: [],   
        grid: [],           
        size: 8,            
        foundWords: new Set(),
        currentSelection: [], 
        score: 0,
        timer: 0,
        timerInterval: null,
        isMouseDown: false // New state for tracking start/end events globally
    },

    // --- Core Logic (Grid Generation and Word Placement) ---

    generateGrid: (words) => {
        const s = WordGridEngine.state;
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const newGrid = Array(s.size).fill(0).map(() => Array(s.size).fill(''));

        const directions = [
            {r: 0, c: 1}, {r: 1, c: 0}, {r: 1, c: 1}, 
            {r: 0, c: -1}, {r: -1, c: 0}, {r: -1, c: -1}, 
            {r: 1, c: -1}, {r: -1, c: 1}
        ];

        const placementWords = s.wordsToPlace.map(w => w); 
        placementWords.sort((a, b) => b.length - a.length);

        placementWords.forEach(word => {
            const letters = word.toUpperCase().split('');
            const wordLength = letters.length;

            if (wordLength > s.size) return; 

            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 100) {
                attempts++;
                const dir = directions[Math.floor(Math.random() * directions.length)];
                const startR = Math.floor(Math.random() * s.size);
                const startC = Math.floor(Math.random() * s.size);

                let possible = true;
                let placement = [];

                for (let i = 0; i < wordLength; i++) {
                    const r = startR + i * dir.r;
                    const c = startC + i * dir.c;

                    if (r < 0 || r >= s.size || c < 0 || c >= s.size) {
                        possible = false;
                        break;
                    }

                    if (newGrid[r][c] !== '' && newGrid[r][c] !== letters[i]) {
                        possible = false;
                        break;
                    }
                    placement.push({r, c});
                }

                if (possible) {
                    placement.forEach((pos, i) => {
                        newGrid[pos.r][pos.c] = letters[i];
                    });
                    placed = true;
                }
            }
        });

        // Fill empty cells with random letters
        for (let r = 0; r < s.size; r++) {
            for (let c = 0; c < s.size; c++) {
                if (newGrid[r][c] === '') {
                    newGrid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
                }
            }
        }

        s.grid = newGrid;
    },

    // --- Setup and Timer ---

    renderLabeling: async (container, data) => {
        const s = WordGridEngine.state;
        s.container = container;
        
        const rawWords = data.words.map(w => {
            if (typeof w === 'string') return w;
            if (w && w.word) return w.word;
            return null;
        }).filter(w => w !== null);
        
        s.wordsToFind = rawWords.map(w => w.toUpperCase());
        s.wordsToPlace = s.wordsToFind.map(w => w.replace(/[- ]/g, ''));
        
        s.foundWords = new Set();
        s.score = 0;
        s.currentSelection = [];
        s.timer = 0;
        s.size = data.size || 8; 
        s.isMouseDown = false;

        WordGridEngine.generateGrid(s.wordsToFind);
        WordGridEngine.injectStyles();
        WordGridEngine.render();
        WordGridEngine.startTimer();

        // Expose handlers globally
        window.ManyaQuestRunner.WordGridEngine_handleStart = WordGridEngine.handleStart;
        window.ManyaQuestRunner.WordGridEngine_handleMove = WordGridEngine.handleMove;
        
        // Use a single, robust global event handler for release
        window.ManyaQuestRunner.WordGridEngine_handleGlobalEnd = () => {
            if (WordGridEngine.state.isMouseDown) {
                WordGridEngine.state.isMouseDown = false;
                WordGridEngine.handleEnd();
            }
        };

        // Attach global listeners for touch/mouse release
        document.removeEventListener('mouseup', window.ManyaQuestRunner.WordGridEngine_handleGlobalEnd);
        document.removeEventListener('touchend', window.ManyaQuestRunner.WordGridEngine_handleGlobalEnd);
        document.addEventListener('mouseup', window.ManyaQuestRunner.WordGridEngine_handleGlobalEnd);
        document.addEventListener('touchend', window.ManyaQuestRunner.WordGridEngine_handleGlobalEnd);
    },

    startTimer: () => {
        if (WordGridEngine.state.timerInterval) clearInterval(WordGridEngine.state.timerInterval);
        WordGridEngine.state.timerInterval = setInterval(() => {
            WordGridEngine.state.timer++;
            const timerEl = document.getElementById('grid-timer');
            if(timerEl) timerEl.innerText = `Time: ${WordGridEngine.state.timer} sec`;
        }, 1000);
    },

    stopTimer: () => {
        if (WordGridEngine.state.timerInterval) clearInterval(WordGridEngine.state.timerInterval);
        WordGridEngine.state.timerInterval = null;
    },

    // --- Touch/Mouse Handlers ---

    isAdjacent: (p1, p2) => Math.abs(p1.r - p2.r) <= 1 && Math.abs(p1.c - p2.c) <= 1,

    handleStart: (r, c) => {
        const s = WordGridEngine.state;
        if (s.foundWords.size === s.wordsToPlace.length) return; 
        s.isMouseDown = true; // Set flag
        s.currentSelection = [{r, c}];
        WordGridEngine.highlightSelection();
    },

    handleMove: (r, c) => {
        const s = WordGridEngine.state;
        if (!s.isMouseDown) return; // Only process move if a selection has started

        const lastPos = s.currentSelection[s.currentSelection.length - 1];
        const newPos = {r, c};

        if (WordGridEngine.isAdjacent(lastPos, newPos)) {
            const existingIndex = s.currentSelection.findIndex(p => p.r === r && p.c === c);
            
            if (existingIndex !== -1 && existingIndex === s.currentSelection.length - 2) {
                s.currentSelection.pop(); // Moving back
            } else if (existingIndex === -1) {
                // Ensure movement is along a straight line (Horizontal, Vertical, or Diagonal)
                const isFirstMove = s.currentSelection.length === 1;
                const isStraight = s.currentSelection.length < 2 || (
                    s.currentSelection[1].r - s.currentSelection[0].r === newPos.r - lastPos.r &&
                    s.currentSelection[1].c - s.currentSelection[0].c === newPos.c - lastPos.c
                );
                
                if (isFirstMove || isStraight) {
                    s.currentSelection.push(newPos);
                }
            }
        }
        WordGridEngine.highlightSelection();
    },

    handleEnd: () => {
        const s = WordGridEngine.state;
        s.isMouseDown = false; // Reset the flag
        
        if (s.currentSelection.length < 2) {
            s.currentSelection = [];
            WordGridEngine.render();
            return;
        }

        // 1. Build the selected word string (stripped for comparison)
        const selectedWord = s.currentSelection.map(p => s.grid[p.r][p.c]).join('');
        
        // 2. Check if it's a target word or its reverse
        const isForwardMatch = s.wordsToPlace.includes(selectedWord);
        const isReverseMatch = s.wordsToPlace.includes(selectedWord.split('').reverse().join(''));

        if ((isForwardMatch || isReverseMatch) && !s.foundWords.has(selectedWord)) {
            // Success!
            const matchedWord = isForwardMatch ? selectedWord : selectedWord.split('').reverse().join('');
            
            s.foundWords.add(matchedWord);
            s.score += 10;
        } else {
            // Failed guess - penalty
            s.score = Math.max(0, s.score - 2); 
        }

        s.currentSelection = [];
        WordGridEngine.render();

        // 3. Check for game end
        if (s.foundWords.size === s.wordsToPlace.length) {
            WordGridEngine.stopTimer();
            window.ManyaQuestRunner.enableButton(true, null, `COMPLETE (+${s.score} Points)!`);
        }
    },

    highlightSelection: () => {
        const s = WordGridEngine.state;
        WordGridEngine.render(); 
        
        s.currentSelection.forEach(p => {
            const cell = document.getElementById(`cell-${p.r}-${p.c}`);
            if (cell) cell.classList.add('is-selecting');
        });
    },

    // --- Rendering ---

    render: () => {
        const s = WordGridEngine.state;
        const isGameOver = s.foundWords.size === s.wordsToPlace.length;

        const gridHTML = s.grid.map((row, r) =>
            row.map((letter, c) => {
                let classes = 'grid-cell';
                
                // Add mouse/touch handlers
                const handlers = isGameOver ? '' : `
                    onmousedown="window.ManyaQuestRunner.WordGridEngine_handleStart(${r}, ${c});"
                    onmouseover="window.ManyaQuestRunner.WordGridEngine_handleMove(${r}, ${c});"
                    ontouchstart="window.ManyaQuestRunner.WordGridEngine_handleStart(${r}, ${c});"
                    ontouchmove="window.ManyaQuestRunner.WordGridEngine_handleMove(${r}, ${c});"
                `;
                
                return `<div id="cell-${r}-${c}" class="${classes}" ${handlers}>${letter}</div>`;
            }).join('')
        ).join('');

        const wordsToDisplay = s.wordsToFind.map(w => {
            const isFound = s.foundWords.has(w.replace(/[- ]/g, ''));
            return `<span class="word-target ${isFound ? 'is-complete' : ''}">${w}</span>`;
        }).join('');

        s.container.innerHTML = `
            <div class="wordgrid-box card-pop">
                <div class="wordgrid-header">
                    <div id="grid-timer">Time: ${s.timer} sec</div>
                    <div>Score: ${s.score}</div>
                </div>
                
                <div class="wordgrid-target-list">
                    ${wordsToDisplay}
                </div>

                <div class="wordgrid-grid">
                    ${gridHTML}
                </div>
                
                <div class="wordgrid-footer">
                    <p>Find the ${s.wordsToPlace.length} words in the grid!</p>
                </div>
            </div>`;
    },

    injectStyles: () => {
        if (document.getElementById('wordgrid-v2-styles')) return;
        const style = document.createElement('style');
        style.id = 'wordgrid-v2-styles';
        style.innerHTML = `
            /* ... (Styles are the same, just updated version number) ... */
            .wordgrid-box { 
                width: 100%; 
                max-width: 450px; 
                margin: 0 auto;
                padding: 15px; 
                display: flex; 
                flex-direction: column;
                align-items: center;
            }
            .wordgrid-header {
                display: flex;
                justify-content: space-between;
                width: 100%;
                font-weight: 700;
                color: #7e22ce;
                margin-bottom: 10px;
                font-size: 1.1rem;
            }
            .wordgrid-target-list {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 8px;
                margin-bottom: 15px;
            }
            .word-target {
                padding: 5px 10px;
                border: 2px solid #ddd6fe;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                color: #1e293b;
                text-transform: uppercase;
                transition: all 0.3s;
            }
            .word-target.is-complete {
                background: #dcfce7;
                border-color: #4ade80;
                color: #16a34a;
                text-decoration: line-through;
            }
            
            /* --- Grid Styles --- */
            .wordgrid-grid {
                display: grid;
                grid-template-columns: repeat(8, 1fr);
                grid-template-rows: repeat(8, 1fr);
                width: 100%;
                aspect-ratio: 1 / 1; 
                border: 2px solid #ccc;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                user-select: none; 
                touch-action: none; 
            }
            .grid-cell {
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 1.1rem;
                font-weight: 800;
                border: 1px solid #eee;
                cursor: pointer;
                background: white;
                color: #1e293b;
            }
            .grid-cell.is-selecting {
                background: #f3e8ff;
                color: #7e22ce;
                animation: pulse 0.3s ease-in-out;
            }
            .grid-cell.is-found {
                background: #a7f3d0;
                color: #16a34a;
                font-weight: 900;
            }

            .wordgrid-footer {
                margin-top: 15px;
                font-style: italic;
                color: #64748b;
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
};