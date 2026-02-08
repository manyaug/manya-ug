export const HarvestGameEngine = {
    state: {
        container: null,
        config: null,
        score: 0,
        lives: 3,
        playerPos: 'left', // 'left' or 'right'
        fallingItems: [], 
        gameLoopId: null,
        spawnIntervalId: null,
        isGameOver: false,
        gameStarted: false, // New state for start screen
        speedMultiplier: 1,
        playerIcon: "/assets/icons/manya_icon.png"
    },

    renderLabeling: async (container, data) => {
        const s = HarvestGameEngine.state;
        s.container = container;
        s.config = data; 
        s.score = 0;
        s.lives = 3;
        s.fallingItems = [];
        s.speedMultiplier = 1;
        s.isGameOver = false;
        s.gameStarted = false;
        
        s.playerIcon = window.ManyaQuestRunner?.CHAR_ICONS?.manya || s.playerIcon;

        // Hide main footer
        window.ManyaQuestRunner.enableButton(false);

        HarvestGameEngine.injectStyles();
        HarvestGameEngine.render();
    },

    startGame: () => {
        const s = HarvestGameEngine.state;
        s.gameStarted = true;
        
        // Hide Start Overlay
        const overlay = document.getElementById('harvest-start-overlay');
        if(overlay) overlay.style.display = 'none';

        // Start Loops
        s.gameLoopId = requestAnimationFrame(HarvestGameEngine.updateLoop);
        s.spawnIntervalId = setInterval(HarvestGameEngine.spawnWord, 2000);
    },

    spawnWord: () => {
        const s = HarvestGameEngine.state;
        if (s.isGameOver || !s.gameStarted) return;

        const wordObj = s.config.words[Math.floor(Math.random() * s.config.words.length)];
        
        // Randomly pick which lane the fruit falls in
        const lane = Math.random() < 0.5 ? 'left' : 'right';
        
        const newItem = {
            id: Date.now() + Math.random(),
            text: wordObj.text,
            type: wordObj.type, 
            y: -15, // Start further up
            lane: lane,
            speed: (0.4 + (Math.random() * 0.2)) * s.speedMultiplier,
            element: null
        };

        s.fallingItems.push(newItem);
        
        const itemEl = document.createElement('div');
        itemEl.className = `falling-fruit ${newItem.lane}`;
        // Visually differentiating apples (Red) vs perhaps Mangoes (Yellow) or just nice apples
        itemEl.innerHTML = `
            <div class="fruit-visual">
                <div class="fruit-stem"></div>
                <div class="fruit-leaf"></div>
                <div class="fruit-body"></div>
                <div class="fruit-shine"></div>
            </div>
            <div class="fruit-label">${newItem.text}</div>
        `;
        itemEl.id = `fruit-${newItem.id}`;
        document.getElementById('harvest-sky').appendChild(itemEl);
        
        newItem.element = itemEl;
        s.speedMultiplier += 0.01; // Gentle difficulty curve
    },

    updateLoop: () => {
        const s = HarvestGameEngine.state;
        if (s.isGameOver) return;

        s.fallingItems.forEach((item, index) => {
            item.y += item.speed;
            
            if (item.element) {
                item.element.style.top = `${item.y}%`;
            }

            // Catch Zone (Player Height)
            if (item.y > 80 && item.y < 88) {
                if (!item.checked) {
                    HarvestGameEngine.checkCatch(item);
                    item.checked = true;
                }
            }

            // Missed (Hit Ground)
            if (item.y > 92) {
                HarvestGameEngine.removeFruit(index, false); 
            }
        });

        s.fallingItems = s.fallingItems.filter(i => i.active !== false);
        s.gameLoopId = requestAnimationFrame(HarvestGameEngine.updateLoop);
    },

    checkCatch: (item) => {
        const s = HarvestGameEngine.state;
        
        // Did player catch it? (Is player in same lane as fruit?)
        if (s.playerPos === item.lane) {
            
            // Check Logic: Does fruit type match the lane's category?
            // Left Lane = Config Left Category
            // Right Lane = Config Right Category
            const zoneCategory = s.playerPos === 'left' ? s.config.leftCategory : s.config.rightCategory;

            if (item.type === zoneCategory) {
                // Good Catch!
                s.score += 10;
                HarvestGameEngine.showFeedback(item.lane, "✨ +10", "good");
                HarvestGameEngine.animateBasket("good");
            } else {
                // Caught Wrong Item!
                s.lives--;
                HarvestGameEngine.showFeedback(item.lane, "❌ Oops!", "bad");
                HarvestGameEngine.animateBasket("bad");
                HarvestGameEngine.loseLife();
            }
            
            item.active = false; // Poof
            if(item.element) item.element.remove();
        }
    },

    removeFruit: (index, caught) => {
        const s = HarvestGameEngine.state;
        const item = s.fallingItems[index];
        if (!item || item.active === false) return;

        // Hit ground animation
        const splat = document.createElement('div');
        splat.className = `splat-effect ${item.lane}`;
        splat.innerText = "💨";
        document.getElementById('harvest-ground').appendChild(splat);
        setTimeout(() => splat.remove(), 500);
        
        item.active = false;
        if(item.element) item.element.remove();
    },

    loseLife: () => {
        const s = HarvestGameEngine.state;
        HarvestGameEngine.updateUI();
        
        const shell = document.querySelector('.harvest-game-shell');
        shell.classList.add('shake-screen');
        setTimeout(() => shell.classList.remove('shake-screen'), 400);

        if (s.lives <= 0) {
            HarvestGameEngine.endGame();
        }
    },

    // --- Input Handling ---
    handleInput: (side) => {
        const s = HarvestGameEngine.state;
        if (!s.gameStarted || s.isGameOver) return;
        
        s.playerPos = side;
        const playerEl = document.getElementById('harvest-player');
        
        if (side === 'left') {
            playerEl.classList.remove('pos-right');
            playerEl.classList.add('pos-left');
        } else {
            playerEl.classList.remove('pos-left');
            playerEl.classList.add('pos-right');
        }
    },

    updateUI: () => {
        const s = HarvestGameEngine.state;
        document.getElementById('harvest-score').innerText = s.score;
        const hearts = "❤️".repeat(s.lives) + "🤍".repeat(3 - s.lives);
        document.getElementById('harvest-lives').innerText = hearts;
    },

    showFeedback: (lane, text, type) => {
        const el = document.createElement('div');
        el.className = `float-score ${type} ${lane}`;
        el.innerText = text;
        document.querySelector('.harvest-game-shell').appendChild(el);
        setTimeout(() => el.remove(), 800);
    },

    animateBasket: (type) => {
        const player = document.getElementById('harvest-player');
        player.classList.add(type === 'good' ? 'bounce' : 'wobble');
        setTimeout(() => player.classList.remove('bounce', 'wobble'), 400);
    },

    endGame: () => {
        const s = HarvestGameEngine.state;
        s.isGameOver = true;
        cancelAnimationFrame(s.gameLoopId);
        clearInterval(s.spawnIntervalId);

        s.container.innerHTML = `
            <div class="bento-card" style="text-align:center; padding:40px; margin-top:20%; animation: popIn 0.5s;">
                <div style="font-size:4rem; margin-bottom:10px;">🧺</div>
                <h1 style="color:#1e293b;">HARVEST COMPLETE!</h1>
                <p>Final Score</p>
                <div class="score-badge-large">${s.score}</div>
                <button class="manya-pill-btn" onclick="window.ManyaQuestRunner.next()" style="margin-top:20px;">CONTINUE</button>
            </div>
        `;
        window.ManyaQuestRunner.enableButton(true);
    },

    render: () => {
        const s = HarvestGameEngine.state;
        const leftLabel = s.config.leftCategory;
        const rightLabel = s.config.rightCategory;

        s.container.innerHTML = `
            <div class="harvest-game-shell">
                <!-- UI BAR -->
                <div class="harvest-ui-bar">
                    <div class="score-pill">🌟 <span id="harvest-score">0</span></div>
                    <div class="lives-pill" id="harvest-lives">❤️❤️❤️</div>
                </div>

                <!-- ZONE BACKGROUNDS -->
                <div class="zone-bg left-zone">
                    <div class="zone-label">${leftLabel}</div>
                </div>
                <div class="zone-bg right-zone">
                    <div class="zone-label">${rightLabel}</div>
                </div>

                <!-- PLAY AREA -->
                <div id="harvest-sky" class="sky-area"></div>
                <div id="harvest-ground" class="ground-area"></div>

                <!-- PLAYER -->
                <div id="harvest-player" class="player-container pos-left">
                    <div class="character-sprite">
                        <img src="${s.playerIcon}" class="char-img">
                    </div>
                    <div class="basket-sprite"></div>
                </div>

                <!-- TOUCH CONTROLS (Invisible Overlay) -->
                <div class="touch-layer">
                    <div class="touch-half" onmousedown="window.Harvest_Input('left')" ontouchstart="window.Harvest_Input('left')"></div>
                    <div class="touch-half" onmousedown="window.Harvest_Input('right')" ontouchstart="window.Harvest_Input('right')"></div>
                </div>

                <!-- START OVERLAY -->
                <div id="harvest-start-overlay" class="game-overlay">
                    <div class="overlay-card">
                        <h1>🍎 Harvest Time!</h1>
                        <p>Catch the correct words!</p>
                        <div class="tutorial-row">
                            <div class="tut-box left">
                                <span>Catch</span>
                                <strong>${leftLabel}</strong>
                                <span>Here</span>
                            </div>
                            <div class="tut-box right">
                                <span>Catch</span>
                                <strong>${rightLabel}</strong>
                                <span>Here</span>
                            </div>
                        </div>
                        <button class="start-btn" onclick="window.Harvest_Start()">TAP TO START</button>
                    </div>
                </div>
            </div>
        `;

        // Global Hooks
        window.Harvest_Input = (side) => HarvestGameEngine.handleInput(side);
        window.Harvest_Start = () => HarvestGameEngine.startGame();
    },

    injectStyles: () => {
        if (document.getElementById('harvest-v2-styles')) return;
        const style = document.createElement('style');
        style.id = 'harvest-v2-styles';
        style.innerHTML = `
            .harvest-game-shell {
                position: relative; width: 100%; height: 100%;
                overflow: hidden; font-family: 'Nunito', sans-serif;
                background: #e0f2fe; /* Sky Base */
            }

            /* --- Zones --- */
            .zone-bg {
                position: absolute; top: 0; bottom: 0; width: 50%;
                z-index: 0;
            }
            .left-zone { 
                left: 0; 
                background: linear-gradient(to bottom, #ffedd5 0%, #fff7ed 100%);
                border-right: 2px dashed #cbd5e1;
            }
            .right-zone { 
                right: 0; 
                background: linear-gradient(to bottom, #dbeafe 0%, #eff6ff 100%);
            }
            .zone-label {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                font-size: 3rem; font-weight: 900; opacity: 0.1;
                text-transform: uppercase; writing-mode: vertical-rl; text-orientation: upright;
                pointer-events: none;
            }

            /* --- UI --- */
            .harvest-ui-bar {
                position: absolute; top: 15px; width: 100%;
                display: flex; justify-content: space-between; padding: 0 20px;
                z-index: 50; box-sizing: border-box;
            }
            .score-pill, .lives-pill {
                background: white; padding: 8px 16px; border-radius: 30px;
                font-weight: 800; font-size: 1.1rem; color: #1e293b;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 2px solid #e2e8f0;
            }

            /* --- Ground --- */
            .ground-area {
                position: absolute; bottom: 0; width: 100%; height: 80px;
                background: #22c55e;
                border-top: 6px solid #16a34a;
                z-index: 10;
            }

            /* --- Falling Fruit (High Fidelity) --- */
            .falling-fruit {
                position: absolute; width: 50%; display: flex; justify-content: center;
                z-index: 15; pointer-events: none;
            }
            .falling-fruit.left { left: 0; }
            .falling-fruit.right { left: 50%; }

            .fruit-visual {
                position: relative; width: 60px; height: 60px;
            }
            .fruit-body {
                width: 100%; height: 100%; background: #ef4444;
                border-radius: 50%;
                box-shadow: inset -5px -5px 10px rgba(0,0,0,0.2);
                border: 2px solid #b91c1c;
            }
            .fruit-stem {
                position: absolute; top: -8px; left: 50%; width: 4px; height: 10px;
                background: #78350f; transform: translateX(-50%);
            }
            .fruit-leaf {
                position: absolute; top: -5px; left: 50%; width: 15px; height: 8px;
                background: #84cc16; border-radius: 10px 0 10px 0;
            }
            .fruit-shine {
                position: absolute; top: 10px; left: 10px; width: 15px; height: 8px;
                background: rgba(255,255,255,0.4); border-radius: 50%; transform: rotate(-45deg);
            }
            .fruit-label {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: white; padding: 2px 8px; border-radius: 8px;
                font-size: 0.8rem; font-weight: 800; color: #1e293b;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2); white-space: nowrap;
            }

            /* --- Player & Basket --- */
            .player-container {
                position: absolute; bottom: 30px; width: 50%; height: 120px;
                transition: left 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
                z-index: 20;
            }
            .pos-left { left: 0; }
            .pos-right { left: 50%; }

            .character-sprite {
                width: 80px; height: 80px; position: relative; z-index: 2;
                margin-bottom: -10px;
            }
            .char-img { width: 100%; height: 100%; object-fit: contain; }

            .basket-sprite {
                width: 70px; height: 40px;
                background: #d97706;
                border-radius: 0 0 15px 15px;
                border: 3px solid #92400e;
                box-shadow: inset 0 -5px 10px rgba(0,0,0,0.1);
                position: relative; z-index: 3;
            }
            /* Basket Handle */
            .basket-sprite::before {
                content: ''; position: absolute; top: -20px; left: 10px; right: 10px; height: 20px;
                border: 3px solid #92400e; border-bottom: none; border-radius: 20px 20px 0 0;
                z-index: -1;
            }

            /* --- Touch Overlay --- */
            .touch-layer { position: absolute; inset: 0; display: flex; z-index: 40; }
            .touch-half { flex: 1; }
            .touch-half:active { background: rgba(255,255,255,0.1); }

            /* --- Start Overlay --- */
            .game-overlay {
                position: absolute; inset: 0; background: rgba(255,255,255,0.95);
                z-index: 100; display: flex; align-items: center; justify-content: center;
                backdrop-filter: blur(5px);
            }
            .overlay-card {
                background: white; padding: 30px; border-radius: 20px;
                text-align: center; width: 85%; max-width: 350px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1); border: 2px solid #e5e7eb;
            }
            .overlay-card h1 { margin: 0 0 10px; color: #1e293b; font-size: 2rem; }
            .tutorial-row { display: flex; gap: 10px; margin: 20px 0; }
            .tut-box {
                flex: 1; padding: 15px; border-radius: 12px;
                display: flex; flex-direction: column; font-size: 0.8rem; color: #64748b;
            }
            .tut-box strong { font-size: 1.2rem; display: block; margin: 5px 0; }
            .tut-box.left { background: #ffedd5; color: #9a3412; border: 2px solid #fed7aa; }
            .tut-box.right { background: #dbeafe; color: #1e40af; border: 2px solid #bfdbfe; }
            
            .start-btn {
                background: #7e22ce; color: white; border: none; padding: 15px 30px;
                border-radius: 50px; font-weight: 900; font-size: 1.2rem;
                box-shadow: 0 5px 0 #581c87; cursor: pointer;
                transition: transform 0.1s;
            }
            .start-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #581c87; }

            /* --- Animations & Feedback --- */
            .float-score {
                position: absolute; top: 60%; font-weight: 900; font-size: 2rem;
                animation: floatUp 0.8s forwards; z-index: 60; text-shadow: 0 2px 0 white;
            }
            .float-score.good { color: #16a34a; }
            .float-score.bad { color: #ef4444; }
            .float-score.left { left: 25%; }
            .float-score.right { left: 75%; }

            .splat-effect {
                position: absolute; bottom: 85px; font-size: 2rem;
                animation: fadeOut 0.5s forwards;
            }
            .splat-effect.left { left: 25%; transform: translateX(-50%); }
            .splat-effect.right { left: 75%; transform: translateX(-50%); }

            .bounce { animation: bounce 0.3s; }
            .wobble { animation: shake 0.3s; }
            .shake-screen { animation: shake 0.4s; }

            .score-badge-large { font-size: 3rem; font-weight: 900; color: #7e22ce; margin: 10px 0; }

            @keyframes floatUp { from { transform: translateY(0) scale(0.5); opacity: 0; } to { transform: translateY(-50px) scale(1.2); opacity: 1; } }
            @keyframes fadeOut { to { opacity: 0; transform: scale(1.5); } }
            @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
            @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }
};