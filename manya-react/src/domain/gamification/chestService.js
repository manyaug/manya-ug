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
        { type: 'coins',  min: 50,  max: 100, probability: 1.00 },
        { type: 'xp',     min: 50,  max: 100, probability: 1.00 },
    ],
    silver: [
        { type: 'coins',  min: 150, max: 250, probability: 1.00 },
        { type: 'xp',     min: 150, max: 250, probability: 1.00 },
        { type: 'unlock', value: 'study_sim_extra', probability: 0.25 },
    ],
    gold: [
        { type: 'coins',  min: 250, max: 500, probability: 1.00 },
        { type: 'gems',   min: 3,   max: 5,   probability: 1.00 },
        { type: 'xp',     min: 400, max: 800, probability: 1.00 },
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
 * Determines if a correct answer should drop a bronze chest.
 * Disabled: Chests are now only awarded deterministically when fully deserved.
 * @returns {boolean}
 */
export function shouldDropBronzeChest() {
    return false;
}

export function getQuestCompletionChest(stars, nodeType) {
    // Determine deterministic chests based on node type
    if (nodeType === 'PRACTICE' && stars === 3) return 'bronze';
    if (nodeType === 'REINFORCE' && stars === 3) return 'silver';
    
    // Boss Chest logic evaluates cumulatively, handled by QuestRunner.
    // If sent here directly as MASTERY (Boss):
    if (nodeType === 'MASTERY') {
        if (stars >= 12) return 'gold';
        if (stars >= 9) return 'silver';
        return 'bronze'; // passed but low stars
    }

    return null;
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
