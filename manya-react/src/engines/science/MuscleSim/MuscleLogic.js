/**
 * MUSCLE SIMULATION DOMAIN LOGIC
 * Domain logic for musculoskeletal kinematics and antagonistic contraction.
 */

export const SHOULDER = { x: 300, y: 150 };
export const HUMERUS_LENGTH = 180;
export const FOREARM_LENGTH = 170;
export const ELBOW_ANGLE_BASE = Math.PI / 3.2;

/**
 * Calculates the coordinates of the musculoskeletal system based on flexion.
 * @param {number} flexion 0.0 to 1.0 (Flexed)
 * @returns {object} Object containing coordinates for elbow and wrist.
 */
export const calculateKinematics = (flexion) => {
    const elbowX = SHOULDER.x + HUMERUS_LENGTH * Math.cos(ELBOW_ANGLE_BASE);
    const elbowY = SHOULDER.y + HUMERUS_LENGTH * Math.sin(ELBOW_ANGLE_BASE);

    const rotation = flexion * (Math.PI / 1.75);
    const wristX = elbowX + FOREARM_LENGTH * Math.cos(ELBOW_ANGLE_BASE - rotation);
    const wristY = elbowY + FOREARM_LENGTH * Math.sin(ELBOW_ANGLE_BASE - rotation);

    return { 
        elbow: { x: elbowX, y: elbowY }, 
        wrist: { x: wristX, y: wristY },
        rotation 
    };
};

/**
 * Calculates muscle bulge and activation states.
 */
export const getMuscleActivation = (flexion, isBiceps) => {
    const isActive = (isBiceps && flexion > 0.5) || (!isBiceps && flexion < 0.5);
    const bulge = isBiceps ? 25 + flexion * 50 : 20 + (1 - flexion) * 45;
    return { isActive, bulge };
};

/**
 * Calculates scoring and completion criteria.
 */
export const calculateMuscleScoring = (flexion, startTime) => {
    const duration = Date.now() - startTime;
    const isMastered = flexion > 0.8 || flexion < 0.2; // Check if user explored limits
    
    return {
        isCorrect: true,
        isMastered,
        timeSpentMs: duration,
        type: 'simulation',
        engineType: 'MUSCLE_SIM'
    };
};
