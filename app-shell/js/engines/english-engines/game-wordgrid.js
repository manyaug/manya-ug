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
        isMouseDown: false, 
        isGameOver: false, 
        gridElement: null
    },

    // --- Core Logic (Grid Generation and Word Placement) remains the same ---
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
        s.isGameOver = false;
        s.gridElement = null; 

        WordGridEngine.generateGrid(s.wordsToFind);
        WordGridEngine.injectStyles();
        WordGridEngine.render();
        WordGridEngine.startTimer();

        // Expose handlers globally
        window.ManyaQuestRunner.WordGridEngine_handleStart = WordGridEngine.handleStart;
        
        // CRITICAL MOBILE FIX: Attach global listeners for touch/mouse release
        document.removeEventListener('mouseup', WordGridEngine.handleGlobalEnd);
        document.removeEventListener('touchend', WordGridEngine.handleGlobalEnd);
        document.addEventListener('mouseup', WordGridEngine.handleGlobalEnd);
        document.addEventListener('touchend', WordGridEngine.handleGlobalEnd);
        
        // CRITICAL MOBILE FIX: Attach move handler to the document for drag coverage
        const moveHandler = (event) => {
            if (!s.isMouseDown || s.isGameOver) return;
            event.preventDefault(); 

            const clientX = event.touches ? event.touches[0].clientX : event.clientX;
            const clientY = event.touches ? event.touches[0].clientY : event.clientY;
            
            const target = document.elementFromPoint(clientX, clientY);
            
            if (target && target.classList.contains('grid-cell') && target.parentElement.id === 'wordgrid-grid') {
                const parts = target.id.split('-');
                const r = parseInt(parts[1]);
                const c = parseInt(parts[2]);
                WordGridEngine.handleMove(r, c);
            }
        };

        document.removeEventListener('mousemove', window.ManyaQuestRunner.WordGridEngine_moveHandler);
        document.removeEventListener('touchmove', window.ManyaQuestRunner.WordGridEngine_moveHandler);
        
        window.ManyaQuestRunner.WordGridEngine_moveHandler = moveHandler;
        
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('touchmove', moveHandler, { passive: false }); 
    },

    startTimer: () => {
        if (WordGridEngine.state.timerInterval) clearInterval(WordGridEngine.state.timerInterval);
        WordGridEngine.state.timerInterval = setInterval(() => {
            WordGridEngine.state.timer++;
            const timerEl = document.getElementById('grid-timer');
            const scoreEl = document.getElementById('grid-score');
            if(timerEl) timerEl.innerText = `Time: ${WordGridEngine.state.timer} sec`;
            if(scoreEl) scoreEl.innerText = `Score: ${WordGridEngine.state.score}`;
        }, 1000);
    },

    stopTimer: () => {
        if (WordGridEngine.state.timerInterval) clearInterval(WordGridEngine.state.timerInterval);
        WordGridEngine.state.timerInterval = null;
    },
    
    // Global End Handler: Calls handleEnd if a selection was in progress
    handleGlobalEnd: () => {
        if (WordGridEngine.state.isMouseDown) {
            WordGridEngine.state.isMouseDown = false;
            WordGridEngine.handleEnd();
        }
    },

    // --- Touch/Mouse Handlers ---

    isAdjacent: (p1, p2) => Math.abs(p1.r - p2.r) <= 1 && Math.abs(p1.c - p2.c) <= 1,

    handleStart: (r, c) => {
        const s = WordGridEngine.state;
        if (s.isGameOver) return;
        s.isMouseDown = true; 
        s.currentSelection = [{r, c}];
        WordGridEngine.highlightSelection();
    },

    handleMove: (r, c) => {
        const s = WordGridEngine.state;
        if (!s.isMouseDown) return; 

        const lastPos = s.currentSelection[s.currentSelection.length - 1];
        const newPos = {r, c};
        
        if (WordGridEngine.isAdjacent(lastPos, newPos)) {
            const existingIndex = s.currentSelection.findIndex(p => p.r === r && p.c === c);
            
            if (existingIndex !== -1 && existingIndex === s.currentSelection.length - 2) {
                s.currentSelection.pop(); 
            } else if (existingIndex === -1) {
                
                if (s.currentSelection.length >= 2) {
                    const p0 = s.currentSelection[0];
                    const p1 = s.currentSelection[1];
                    const dirR = p1.r - p0.r;
                    const dirC = p1.c - p0.c;
                    
                    const nextR = lastPos.r + dirR;
                    const nextC = lastPos.c + dirC;

                    if (nextR === newPos.r && nextC === newPos.c) {
                        s.currentSelection.push(newPos);
                    }
                } else {
                    s.currentSelection.push(newPos); 
                }
            }
        }
        WordGridEngine.highlightSelection(); // Real-time highlight feedback
    },

    handleEnd: () => {
        const s = WordGridEngine.state;
        s.isMouseDown = false;
        
        if (s.currentSelection.length < 2) {
            WordGridEngine.clearSelection();
            return;
        }

        const selectedWord = s.currentSelection.map(p => s.grid[p.r][p.c]).join('');
        
        const isForwardMatch = s.wordsToPlace.includes(selectedWord);
        const isReverseMatch = s.wordsToPlace.includes(selectedWord.split('').reverse().join(''));

        if ((isForwardMatch || isReverseMatch) && !s.foundWords.has(selectedWord)) {
            const matchedWord = isForwardMatch ? selectedWord : selectedWord.split('').reverse().join('');
            
            s.foundWords.add(matchedWord);
            s.score += 10;
            WordGridEngine.renderSuccess(s.currentSelection); // Persist highlight
        } else {
            s.score = Math.max(0, s.score - 2); 
            WordGridEngine.renderFailure(); // Animate failure/clear
        }

        s.currentSelection = [];
        // No full render here for performance, only after a small delay if failure
        
        if (s.foundWords.size === s.wordsToPlace.length) {
            s.isGameOver = true; 
            WordGridEngine.stopTimer();
            window.ManyaQuestRunner.enableButton(true, null, `COMPLETE (+${s.score} Points)!`);
        }
    },

    clearSelection: () => {
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('is-selecting');
        });
        WordGridEngine.state.currentSelection = [];
        WordGridEngine.updateInfo(); // Update only score/word list
    },

    renderSuccess: (cells) => {
        cells.forEach(p => {
            const cell = document.getElementById(`cell-${p.r}-${p.c}`);
            if (cell) {
                cell.classList.remove('is-selecting');
                cell.classList.add('is-found');
            }
        });
        WordGridEngine.updateInfo();
    },
    
    renderFailure: () => {
        document.querySelectorAll('.is-selecting').forEach(cell => {
            cell.classList.add('is-failed'); // Trigger shake/fail animation
        });
        setTimeout(() => {
            WordGridEngine.clearSelection();
            WordGridEngine.updateInfo();
        }, 500); // Clear after animation
    },

    highlightSelection: () => {
        // Clear previous visual state instantly
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('is-selecting');
        });
        // Apply new visual state
        WordGridEngine.state.currentSelection.forEach(p => {
            const cell = document.getElementById(`cell-${p.r}-${p.c}`);
            if (cell) cell.classList.add('is-selecting');
        });
    },

    updateInfo: () => {
        const s = WordGridEngine.state;
        const scoreEl = document.getElementById('grid-score');
        if(scoreEl) scoreEl.innerText = `Score: ${s.score}`;

        // Update word list completion status
        const wordsToDisplay = s.wordsToFind.map(w => {
            const isFound = s.foundWords.has(w.replace(/[- ]/g, ''));
            return `<span class="word-target ${isFound ? 'is-complete' : ''}">${w}</span>`;
        }).join('');

        const targetListEl = document.getElementById('wordgrid-target-list');
        if(targetListEl) targetListEl.innerHTML = wordsToDisplay;
    },

    // --- Rendering ---

    render: () => {
        const s = WordGridEngine.state;

        const gridHTML = s.grid.map((row, r) =>
            row.map((letter, c) => {
                let classes = 'grid-cell';
                
                // Add handlers
                const handlers = s.isGameOver ? '' : `
                    onmousedown="window.ManyaQuestRunner.WordGridEngine_handleStart(${r}, ${c});"
                    ontouchstart="window.ManyaQuestRunner.WordGridEngine_handleStart(${r}, ${c});"
                `;
                
                return `<div id="cell-${r}-${c}" class="${classes}" ${handlers}>${letter}</div>`;
            }).join('')
        ).join('');

        s.container.innerHTML = `
            <div class="wordgrid-box card-pop">
                <div class="wordgrid-header">
                    <div id="grid-timer">Time: ${s.timer} sec</div>
                    <div id="grid-score">Score: ${s.score}</div>
                </div>
                
                <div class="wordgrid-target-list" id="wordgrid-target-list">
                    ${WordGridEngine.state.wordsToFind.map(w => {
                        const isFound = s.foundWords.has(w.replace(/[- ]/g, ''));
                        return `<span class="word-target ${isFound ? 'is-complete' : ''}">${w}</span>`;
                    }).join('')}
                </div>

                <div class="wordgrid-grid" id="wordgrid-grid">
                    ${gridHTML}
                </div>
                
                <div class="wordgrid-footer">
                    <p>Find the ${s.wordsToPlace.length} words in the grid!</p>
                </div>
            </div>`;
    },

    injectStyles: () => {
        if (document.getElementById('wordgrid-v5-styles')) return;
        const style = document.createElement('style');
        style.id = 'wordgrid-v5-styles';
        style.innerHTML = `
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
            /* Selection Highlight (Soft color for drag) */
            .grid-cell.is-selecting {
                background: #f3e8ff;
                color: #7e22ce;
            }
            /* Found Word Highlight (Persistent Green) */
            .grid-cell.is-found {
                background: #a7f3d0;
                color: #16a34a;
                font-weight: 900;
                animation: found-pop 0.5s ease-out;
            }
            /* Failure Animation (Shake + color change) */
            .grid-cell.is-failed {
                background: #fecaca;
                color: #dc2626;
                animation: selection-shake 0.5s ease-in-out;
            }

            .wordgrid-footer {
                margin-top: 15px;
                font-style: italic;
                color: #64748b;
            }

            @keyframes found-pop {
                0% { transform: scale(1); box-shadow: 0 0 10px #4ade80; }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            @keyframes selection-shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-3px); }
                50% { transform: translateX(3px); }
                75% { transform: translateX(-3px); }
            }
        `;
        document.head.appendChild(style);
    }
};