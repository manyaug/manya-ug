/**
 * VENN PROBABILITY LOGIC
 * Pure logic for coordinate math, region detection, and answer validation.
 */

/**
 * Detect region based on coordinates within the Venn diagram container.
 */
export const detectRegion = (x, y, width, height) => {
    const cx = width / 2;
    const cy = height / 2.5; 
    const r = Math.min(width * 0.3, height * 0.3);
    const offset = r * 0.6;
    const c1x = cx - offset;
    const c2x = cx + offset;

    const d1 = Math.hypot(x - c1x, y - cy);
    const d2 = Math.hypot(x - c2x, y - cy);

    if (y > height * 0.75) return 'storage';
    if (d1 < r && d2 < r) return 'center';
    if (d1 < r) return 'left';
    if (d2 < r) return 'right';
    return 'outside';
};

/**
 * Validate the "setup" phase (chip placements).
 */
export const validateVennSetup = (chips, targetSetup) => {
    const counts = { left: 0, right: 0, center: 0, outside: 0, storage: 0 };
    chips.forEach(c => { counts[c.region]++; });

    return counts.left === targetSetup.aOnly &&
        counts.right === targetSetup.bOnly &&
        counts.center === targetSetup.intersection &&
        counts.outside === targetSetup.outside;
};

/**
 * Validate the "fill" phase (direct numeric inputs into regions).
 */
export const validateVennFill = (inputs, targetSetup) => {
    const parse = (v) => parseInt(v || '0', 10);
    return (
        parse(inputs.left) === targetSetup.aOnly &&
        parse(inputs.right) === targetSetup.bOnly &&
        parse(inputs.center) === targetSetup.intersection &&
        parse(inputs.outside) === targetSetup.outside
    );
};

/**
 * Validate the "calculation" phase (probability fraction).
 */
export const validateVennCalc = (numInput, denInput, expectedNum, expectedDen) => {
    const num = parseInt(numInput, 10);
    const den = parseInt(denInput, 10);
    return num === expectedNum && den === expectedDen;
};
