/**
 * FX Utils
 * ========
 * Helper functions to trigger global visual effects.
 */

/**
 * Triggers a flying reward animation (coin, gem, xp).
 * @param {HTMLElement | {x: number, y: number}} source - The DOM element or coordinate to fly from.
 * @param {'coin' | 'gem' | 'xp'} type - The particle type to fly.
 * @param {number} amount - Optional amount label (e.g. +5).
 */
export const triggerRewardFlight = (source, type = 'coin', amount = 0) => {
    let x = 0;
    let y = 0;

    if (source instanceof HTMLElement) {
        const rect = source.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
    } else if (source && typeof source.x === 'number') {
        x = source.x;
        y = source.y;
    }

    const event = new CustomEvent('manya-fx-flight', {
        detail: { x, y, type, amount }
    });
    
    window.dispatchEvent(event);
};
