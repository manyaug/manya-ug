/**
 * VENN SPOTLIGHT LOGIC
 * Pure logic for SVG coordinate detection and region comparison.
 */

/**
 * Detect region based on coordinates within the Venn diagram container.
 */
export const detectSpotlightRegion = (x, y, width, height) => {
    const cx = width / 2;
    const cy = height / 2;
    
    const pad = Math.min(15, width * 0.05);
    const availW = width - (pad * 2); 
    const availH = height - (pad * 2);
    
    const r = Math.max(20, Math.min(availW * 0.28, availH * 0.35)); 
    const offset = r * 0.65;
    
    const c1x = cx - offset;
    const c2x = cx + offset;

    const d1 = Math.hypot(x - c1x, y - cy);
    const d2 = Math.hypot(x - c2x, y - cy);

    if (d1 < r && d2 < r) return 'center';
    if (d1 < r) return 'left';
    if (d2 < r) return 'right';
    if (x > pad && x < width - pad && y > pad && y < height - pad) return 'outside';
    
    return null;
};

/**
 * Validate the shaded regions against the target set.
 */
export const validateSpotlight = (litRegions, targetSet) => {
    if (litRegions.size !== targetSet.length) return false;
    for (const r of targetSet) {
        if (!litRegions.has(r)) return false;
    }
    return true;
};
