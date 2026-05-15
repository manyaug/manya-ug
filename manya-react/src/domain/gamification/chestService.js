// ── REWARD TRIGGERS (50+ Cases Matrix) ──────────────────────────────────────────
export const REWARD_TRIGGERS = {
    // 🏆 MASTERY & PERFORMANCE (12 Cases)
    Q_PERFECT:    { id: 'q_perfect', type: 'diamond', reason: 'Royal Excellence: 100% Score!' },
    Q_ELITE:      { id: 'q_elite',   type: 'gold',    reason: 'Elite Scholar: 95%+ Mastery' },
    Q_MASTER:     { id: 'q_master',  type: 'gold',    reason: 'Subject Master: 90%+ Mastery' },
    Q_GREAT:      { id: 'q_great',   type: 'silver',  reason: 'Great Performance: 85%+' },
    Q_SOLID:      { id: 'q_solid',   type: 'silver',  reason: 'Solid Work: 80%+' },
    Q_GOOD:       { id: 'q_good',    type: 'bronze',  reason: 'Good Job: 75%+' },
    Q_IMPROVED:   { id: 'q_impr',    type: 'bronze',  reason: 'Rising Star: Rapid Improvement' },
    Q_FIRST:      { id: 'q_first',   type: 'silver',  reason: 'First Steps: Quest Completed!' },
    Q_FAST:       { id: 'q_fast',    type: 'gold',    reason: 'Lightning Brain: 100% + Fast Time' },
    Q_CLUTCH:     { id: 'q_clutch',  type: 'silver',  reason: 'Clutch Finish: Last Second Save!' },
    Q_CONSISTENT: { id: 'q_cons',    type: 'gold',    reason: 'Consistency King: 5 Perfects today' },
    Q_FLAWLESS:   { id: 'q_flaw',    type: 'diamond', reason: 'Flawless: No Hints Used!' },

    // 🔥 STREAKS & LOYALTY (10 Cases)
    S_3D:   { id: 's_3d',   type: 'silver',  reason: '3-Day Fire Streak!' },
    S_7D:   { id: 's_7d',   type: 'gold',    reason: 'Weekly Legend Status!' },
    S_14D:  { id: 's_14d',  type: 'gold',    reason: 'Fortnight of Focus!' },
    S_30D:  { id: 's_30d',  type: 'diamond', reason: 'Unstoppable: 30 Day Streak!' },
    S_50D:  { id: 's_50d',  type: 'diamond', reason: 'Manya Elder: 50 Days!' },
    S_100D: { id: 's_100d', type: 'diamond', reason: 'God Tier: 100 Day Streak!' },
    S_WEEKEND: { id: 's_wknd', type: 'gold',   reason: 'Weekend Warrior!' },
    S_EARLY:   { id: 's_early', type: 'silver', reason: 'Early Bird: Morning Study!' },
    S_NIGHT:   { id: 's_night', type: 'silver', reason: 'Night Owl: Late Night Focus!' },
    S_HOLIDAY: { id: 's_hldy', type: 'gold',   reason: 'Holiday Hero: Studying on Break!' },

    // ⏳ TIME & FOCUS (8 Cases)
    T_30M:  { id: 't_30m',  type: 'bronze',  reason: '30 Minutes of Deep Work' },
    T_1H:   { id: 't_1h',   type: 'silver',  reason: '1 Hour Learning Marathon' },
    T_2H:   { id: 't_2h',   type: 'gold',    reason: 'Focus Master: 2 Hours!' },
    T_5H:   { id: 't_5h',   type: 'diamond', reason: 'Legendary Focus: 5 Hours!' },
    T_DAILY_MAX: { id: 't_dmax', type: 'gold',  reason: 'Daily Goal Reached!' },
    T_SESSION_LONG: { id: 't_slng', type: 'silver', reason: 'Endurance Learner' },
    T_SPEED_LEARNER: { id: 't_spd',  type: 'gold',   reason: 'Hyper Focus: Rapid Progression' },
    T_STEADY: { id: 't_stdy', type: 'silver', reason: 'Steady Progress: No Gaps today' },

    // 🧪 SUBJECT MILESTONES (8 Cases)
    SB_SCI_10:  { id: 'sb_s10',  type: 'gold',    reason: 'Science Specialist (10 Quests)' },
    SB_MATH_10: { id: 'sb_m10',  type: 'gold',    reason: 'Math Wizard (10 Quests)' },
    SB_SST_10:  { id: 'sb_st10', type: 'gold',    reason: 'SST Historian (10 Quests)' },
    SB_ENG_10:  { id: 'sb_e10',  type: 'gold',    reason: 'English Scholar (10 Quests)' },
    SB_MULTI:   { id: 'sb_mult', type: 'diamond', reason: 'Polymath: All Subjects studied!' },
    SB_SCI_EXPL: { id: 'sb_se',   type: 'silver',  reason: 'Lab Explorer: Science Simulations' },
    SB_MATH_EXC: { id: 'sb_me',   type: 'silver',  reason: 'Problem Solver: Math Quests' },
    SB_ART_DISC: { id: 'sb_ad',   type: 'silver',  reason: 'Artifact Collector: Gallery' },

    // 🕹️ CHALLENGE MODES (8 Cases)
    M_SPEED_KING: { id: 'm_sk',  type: 'gold',    reason: 'Speedrun Champion!' },
    M_REV_GENIUS: { id: 'm_rg',  type: 'gold',    reason: 'Reverse Mode Logic Master!' },
    M_QUAKE_SURV: { id: 'm_qs',  type: 'silver',  reason: 'Earthquake Survivor!' },
    M_COMBO_10:   { id: 'm_c10', type: 'gold',    reason: '10x Combo Chain!' },
    M_PERFECT_CH: { id: 'm_pc',  type: 'diamond', reason: 'Perfect Challenge Run!' },
    M_SPEED_GOD:  { id: 'm_sg',  type: 'diamond', reason: 'God Speed: < 5s average!' },
    M_RESCUE_WIN: { id: 'm_rw',  type: 'gold',    reason: 'Dynamic Rescue: Hero Save!' },
    M_NO_MISTAKE: { id: 'm_nm',  type: 'gold',    reason: 'Mistake Free Session!' },

    // 🏺 VAULT & EXPLORATION (4 Cases)
    V_DISCOVERY: { id: 'v_d',  type: 'silver',  reason: 'Knowledge Vault Discovery!' },
    V_ARCHIVIST: { id: 'v_a',  type: 'gold',    reason: 'Elite Archivist: 5 Artifacts' },
    V_MUSEUM:    { id: 'v_m',  type: 'diamond', reason: 'Museum Curator: 20 Artifacts' },
    V_HIDDEN:    { id: 'v_h',  type: 'gold',    reason: 'Hidden Secret Unlocked!' },
};

/**
 * Deterministic Chest Evaluator
 * Evaluates provided metrics against the logic matrix to find all eligible drops.
 */
export function evaluateRewards(metrics) {
    const drops = [];
    const { 
        mastery, streak, sessionTime, nodeType, modeAchievements, 
        subject, totalQuests, hintCount, timePerQuestion, 
        isFirstQuest, isWeekend, isMorning, isNight,
        artifactCount, comboCount, rescueUsed, subjectCounts
    } = metrics;

    // 1. Mastery Logic (Clamped to 100%)
    const m = Math.min(100, Number(mastery) || 0);
    console.log(`🎁 [ChestService] Evaluating Rewards: Mastery=${m}, Streak=${streak}, Node=${nodeType}`);

    // 🛡️ POLICY: EXPLORE nodes (Library) should be more modest. No gold/diamond chests.
    const isExplore = nodeType === 'EXPLORE' || nodeType === 'explore';

    if (m === 100) {
        if (hintCount === 0) {
            drops.push({ 
                ...(isExplore ? REWARD_TRIGGERS.Q_GREAT : REWARD_TRIGGERS.Q_PERFECT), 
                subject 
            });
        } else {
            drops.push({ ...REWARD_TRIGGERS.Q_GOOD, subject });
        }
    } 
    else if (m >= 95) drops.push({ ...(isExplore ? REWARD_TRIGGERS.Q_GREAT : REWARD_TRIGGERS.Q_ELITE), subject });
    else if (m >= 90) drops.push({ ...(isExplore ? REWARD_TRIGGERS.Q_SOLID : REWARD_TRIGGERS.Q_MASTER), subject });
    else if (m >= 85) drops.push({ ...REWARD_TRIGGERS.Q_GREAT, subject });
    else if (m >= 80) drops.push({ ...REWARD_TRIGGERS.Q_SOLID, subject });
    else if (m >= 70) drops.push({ ...REWARD_TRIGGERS.Q_GOOD, subject });
    else if (m >= 50) drops.push({ ...REWARD_TRIGGERS.Q_IMPROVED, subject });

    if (isFirstQuest && !isExplore) drops.push({ ...REWARD_TRIGGERS.Q_FIRST, subject });

    // 2. Streak Milestones
    if (streak === 3)   drops.push({ ...REWARD_TRIGGERS.S_3D, subject: 'master' });
    if (streak === 7)   drops.push({ ...REWARD_TRIGGERS.S_7D, subject: 'master' });
    if (streak === 14)  drops.push({ ...REWARD_TRIGGERS.S_14D, subject: 'master' });
    if (streak === 30)  drops.push({ ...REWARD_TRIGGERS.S_30D, subject: 'master' });
    if (streak === 50)  drops.push({ ...REWARD_TRIGGERS.S_50D, subject: 'master' });
    if (streak === 100) drops.push({ ...REWARD_TRIGGERS.S_100D, subject: 'master' });

    if (isWeekend) drops.push({ ...REWARD_TRIGGERS.S_WEEKEND, subject: 'master' });
    if (isMorning) drops.push({ ...REWARD_TRIGGERS.S_EARLY, subject: 'master' });
    if (isNight)   drops.push({ ...REWARD_TRIGGERS.S_NIGHT, subject: 'master' });

    // 3. Time Milestones (sessionTime in minutes)
    if (sessionTime >= 300)      drops.push({ ...REWARD_TRIGGERS.T_5H, subject: 'master' });
    else if (sessionTime >= 120) drops.push({ ...REWARD_TRIGGERS.T_2H, subject: 'master' });
    else if (sessionTime >= 60)  drops.push({ ...REWARD_TRIGGERS.T_1H, subject: 'master' });
    else if (sessionTime >= 30)  drops.push({ ...REWARD_TRIGGERS.T_30M, subject: 'master' });

    // 4. Subject Specific Milestones
    if (subjectCounts) {
        if (subjectCounts.science === 10) drops.push({ ...REWARD_TRIGGERS.SB_SCI_10, subject: 'science' });
        if (subjectCounts.math === 10)    drops.push({ ...REWARD_TRIGGERS.SB_MATH_10, subject: 'math' });
        if (subjectCounts.sst === 10)     drops.push({ ...REWARD_TRIGGERS.SB_SST_10, subject: 'sst' });
        if (subjectCounts.english === 10) drops.push({ ...REWARD_TRIGGERS.SB_ENG_10, subject: 'english' });
        
        const subjectsStudied = Object.values(subjectCounts).filter(count => count > 0).length;
        if (subjectsStudied >= 4) drops.push({ ...REWARD_TRIGGERS.SB_MULTI, subject: 'master' });
    }

    // 5. Mode Excellence
    if (modeAchievements) {
        if (modeAchievements.speedrunPerfect) drops.push({ ...REWARD_TRIGGERS.M_SPEED_KING, subject: 'master' });
        if (modeAchievements.reversePerfect)  drops.push({ ...REWARD_TRIGGERS.M_REV_GENIUS, subject: 'master' });
        if (modeAchievements.quakeSurvive)    drops.push({ ...REWARD_TRIGGERS.M_QUAKE_SURV, subject: 'master' });
        if (modeAchievements.noMistakes)      drops.push({ ...REWARD_TRIGGERS.M_NO_MISTAKE, subject: 'master' });
        if (comboCount >= 10)                 drops.push({ ...REWARD_TRIGGERS.M_COMBO_10, subject: 'master' });
        if (rescueUsed)                       drops.push({ ...REWARD_TRIGGERS.M_RESCUE_WIN, subject: 'master' });
    }

    // 6. Vault Explorer
    if (artifactCount === 1)  drops.push({ ...REWARD_TRIGGERS.V_DISCOVERY, subject: 'master' });
    if (artifactCount === 5)  drops.push({ ...REWARD_TRIGGERS.V_ARCHIVIST, subject: 'master' });
    if (artifactCount === 20) drops.push({ ...REWARD_TRIGGERS.V_MUSEUM, subject: 'master' });

    // 7. Participation (Fallback) - DISABLED per strict logic request
    if (drops.length === 0) {
        console.log("🎁 [ChestService] No rewards earned for this quest (Strict Logic)");
        return [];
    }

    // Sort by tier: Diamond > Gold > Silver > Bronze
    const tierPriority = { diamond: 4, gold: 3, silver: 2, bronze: 1 };
    const bestDrop = drops.sort((a, b) => tierPriority[b.type] - tierPriority[a.type])[0];

    if (!bestDrop) return [];

    return [{
        chestType: bestDrop.type || 'bronze',
        reason: bestDrop.reason,
        rewards: generateBalancedRewards(bestDrop.type, bestDrop.subject)
    }];
}

/**
 * Reward Generator
 * Strictly Awards COINS and GEMS. No XP.
 */
function generateBalancedRewards(type, subject = 'overall') {
    const config = {
        bronze:  { coins: [50, 100],   gems: [2, 5] },
        silver:  { coins: [150, 250],  gems: [8, 12] },
        gold:    { coins: [300, 500],  gems: [15, 25] },
        diamond: { coins: [600, 1000], gems: [40, 60] }
    };
    
    const cfg = config[type] || config.bronze;
    const roll = (range) => Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

    return [
        { type: 'coins', amount: roll(cfg.coins) },
        { type: 'gems',  amount: roll(cfg.gems), subject }
    ];
}

// ── Legacy Compatibility Shim ───────────────────────────────────────────────
export function rollChestRewards(type) {
    return generateBalancedRewards(type);
}

export function shouldDropBronzeChest() {
    return false; // Deterministic drops only now
}

export function getQuestCompletionChest(stars, nodeType) {
    if (nodeType === 'PRACTICE' && stars === 3) return 'bronze';
    if (nodeType === 'REINFORCE' && stars === 3) return 'silver';
    if (nodeType === 'MASTERY') {
        if (stars >= 12) return 'gold';
        if (stars >= 9) return 'silver';
        return 'bronze';
    }
    return null;
}

export function masteryToStars(mastery) {
    if (mastery >= 90) return 3;
    if (mastery >= 70) return 2;
    if (mastery >= 50) return 1;
    return 0;
}

export function getStarBonusCoins(stars) {
    return stars * 20;
}
