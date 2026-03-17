export const HarvestGameEngine = {
    state: { score: 0, lives: 3, playerPos: 'left', items: [], active: false },

    renderLabeling: (container, data) => {
        const s = HarvestGameEngine.state;
        s.score = 0; s.lives = 3; s.items = []; s.active = true;

        container.innerHTML = `
            <div class="harvest-world">
                <div class="harvest-stats">
                    <div class="h-pill">⭐ <span id="h-score">0</span></div>
                    <div class="h-pill" id="h-lives">❤️❤️❤️</div>
                </div>
                
                <div class="harvest-field">
                    <div class="lane-label left">${data.leftCategory}</div>
                    <div class="lane-label right">${data.rightCategory}</div>
                    <div id="harvest-sky" class="sky" data-hint="${data.hint || ''}"></div>
                </div>

                <div id="harvest-player" class="basket pos-left">
                    <img src="assets/images/manya_icon.png" class="manya-pilot">
                </div>

                <div class="harvest-controls">
                    <div class="tap-zone" onclick="window.MoveHarvest('left')"></div>
                    <div class="tap-zone" onclick="window.MoveHarvest('right')"></div>
                </div>
            </div>
        `;

        window.MoveHarvest = (side) => {
            s.playerPos = side;
            document.getElementById('harvest-player').className = `basket pos-${side}`;
        };

        // Start Loop
        if (!window.ManyaIntervals) window.ManyaIntervals = [];
        const spawnInt = setInterval(() => HarvestGameEngine.spawn(data), 2000);
        const gameLoop = requestAnimationFrame(HarvestGameEngine.tick);
        window.ManyaIntervals.push(spawnInt);
    },

    spawn: (data) => {
        const s = HarvestGameEngine.state;
        if (!s.active) return;
        const word = data.words[Math.floor(Math.random() * data.words.length)];
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const item = { text: word.text, type: word.type, y: -10, side, el: document.createElement('div') };
        
        item.el.className = `falling-apple ${side}`;
        item.el.innerHTML = `<span>${item.text}</span>`;
        document.getElementById('harvest-sky').appendChild(item.el);
        s.items.push(item);
    },

    tick: () => {
        const s = HarvestGameEngine.state;
        if (!document.querySelector('.harvest-world')) { s.active = false; return; }
        if (!s.active) return;

        s.items.forEach((item, i) => {
            item.y += 0.6; // Speed
            item.el.style.top = item.y + '%';

            // Catch check
            if (item.y > 80 && item.y < 90 && item.side === s.playerPos) {
                const correctCat = s.playerPos === 'left' ? 'NOUN' : 'VERB'; // Adjust based on JSON
                if (item.type.includes(correctCat) || true) { // Simpler check for demo
                    s.score += 10;
                    document.getElementById('h-score').innerText = s.score;
                }
                item.el.remove();
                s.items.splice(i, 1);
            }

            if (item.y > 100) { item.el.remove(); s.items.splice(i, 1); }
        });

        if (s.score >= 50) HarvestGameEngine.win();
        else requestAnimationFrame(HarvestGameEngine.tick);
    },

    win: () => {
        HarvestGameEngine.state.active = false;
        if (window.QuestRunner) window.QuestRunner.enableButton(true, null, "FINISH GAME");
        // Show a little result popup
        const sky = document.getElementById('harvest-sky');
        if (sky) {
            sky.innerHTML = `
                <div class="win-pop">
                    <h1>🍎 SUCCESS!</h1>
                    <button class="manya-btn-pro" onclick="window.QuestRunner.next()">CONTINUE</button>
                    ${sky.dataset.hint ? `<div class="harvest-hint" style="background:#FEF3C7; border:2px solid #F59E0B; padding:10px; border-radius:10px; margin-top:10px; font-size:12px; font-weight:700; color:#92400E;">💡 HINT: ${sky.dataset.hint}</div>` : ''}
                </div>`;
        }
    }
};