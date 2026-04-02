export const MemoryMatchEngine = {
    state: {
        container: null,
        cardsData: [],      // Array of card objects { id, pairId, text, state }
        flippedCards: [],   // Currently flipped cards (max 2)
        matchesFound: 0,
        totalPairs: 0,
        score: 0,
        lockBoard: false,   // Prevent clicking while animating
        playerIcon: "/assets/icons/manya_icon.png"
    },

    renderLabeling: async (container, data) => {
        const s = MemoryMatchEngine.state;
        s.container = container;
        s.score = 0;
        s.matchesFound = 0;
        s.flippedCards = [];
        s.lockBoard = false;
        
        s.playerIcon = window.ManyaQuestRunner?.CHAR_ICONS?.manya || s.playerIcon;

        // Process Data: Convert pairs into a flat, shuffled array of cards
        s.totalPairs = data.pairs.length;
        const deck = [];
        
        data.pairs.forEach((pair, index) => {
            // Card A
            deck.push({
                id: `card-${index}-a`,
                pairId: index,
                text: pair.item1,
                state: 'hidden'
            });
            // Card B (The match)
            deck.push({
                id: `card-${index}-b`,
                pairId: index,
                text: pair.item2,
                state: 'hidden'
            });
        });

        // Shuffle
        MemoryMatchEngine.shuffleArray(deck);
        s.cardsData = deck;

        // Hide main footer
        window.ManyaQuestRunner.enableButton(false);

        MemoryMatchEngine.injectStyles();
        MemoryMatchEngine.render();
    },

    shuffleArray: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    handleCardClick: (index) => {
        const s = MemoryMatchEngine.state;
        const card = s.cardsData[index];

        // Validation: Ignore if board locked, card already flipped, or card already matched
        if (s.lockBoard || card.state === 'flipped' || card.state === 'matched') return;

        // 1. Flip the card
        card.state = 'flipped';
        s.flippedCards.push({ index, ...card });
        MemoryMatchEngine.updateCardVisual(index);

        // 2. Check logic if 2 cards are flipped
        if (s.flippedCards.length === 2) {
            s.lockBoard = true; // Block input
            MemoryMatchEngine.checkForMatch();
        }
    },

    checkForMatch: () => {
        const s = MemoryMatchEngine.state;
        const [card1, card2] = s.flippedCards;

        const isMatch = card1.pairId === card2.pairId;

        if (isMatch) {
            // MATCH!
            s.matchesFound++;
            s.score += 20;
            
            // Mark as matched in data
            s.cardsData[card1.index].state = 'matched';
            s.cardsData[card2.index].state = 'matched';

            // Visual Success
            setTimeout(() => {
                MemoryMatchEngine.markMatched(card1.index);
                MemoryMatchEngine.markMatched(card2.index);
                MemoryMatchEngine.resetBoard();
                
                // Check Win
                if (s.matchesFound === s.totalPairs) {
                    setTimeout(MemoryMatchEngine.endGame, 1000);
                }
            }, 500);

        } else {
            // NO MATCH
            s.score = Math.max(0, s.score - 5); // Penalty
            
            // Wait, then unflip
            setTimeout(() => {
                s.cardsData[card1.index].state = 'hidden';
                s.cardsData[card2.index].state = 'hidden';
                MemoryMatchEngine.updateCardVisual(card1.index);
                MemoryMatchEngine.updateCardVisual(card2.index);
                MemoryMatchEngine.resetBoard();
            }, 1200);
        }
        
        MemoryMatchEngine.updateScore();
    },

    resetBoard: () => {
        const s = MemoryMatchEngine.state;
        s.flippedCards = [];
        s.lockBoard = false;
    },

    // --- DOM Updates ---

    updateCardVisual: (index) => {
        const cardData = MemoryMatchEngine.state.cardsData[index];
        const cardEl = document.getElementById(`card-slot-${index}`);
        if (!cardEl) return;

        const innerEl = cardEl.querySelector('.mem-card-inner');
        
        if (cardData.state === 'flipped' || cardData.state === 'matched') {
            innerEl.classList.add('flipped');
        } else {
            innerEl.classList.remove('flipped');
        }
    },

    markMatched: (index) => {
        const cardEl = document.getElementById(`card-slot-${index}`);
        if (cardEl) {
            cardEl.classList.add('is-matched');
            // Add sparkle effect
            const sparkle = document.createElement('div');
            sparkle.className = 'match-sparkle';
            sparkle.innerText = '✨';
            cardEl.appendChild(sparkle);
        }
    },

    updateScore: () => {
        document.getElementById('mem-score').innerText = MemoryMatchEngine.state.score;
    },

    endGame: () => {
        const s = MemoryMatchEngine.state;
        s.container.innerHTML = `
            <div class="bento-card" style="text-align:center; padding:40px; margin-top:20%; animation: popIn 0.5s;">
                <div style="font-size:4rem; margin-bottom:10px;">🃏</div>
                <h1 style="color:#1e293b;">MEMORY MASTER!</h1>
                <p>You found all the pairs!</p>
                <div class="score-badge-large">${s.score}</div>
                <button class="manya-pill-btn" onclick="window.ManyaQuestRunner.next()" style="margin-top:20px;">CONTINUE</button>
            </div>
        `;
        window.ManyaQuestRunner.enableButton(true);
    },

    render: () => {
        const s = MemoryMatchEngine.state;
        
        // Grid setup based on count
        // 4-6 pairs = 3 columns. 8 pairs = 4 columns.
        const gridCols = s.totalPairs * 2 > 12 ? 4 : 3;

        const cardsHTML = s.cardsData.map((card, index) => `
            <div class="mem-card-slot" id="card-slot-${index}" onclick="window.MemoryMatch_Flip(${index})">
                <div class="mem-card-inner">
                    <div class="mem-card-front">
                        <div class="card-pattern">?</div>
                    </div>
                    <div class="mem-card-back">
                        <span>${card.text}</span>
                    </div>
                </div>
            </div>
        `).join('');

        s.container.innerHTML = `
            <div class="memory-game-shell">
                <div class="memory-header">
                    <div class="mem-title">Synonym Swap</div>
                    <div class="mem-score-pill">Score: <span id="mem-score">0</span></div>
                </div>

                <div class="memory-grid" style="grid-template-columns: repeat(${gridCols}, 1fr);">
                    ${cardsHTML}
                </div>
                
                <div class="memory-footer">
                    <img src="${s.playerIcon}" class="helper-icon">
                    <p>Find the matching pairs!</p>
                </div>
            </div>
        `;

        window.MemoryMatch_Flip = MemoryMatchEngine.handleCardClick;
    },

    injectStyles: () => {
        if (document.getElementById('memory-v1-styles')) return;
        const style = document.createElement('style');
        style.id = 'memory-v1-styles';
        style.innerHTML = `
            .memory-game-shell {
                display: flex; flex-direction: column; height: 100%; width: 100%;
                max-width: 500px; margin: 0 auto;
                background: #fdfbf7; font-family: 'Nunito', sans-serif;
                overflow: hidden; padding: 10px; box-sizing: border-box;
            }

            .memory-header {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 15px; padding: 0 5px;
            }
            .mem-title { font-weight: 900; color: #1e293b; font-size: 1.2rem; }
            .mem-score-pill {
                background: #e0f2fe; color: #0284c7; padding: 5px 15px;
                border-radius: 20px; font-weight: 800; border: 2px solid #bae6fd;
            }

            .memory-grid {
                display: grid; gap: 10px;
                width: 100%; auto-rows: 1fr;
                perspective: 1000px; /* Essential for 3D flip */
                flex: 1; /* Take remaining space */
                align-content: center; /* Center vertically */
            }

            /* --- Card Styles (3D Flip) --- */
            .mem-card-slot {
                aspect-ratio: 3/4;
                cursor: pointer;
                position: relative;
            }

            .mem-card-inner {
                position: relative; width: 100%; height: 100%;
                text-align: center; transition: transform 0.6s;
                transform-style: preserve-3d;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }

            .mem-card-inner.flipped { transform: rotateY(180deg); }

            .mem-card-front, .mem-card-back {
                position: absolute; width: 100%; height: 100%;
                -webkit-backface-visibility: hidden; /* Safari */
                backface-visibility: hidden;
                border-radius: 12px;
                display: flex; align-items: center; justify-content: center;
                border: 2px solid #e2e8f0;
            }

            /* Front (Face Down) */
            .mem-card-front {
                background: #7e22ce; /* Purple */
                background-image: radial-gradient(#9333ea 20%, transparent 20%),
                                  radial-gradient(#9333ea 20%, transparent 20%);
                background-color: #7e22ce;
                background-position: 0 0, 10px 10px;
                background-size: 20px 20px;
            }
            .card-pattern { font-size: 2rem; color: rgba(255,255,255,0.3); font-weight: 900; }

            /* Back (Face Up - The Word) */
            .mem-card-back {
                background-color: white;
                color: #1e293b;
                transform: rotateY(180deg);
                font-weight: 800; font-size: 0.9rem; /* Small font to fit long words */
                padding: 5px;
                word-wrap: break-word;
            }

            /* Matched State */
            .mem-card-slot.is-matched .mem-card-back {
                background-color: #dcfce7;
                border-color: #4ade80;
                color: #16a34a;
                box-shadow: 0 0 15px #86efac;
            }
            .mem-card-slot.is-matched .mem-card-inner { animation: pulse-card 0.5s; }

            .match-sparkle {
                position: absolute; top: -10px; right: -10px;
                font-size: 1.5rem; animation: floatUp 1s forwards;
                z-index: 10;
            }

            .memory-footer {
                display: flex; align-items: center; justify-content: center;
                margin-top: 10px; gap: 10px;
                color: #64748b; font-weight: 600; font-size: 0.9rem;
            }
            .helper-icon { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #e2e8f0; }

            .score-badge-large { font-size: 3rem; font-weight: 900; color: #7e22ce; margin: 10px 0; }

            @keyframes pulse-card { 0% { transform: rotateY(180deg) scale(1); } 50% { transform: rotateY(180deg) scale(1.1); } 100% { transform: rotateY(180deg) scale(1); } }
            @keyframes floatUp { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-20px); opacity: 0; } }
            @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }
};