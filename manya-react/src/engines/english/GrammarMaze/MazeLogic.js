/**
 * GRAMMAR MAZE DOMAIN LOGIC
 * Domain logic for grid navigation, obstacle movement, and collision detection.
 */

/**
 * Normalizes level data for the maze.
 */
export const initializeLevel = (data) => {
    const raw = data?.data || data || {};
    
    const defaultMaze = [
        [2, 0, 0, 0, 1],
        [1, 1, 0, 1, 1],
        [0, 0, 0, 0, 0],
        [1, 1, 1, 1, 0],
        [0, 0, 0, 0, 3]
    ];
    
    const maze = Array.isArray(raw.maze) ? raw.maze : defaultMaze;
    const rawObstacles = Array.isArray(raw.obstacles) ? raw.obstacles : [];
    const rawAnswers = Array.isArray(raw.answers) ? raw.answers : [
        { r: 4, c: 4, isCorrect: true, text: "Victory!" }
    ];

    let startPos = { r: 0, c: 0 };
    for (let r = 0; r < maze.length; r++) {
        for (let c = 0; c < maze[r].length; c++) {
            if (maze[r][c] === 2) {
                startPos = { r, c };
                break;
            }
        }
    }

    const obstacles = rawObstacles.map(obs => {
        const path = Array.isArray(obs.path) && obs.path.length > 0 ? obs.path : [{ r: 0, c: 0 }];
        return {
            ...obs,
            path,
            r: path[0].r,
            c: path[0].c,
            step: 0
        };
    });

    return { 
        startPos, 
        obstacles, 
        maze, 
        answers: rawAnswers,
        title: raw.title || "Grammar Maze",
        instructions: raw.instructions || "Find the correct path!"
    };
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
