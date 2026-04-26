/**
 * MANYA REWARD MANAGER (Headless)
 * ================================
 * Centralized logic for calculating and awarding Gems, Coins, XP, and Chests.
 * Prevents logic duplication and "infinite loop" bugs across subject engines.
 */

import { awardGems, awardCoins, addXP, dropChest, checkAchievements } from '../../store/userSlice';
import { getModeCoinMultiplier } from './gameModeEngine';
import { shouldDropBronzeChest, rollChestRewards, masteryToStars, getStarBonusCoins, getQuestCompletionChest } from './chestService';

export const rewardManager = {
    /**
     * Awards rewards for a single correct question/step.
     * @param {object} params 
     * @param {string} params.subject - math, science, sst, english
     * @param {boolean} params.hintUsed
     * @param {number} params.streak - user's current streak
     * @param {string} params.gameMode - current game mode
     * @param {boolean} params.isSimulation - whether the step was a simulation
     * @param {function} dispatch - redux dispatch
     */
    awardStepRewards({ subject, hintUsed, streak, gameMode, isSimulation }, dispatch) {
        // 1. Calculate Multipliers
        const streakMultiplier = (streak >= 7) ? 2.0 : (streak >= 5) ? 1.5 : (streak >= 3) ? 1.2 : 1.0;
        const modeMultiplier = getModeCoinMultiplier(gameMode);

        // 2. Calculate Base Rewards
        const baseGems = isSimulation ? 8 : 4;
        const totalGems = hintUsed ? Math.floor(baseGems / 4) : Math.floor(baseGems * streakMultiplier);
        
        const baseCoins = isSimulation ? 12 : 8;
        const totalCoins = Math.floor((hintUsed ? Math.floor(baseCoins / 2.5) : baseCoins) * streakMultiplier * modeMultiplier);
        
        const xpAmount = isSimulation ? 20 : 10;

        // 3. Dispatch Awards
        if (totalGems > 0) {
            dispatch(awardGems({ subject, amount: totalGems, xp: xpAmount }));
        } else {
            dispatch(addXP(xpAmount));
        }

        if (totalCoins > 0) {
            dispatch(awardCoins(totalCoins));
        }

        // 4. Random Bronze Chest Drop
        if (shouldDropBronzeChest()) {
            const rewards = rollChestRewards('bronze');
            dispatch(dropChest({ chestType: 'bronze', rewards }));
        }

        // 5. Trigger Badge Check
        dispatch(checkAchievements());

        return { gems: totalGems, coins: totalCoins, xp: xpAmount };
    },

    /**
     * Awards rewards for completing a full quest.
     * @param {object} params
     * @param {number} params.mastery - 0-100
     * @param {string} params.nodeType - PRACTICE, REINFORCE, MASTERY
     * @param {function} dispatch - redux dispatch
     */
    awardQuestRewards({ mastery, nodeType }, dispatch) {
        const stars = masteryToStars(mastery);
        const bonusCoins = getStarBonusCoins(stars);
        
        if (bonusCoins > 0) {
            dispatch(awardCoins(bonusCoins));
        }

        const chestType = getQuestCompletionChest(stars, nodeType);
        if (chestType) {
            const rewards = rollChestRewards(chestType);
            dispatch(dropChest({ chestType, rewards }));
        }

        // Global Badge Check on Completion
        dispatch(checkAchievements());

        return { stars, bonusCoins, chestType };
    }
};
