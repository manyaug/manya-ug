export const JungleMazeEngine = {
    state: {
        levelIndex: 0,
        score: 0,
        lives: 5,
        playerRow: 0,
        playerCol: 0,
        startPos: { r: 0, c: 0 },
        isGameOver: true,
        obstacleInterval: null,
        movingObstacles: [],
        questData: [], 
        container: null,
        playerIcon: "",
        touchstartX: 0,
        touchstartY: 0
    },
    
    // --- 1. GAME LOGIC ---

    startGame: () => {
        const s = JungleMazeEngine.state;
        clearInterval(s.obstacleInterval);
        s.levelIndex = 0;
        s.score = 0;
        s.lives = 5; 
        s.isGameOver = false;
        
        // HIDE the main app footer to make room for game controls
        const mainFooter = document.querySelector('.manya-pwa-footer');
        if(mainFooter) mainFooter.style.display = 'none';

        JungleMazeEngine.loadLevel(s.levelIndex);
    },

    loadLevel: (levelIndex) => {
        const s = JungleMazeEngine.state;
        if (levelIndex >= s.questData.length) {
            JungleMazeEngine.endGame("complete");
            return;
        }

        clearInterval(s.obstacleInterval); 
        const currentLevel = s.questData[levelIndex];
        
        s.movingObstacles = JSON.parse(JSON.stringify(currentLevel.obstacles.map(obs => {
            const initialPos = obs.path[0];
            return {...obs, r: initialPos.r, c: initialPos.c, pathStep: 0 }; 
        })));
        
        const mazeData = currentLevel.maze;
        const rows = mazeData.length;
        const cols = mazeData[0].length;

        JungleMazeEngine.render(rows, cols, mazeData, currentLevel);
        
        // Find Start Position
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (mazeData[r][c] === 2) {
                    s.playerRow = r;
                    s.playerCol = c;
                    s.startPos = { r: r, c: c }; 
                    break;
                }
            }
        }
        
        JungleMazeEngine.updatePlayerPosition();
        JungleMazeEngine.startObstacleMovement();
        JungleMazeEngine.setupInputHandlers();
        JungleMazeEngine.updateUI();
    },
    
    updatePlayerPosition: () => {
        const s = JungleMazeEngine.state;
        const PLAYER_EL = document.getElementById('player');
        if (PLAYER_EL) {
            PLAYER_EL.style.transform = `translate(${s.playerCol * 100}%, ${s.playerRow * 100}%)`;
        }
    },
    
    attemptMove: (deltaRow, deltaCol) => {
        const s = JungleMazeEngine.state;
        if (s.isGameOver) return;
        
        const currentLevel = s.questData[s.levelIndex];
        const mazeData = currentLevel.maze;
        
        let newRow = s.playerRow + deltaRow;
        let newCol = s.playerCol + deltaCol;

        if (newRow < 0 || newCol < 0 || newRow >= mazeData.length || newCol >= mazeData[0].length || mazeData[newRow][newCol] === 1) {
            // Wall hit visual feedback could go here
            return;
        }

        s.playerRow = newRow;
        s.playerCol = newCol;
        JungleMazeEngine.updatePlayerPosition();
        JungleMazeEngine.checkCollisions(newRow, newCol);
    },

    checkCollisions: (r, c) => {
        const s = JungleMazeEngine.state;
        
        const hitObstacle = s.movingObstacles.some(obs => obs.r === r && obs.c === c);
        if (hitObstacle) {
            JungleMazeEngine.handleObstacleHit();
            return;
        }

        const tile = s.container.querySelector(`[data-r="${r}"][data-c="${c}"]`);
        if (tile && tile.classList.contains('answer-gate')) {
            JungleMazeEngine.handleAnswerGate(tile);
        }
    },

    startObstacleMovement: () => {
        const s = JungleMazeEngine.state;
        JungleMazeEngine.renderObstacles();
        
        s.obstacleInterval = setInterval(() => {
            if (s.isGameOver) return;
            
            s.movingObstacles.forEach(obs => {
                obs.pathStep = (obs.pathStep + 1) % obs.path.length;
                obs.r = obs.path[obs.pathStep].r;
                obs.c = obs.path[obs.pathStep].c;
                
                if (obs.r === s.playerRow && obs.c === s.playerCol) {
                    JungleMazeEngine.handleObstacleHit();
                }
            });
            
            JungleMazeEngine.renderObstacles();
        }, 500); 
    },
    
    renderObstacles: () => {
        const s = JungleMazeEngine.state;
        const MAZE_CONTAINER = document.getElementById('maze-container');
        if (!MAZE_CONTAINER) return;

        MAZE_CONTAINER.querySelectorAll('.obstacle').forEach(el => {
            el.classList.remove('obstacle', 'tiger', 'snake');
            if (!el.classList.contains('answer-gate')) el.innerHTML = ''; 
            if (el.classList.contains('answer-gate')) el.innerHTML = el.dataset.text; 
        });
        
        s.movingObstacles.forEach(obs => {
            const tile = MAZE_CONTAINER.querySelector(`[data-r="${obs.r}"][data-c="${obs.c}"]`);
            if (tile) {
                tile.classList.add('obstacle');
                if(obs.type === 'TIGER') {
                    tile.classList.add('tiger');
                    tile.innerHTML = '🐅';
                } else if (obs.type === 'SNAKE') {
                    tile.classList.add('snake');
                    tile.innerHTML = '🐍';
                } else {
                    tile.innerHTML = '⚠️';
                }
            }
        });
    },
    
    handleObstacleHit: () => {
        const s = JungleMazeEngine.state;
        if (s.isGameOver) return; 
        
        s.lives = Math.max(0, s.lives - 1); 
        JungleMazeEngine.updateUI();
        JungleMazeEngine.flashFeedback(`💥 OUCH! Lives: ${s.lives}`, 'bad');
        
        if (s.lives <= 0) {
            JungleMazeEngine.endGame("failed");
            return;
        }

        s.isGameOver = true; 
        setTimeout(() => {
            s.playerRow = s.startPos.r;
            s.playerCol = s.startPos.c;
            JungleMazeEngine.updatePlayerPosition();
            s.isGameOver = false; 
        }, 500);
    },

    handleAnswerGate: (tileElement) => {
        const s = JungleMazeEngine.state;
        if (s.isGameOver) return; 
        
        const isCorrect = tileElement.dataset.isCorrect === 'true';

        if (isCorrect) {
            s.score += 250; 
            s.isGameOver = true; 
            JungleMazeEngine.flashFeedback('🌟 CORRECT!', 'good');
            
            setTimeout(() => {
                s.levelIndex++;
                s.isGameOver = false;
                JungleMazeEngine.loadLevel(s.levelIndex);
            }, 1000);

        } else {
            s.lives = Math.max(0, s.lives - 1); 
            JungleMazeEngine.updateUI();
            JungleMazeEngine.flashFeedback(`❌ WRONG!`, 'bad');
            
            if (s.lives <= 0) {
                JungleMazeEngine.endGame("failed");
                return;
            }

            s.isGameOver = true; 
            setTimeout(() => {
                s.playerRow = s.startPos.r;
                s.playerCol = s.startPos.c;
                JungleMazeEngine.updatePlayerPosition();
                s.isGameOver = false; 
            }, 500); 
        }
    },

    flashFeedback: (msg, type) => {
        const fb = document.getElementById('feedback');
        if(fb) {
            fb.textContent = msg;
            fb.className = type; 
            setTimeout(() => { fb.className = ''; fb.textContent = ''; }, 1500);
        }
    },

    updateUI: () => {
        const s = JungleMazeEngine.state;
        const levelEl = document.getElementById('level-display');
        const scoreEl = document.getElementById('score-display');
        const livesEl = document.getElementById('lives-display');
        
        if(levelEl) levelEl.textContent = s.levelIndex + 1;
        if(scoreEl) scoreEl.textContent = s.score;
        
        if(livesEl) {
            livesEl.innerHTML = '';
            for (let i = 0; i < s.lives; i++) {
                livesEl.innerHTML += '❤️';
            }
        }
    },

    endGame: (status) => {
        const s = JungleMazeEngine.state;
        s.isGameOver = true;
        clearInterval(s.obstacleInterval);

        // RESTORE the main app footer so they can continue
        const mainFooter = document.querySelector('.manya-pwa-footer');
        if(mainFooter) mainFooter.style.display = 'flex';
        
        // Also enable the button inside it
        window.ManyaQuestRunner.enableButton(true, window.ManyaQuestRunner.next, "CONTINUE");

        const modal = document.createElement('div');
        modal.id = "game-over-screen";
        modal.innerHTML = `
            <div class="result-card">
                <div style="font-size: 3em;">${status === "failed" ? "💀" : "🏆"}</div>
                <h2 style="color: ${status === 'failed' ? '#ef4444' : '#16a34a'};">
                    ${status === "failed" ? "GAME OVER" : "YOU WON!"}
                </h2>
                <p>Final Score: ${s.score}</p>
            </div>
        `;
        s.container.appendChild(modal);
    },

    // --- 2. INPUT HANDLERS ---
    
    setupInputHandlers: () => {
        window.JungleMazeEngine_attemptMove = JungleMazeEngine.attemptMove;

        document.removeEventListener('keydown', JungleMazeEngine.handleKeyDown);
        document.addEventListener('keydown', JungleMazeEngine.handleKeyDown);
        
        const container = document.getElementById('maze-grid-wrapper');
        if(container) {
            container.removeEventListener('touchstart', JungleMazeEngine.handleTouchStart);
            container.removeEventListener('touchend', JungleMazeEngine.handleTouchEnd);
            container.addEventListener('touchstart', JungleMazeEngine.handleTouchStart, { passive: false });
            container.addEventListener('touchend', JungleMazeEngine.handleTouchEnd, { passive: false });
        }
    },

    handleKeyDown: (e) => {
        switch (e.key) {
            case 'ArrowUp': case 'w': JungleMazeEngine.attemptMove(-1, 0); break;
            case 'ArrowDown': case 's': JungleMazeEngine.attemptMove(1, 0); break;
            case 'ArrowLeft': case 'a': JungleMazeEngine.attemptMove(0, -1); break;
            case 'ArrowRight': case 'd': JungleMazeEngine.attemptMove(0, 1); break;
        }
    },

    handleTouchStart: (e) => {
        e.preventDefault(); 
        JungleMazeEngine.state.touchstartX = e.changedTouches[0].screenX;
        JungleMazeEngine.state.touchstartY = e.changedTouches[0].screenY;
    },

    handleTouchEnd: (e) => {
        e.preventDefault();
        const s = JungleMazeEngine.state;
        let touchendX = e.changedTouches[0].screenX;
        let touchendY = e.changedTouches[0].screenY;
        const xDiff = touchendX - s.touchstartX;
        const yDiff = touchendY - s.touchstartY;

        if (Math.abs(xDiff) > 20 || Math.abs(yDiff) > 20) {
            if (Math.abs(xDiff) > Math.abs(yDiff)) {
                JungleMazeEngine.attemptMove(0, xDiff > 0 ? 1 : -1);
            } else {
                JungleMazeEngine.attemptMove(yDiff > 0 ? 1 : -1, 0);
            }
        }
    },

    // --- 3. RENDERING ---
    
    render: (rows, cols, mazeData, currentLevel) => {
        const s = JungleMazeEngine.state;
        
        let gridHTML = '';
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tileType = mazeData[r][c];
                let classes = 'tile';
                let content = '';
                let extraAttr = '';

                if (tileType === 1) classes += ' wall';
                if (tileType === 2) { classes += ' start-tile'; content = '🏠'; }
                
                const answer = currentLevel.answers.find(ans => ans.r === r && ans.c === c);
                if (answer) {
                    classes += ' answer-gate';
                    extraAttr = `data-is-correct="${answer.isCorrect}" data-text="${answer.text}"`;
                    content = answer.text;
                }
                
                gridHTML += `<div class="${classes}" data-r="${r}" data-c="${c}" ${extraAttr}>${content}</div>`;
            }
        }

        s.container.innerHTML = `
            <div id="jungle-quest-shell">
                <div id="info-bar">
                    <div id="stats">
                        <span>Lvl: <span id="level-display">1</span></span>
                        <span>Score: <span id="score-display">0</span></span>
                        <span id="lives-display">❤️❤️❤️❤️❤️</span>
                    </div>
                    <div id="question-text">${currentLevel.question}</div>
                </div>

                <div id="feedback"></div>

                <div id="maze-grid-wrapper">
                    <div id="player"><img src="${s.playerIcon}" style="width:100%; height:100%; object-fit:contain;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHRleHQgeT0iMjAiIGZvbnQtc2l6ZT0iMjAiPvCfkTM8L3RleHQ+PC9zdmc+'"></div>
                    <div id="maze-container" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
                        ${gridHTML}
                    </div>
                </div>
                
                <!-- D-PAD CONTROLLER (Visible now) -->
                <div id="control-pad">
                    <div></div>
                    <button onclick="window.JungleMazeEngine_attemptMove(-1, 0)" class="c-btn c-up">▲</button>
                    <div></div>
                    <button onclick="window.JungleMazeEngine_attemptMove(0, -1)" class="c-btn c-left">◀</button>
                    <button onclick="window.JungleMazeEngine_attemptMove(1, 0)" class="c-btn c-down">▼</button>
                    <button onclick="window.JungleMazeEngine_attemptMove(0, 1)" class="c-btn c-right">▶</button>
                </div>
            </div>
        `;
    },

    renderLabeling: (container, data) => {
        JungleMazeEngine.state.container = container;
        JungleMazeEngine.state.questData = data.levels;
        // Fix for missing image: fallback to Manya icon or emoji if icon missing
        JungleMazeEngine.state.playerIcon = window.ManyaQuestRunner?.CHAR_ICONS?.manya || "assets/images/manya_icon.png";
        
        JungleMazeEngine.injectStyles();
        JungleMazeEngine.startGame();
    },

    injectStyles: () => {
        if (document.getElementById('jungle-maze-v3-styles')) return;
        const style = document.createElement('style');
        style.id = 'jungle-maze-v3-styles';
        style.innerHTML = `
            #jungle-quest-shell {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%; 
                height: 100%;
                overflow: hidden; /* Prevent body scroll */
                position: relative;
            }
            
            /* Info Bar - Compact & Top */
            #info-bar {
                background-color: white;
                padding: 10px;
                border-bottom: 2px solid #e5e7eb;
                width: 100%;
                flex-shrink: 0;
                z-index: 20;
            }
            #stats { display: flex; justify-content: space-between; font-weight: 700; color: #7e22ce; font-size: 0.9rem; }
            #question-text { font-size: 0.95rem; font-weight: 800; color: #1e293b; margin-top: 5px; line-height: 1.2; text-align:center;}

            /* Feedback Area - Small buffer */
            #feedback { 
                height: 24px; 
                font-weight: 800; 
                font-size: 0.9rem; 
                text-align: center; 
                color: #7e22ce;
                margin: 5px 0;
                flex-shrink: 0;
            }
            #feedback.good { color: #16a34a; }
            #feedback.bad { color: #ef4444; }

            /* Maze Grid - AUTO FIT */
            #maze-grid-wrapper {
                position: relative;
                width: 90vw; /* Use Viewport Width */
                height: 90vw; /* Keep Aspect Ratio Square */
                max-width: 400px;
                max-height: 400px; /* Don't get too big on desktop */
                border: 3px solid #1e293b;
                border-radius: 8px;
                overflow: hidden;
                background-color: #334155; /* Dark background for maze contrast */
                flex-shrink: 0; /* Crucial: Don't squash */
                margin: 0 auto;
            }
            #maze-container { display: grid; width: 100%; height: 100%; }

            /* Tiles */
            .tile { display: flex; justify-content: center; align-items: center; border: 1px solid rgba(255,255,255,0.05); font-size: 0.5rem; font-weight: bold; text-align: center; overflow: hidden; color: white;}
            .wall { background-color: #475569; border-color: #334155; }
            .start-tile { background-color: #bbf7d0; }
            
            /* Answer Gates - High Contrast */
            .answer-gate { 
                background-color: #d8b4fe; 
                color: #581c87; 
                border: 1px solid white; 
                font-size: 8px; /* Force small text to fit 16x16 */
                line-height: 1;
                z-index: 1;
                word-break: break-all;
            }

            /* Player */
            #player { position: absolute; width: 6.25%; height: 6.25%; transition: transform 0.2s linear; z-index: 10; }

            /* Obstacles */
            .obstacle { font-size: 14px; z-index: 5; }
            .tiger, .snake { transition: all 0.5s linear; }

            /* D-PAD CONTROLS - Fixed at Bottom */
            #control-pad {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 8px;
                width: 180px;
                margin-top: auto; /* Push to bottom of container */
                margin-bottom: 20px;
                flex-shrink: 0;
            }
            .c-btn {
                background: #f1f5f9;
                border: 2px solid #cbd5e1;
                border-radius: 12px; /* Rounder buttons */
                font-size: 1.5rem;
                padding: 12px 0;
                color: #475569;
                cursor: pointer;
                box-shadow: 0 4px 0 #cbd5e1; /* Button depth */
                transition: transform 0.1s;
                touch-action: manipulation; /* Faster touch response */
            }
            .c-btn:active { transform: translateY(4px); box-shadow: 0 0 0; background: #e2e8f0; }

            /* Game Over Modal */
            #game-over-screen { position: absolute; inset: 0; background: rgba(0,0,0,0.9); display: flex; justify-content: center; align-items: center; z-index: 50; }
            .result-card { background: white; padding: 30px; border-radius: 20px; text-align: center; width: 80%; }
        `;
        document.head.appendChild(style);
    }
};