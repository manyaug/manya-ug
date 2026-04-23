/**
 * MANYA CHEST SERVICE (Headless)
 * ================================
 * Ported from: manya_logic/server/services/chestService.js
 * Pure JS — no DB calls. Returns chest rewards for the UI to consume.
 * Supabase persistence is handled by chestSyncService (separate concern).
 */

// ── REWARD POOL DEFINITIONS ─────────────────────────────────────────────────
// Each chest type has a pool of possible rewards with independent probabilities.

const CHEST_POOLS = {
    bronze: [
        { type: 'coins',  min: 10,  max: 50,  probability: 0.90 },
        { type: 'gems',   min: 1,   max: 3,   probability: 0.30 },
        { type: 'xp',     min: 20,  max: 50,  probability: 0.70 },
    ],
    silver: [
        { type: 'coins',  min: 30,  max: 100, probability: 0.95 },
        { type: 'gems',   min: 3,   max: 8,   probability: 0.60 },
        { type: 'xp',     min: 50,  max: 120, probability: 0.90 },
        { type: 'unlock', value: 'study_sim_extra', probability: 0.25 },
    ],
    gold: [
        { type: 'coins',  min: 80,  max: 200, probability: 1.00 },
        { type: 'gems',   min: 10,  max: 20,  probability: 0.85 },
        { type: 'xp',     min: 100, max: 250, probability: 1.00 },
        { type: 'unlock', value: 'premium_sim', probability: 0.50 },
        { type: 'badge',  value: 'chest_master', probability: 0.15 },
    ],
};

// ── CORE LOGIC ───────────────────────────────────────────────────────────────

/**
 * Roll the reward contents of a chest based on its type.
 * @param {'bronze'|'silver'|'gold'} chestType
 * @returns {{ type, amount?, value? }[]} Array of rewards won
 */
export function rollChestRewards(chestType) {
    const pool = CHEST_POOLS[chestType];
    if (!pool) return [];

    const rewards = [];

    for (const item of pool) {
        if (Math.random() <= item.probability) {
            if (item.type === 'coins' || item.type === 'gems' || item.type === 'xp') {
                const amount = Math.floor(Math.random() * (item.max - item.min + 1)) + item.min;
                rewards.push({ type: item.type, amount });
            } else {
                // 'unlock' or 'badge'
                rewards.push({ type: item.type, value: item.value });
            }
        }
    }

    return rewards;
}

/**
 * Determines if a correct answer should drop a bronze chest (20% chance).
 * Called per-question, after submitting a correct answer.
 * @returns {boolean}
 */
export function shouldDropBronzeChest() {
    return Math.random() < 0.05; // Reduced from 0.20 to make it a rare "Lucky Drop"
}

/**
 * Maps quest star rating to the chest type awarded.
 * @param {number} stars 1|2|3
 * @returns {'bronze'|'silver'|'gold'|null}
 */
export function getQuestCompletionChest(stars) {
    if (stars === 3) return 'gold';
    if (stars === 2) return 'silver';
    return null; // 1 star = no chest, just coins
}

/**
 * Maps mastery score to star rating.
 * @param {number} mastery 0-100
 * @returns {0|1|2|3}
 */
export function masteryToStars(mastery) {
    if (mastery >= 90) return 3;
    if (mastery >= 70) return 2;
    if (mastery >= 50) return 1;
    return 0;
}

/**
 * Maps quest star rating to bonus coins.
 * @param {number} stars
 * @returns {number}
 */
export function getStarBonusCoins(stars) {
    const table = { 0: 0, 1: 30, 2: 50, 3: 80 };
    return table[stars] ?? 0;
}
