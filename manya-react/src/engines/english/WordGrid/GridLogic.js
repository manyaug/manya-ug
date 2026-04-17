/**
 * WORD GRID DOMAIN LOGIC
 * Internal rules for grid generation, word placement algorithms, and selection validation.
 */

/**
 * Generates a randomized word grid from a list of words.
 */
export const generateWordGrid = (gridSize, rawWords) => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const grid = Array(gridSize).fill(0).map(() => Array(gridSize).fill(''));
    const directions = [
        {r: 0, c: 1}, {r: 1, c: 0}, {r: 1, c: 1}, {r: 1, c: -1},
        {r: 0, c: -1}, {r: -1, c: 0}, {r: -1, c: -1}, {r: -1, c: 1}
    ];

    const placementWords = [...rawWords].sort((a, b) => b.length - a.length);
    let allPlaced = false;
    let gridAttempts = 0;

    while (!allPlaced && gridAttempts < 50) {
        gridAttempts++;
        grid.forEach(row => row.fill('')); // Reset grid
        allPlaced = true;

        for (const word of placementWords) {
            const letters = word.replace(/[^A-Z]/g, '').toUpperCase().split('');
            let wordPlaced = false;
            let wordAttempts = 0;

            while (!wordPlaced && wordAttempts < 100) {
                wordAttempts++;
                const startR = Math.floor(Math.random() * gridSize);
                const startC = Math.floor(Math.random() * gridSize);
                const dir = directions[Math.floor(Math.random() * directions.length)];

                let possible = true;
                for (let i = 0; i < letters.length; i++) {
                    const r = startR + i * dir.r;
                    const c = startC + i * dir.c;
                    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize || (grid[r][c] !== '' && grid[r][c] !== letters[i])) {
                        possible = false;
                        break;
                    }
                }

                if (possible) {
                    for (let i = 0; i < letters.length; i++) {
                        grid[startR + i * dir.r][startC + i * dir.c] = letters[i];
                    }
                    wordPlaced = true;
                }
            }
            if (!wordPlaced) {
                allPlaced = false;
                break;
            }
        }
    }

    // Pass 2: Fill remaining blanks
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (grid[r][c] === '') grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
    }

    return grid;
};

/**
 * Calculates a selection array from a start and current position.
 */
export const calculateSelection = (first, pos) => {
    const dr = pos.r - first.r;
    const dc = pos.c - first.c;
    const absDR = Math.abs(dr);
    const absDC = Math.abs(dc);

    const isHorizontal = dr === 0;
    const isVertical = dc === 0;
    const isDiagonal = absDR === absDC;

    if (isHorizontal || isVertical || isDiagonal) {
        const steps = Math.max(absDR, absDC);
        const stepR = dr === 0 ? 0 : dr / absDR;
        const stepC = dc === 0 ? 0 : dc / absDC;

        const newSelection = [];
        for (let i = 0; i <= steps; i++) {
            newSelection.push({ r: first.r + i * stepR, c: first.c + i * stepC });
        }
        return newSelection;
    }
    return null;
};

/**
 * Validates if the selected word is in the target list.
 */
export const validateSelection = (selection, grid, rawWords, foundWords) => {
    const word = selection.map(p => grid[p.r][p.c]).join('');
    const revWord = word.split('').reverse().join('');
    
    const matched = rawWords.find(w => {
        const clean = w.replace(/[^A-Z]/g, '').toUpperCase();
        return clean === word || clean === revWord;
    });

    if (matched && !foundWords.has(matched)) {
        return { isMatch: true, matchedWord: matched };
    }
    return { isMatch: false };
};

/**
 * Standardized Scoring Logic
 */
export const calculateGridScoring = (foundWords, totalWords, seconds, startTime) => {
    const duration = Date.now() - startTime;
    return {
        isCorrect: foundWords.size === totalWords,
        accuracy: foundWords.size / totalWords,
        score: foundWords.size * 10,
        timeSpentMs: duration,
        timeSpentSec: seconds,
        type: 'simulation',
        engineType: 'WORD_GRID'
    };
};
