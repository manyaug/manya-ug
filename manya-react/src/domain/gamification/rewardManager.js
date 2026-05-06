/**
 * MANYA REWARD MANAGER (Headless)
 * ================================
 * Centralized logic for calculating and awarding Gems, Coins, XP, and Chests.
 * Prevents logic duplication and "infinite loop" bugs across subject engines.
 */

import { awardGems, awardCoins, dropChest, checkAchievements } from '../../store/userSlice';
import { getModeCoinMultiplier } from './gameModeEngine';
import { shouldDropBronzeChest, rollChestRewards, masteryToStars, getStarBonusCoins, evaluateRewards } from './chestService';

export const rewardManager = {
    /**
     * Awards rewards for a single correct question/step.
     * v5.2: Removed direct dispatching to prevent "Sync Gap". 
     * Now returns values for the QuestRunner to settle at the end.
     */
    awardStepRewards({ subject, hintUsed, streak, gameMode, isSimulation }) {
        const streakMultiplier = (streak >= 7) ? 1.5 : (streak >= 5) ? 1.3 : (streak >= 3) ? 1.1 : 1.0;
        const modeMultiplier = getModeCoinMultiplier(gameMode);

        // Gems are rare: 1 for MCQ, 3 for Simulation
        const baseGems = isSimulation ? 3 : 0.5; // 0.5 means 50% chance or we floor it
        const totalGems = hintUsed ? 0 : Math.floor(baseGems * streakMultiplier);
        
        // Coins: 5 for MCQ, 10 for Simulation
        const baseCoins = isSimulation ? 10 : 5;
        const totalCoins = Math.floor((hintUsed ? Math.floor(baseCoins / 2) : baseCoins) * streakMultiplier * modeMultiplier);
        
        // NO DISPATCH HERE! Let the QuestRunner handle the final transaction.
        return { gems: totalGems, coins: totalCoins };
    },

    /**
     * Awards rewards for completing a full quest.
     */
    awardQuestRewards({ mastery, nodeType, streak = 0, sessionTime = 0, modeAchievements = {} }, dispatch) {
        const stars = masteryToStars(mastery);
        const bonusCoins = getStarBonusCoins(stars);
        
        if (bonusCoins > 0) {
            dispatch(awardCoins(bonusCoins));
        }

        // 🎁 Use the new Premium Matrix
        const rewards = evaluateRewards({
            mastery,
            streak,
            sessionTime,
            nodeType,
            modeAchievements
        });

        rewards.forEach(drop => {
            dispatch(dropChest(drop));
        });

        dispatch(checkAchievements());

        // For UI backward compatibility (CelebrationView)
        return { 
            stars, 
            bonusCoins, 
            chestType: rewards.length > 0 ? rewards[0].chestType : null 
        };
    }
};
