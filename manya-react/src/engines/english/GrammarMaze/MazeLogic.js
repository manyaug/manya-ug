/**
 * GRAMMAR MAZE DOMAIN LOGIC
 * Domain logic for grid navigation, obstacle movement, and collision detection.
 */

/**
 * Normalizes level data for the maze.
 */
export const initializeLevel = (levelData) => {
    if (!levelData) return null;

    let startPos = { r: 0, c: 0 };
    for (let r = 0; r < levelData.maze.length; r++) {
        for (let c = 0; c < levelData.maze[r].length; c++) {
            if (levelData.maze[r][c] === 2) {
                startPos = { r, c };
                break;
            }
        }
    }

    const obstacles = levelData.obstacles.map(obs => ({
        ...obs,
        r: obs.path[0].r,
        c: obs.path[0].c,
        step: 0
    }));

    return { startPos, obstacles };
};

/**
 * Calculates the next position for an obstacle based on its defined path.
 */
export const moveObstacle = (obs) => {
    const nextStep = (obs.step + 1) % obs.path.length;
    const nextPos = obs.path[nextStep];
    return { ...obs, r: nextPos.r, c: nextPos.c, step: nextStep };
};

/**
 * Validates a movement attempt.
 */
export const validateMove = (dr, dc, playerPos, maze, rows, cols) => {
    const nr = playerPos.r + dr;
    const nc = playerPos.c + dc;

    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || maze[nr][nc] === 1) {
        return { isValid: false };
    }
    return { isValid: true, r: nr, c: nc };
};

/**
 * Standardized Scoring Logic
 */
export const calculateMazeScoring = (isSuccess, score, mistakes, numLevels, startTime) => {
    const duration = Date.now() - startTime;
    const accuracy = isSuccess ? Math.max(0, (score - (mistakes * 50)) / (numLevels * 250)) : 0;
    
    return {
        isCorrect: isSuccess,
        accuracy,
        score,
        total: numLevels * 250,
        mistakes,
        timeSpentMs: duration,
        type: 'simulation',
        engineType: 'GRAMMAR_MAZE'
    };
};
