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
     */
    awardStepRewards({ subject, hintUsed, streak, gameMode, isSimulation }, dispatch) {
        const streakMultiplier = (streak >= 7) ? 2.0 : (streak >= 5) ? 1.5 : (streak >= 3) ? 1.2 : 1.0;
        const modeMultiplier = getModeCoinMultiplier(gameMode);

        const baseGems = isSimulation ? 8 : 4;
        const totalGems = hintUsed ? Math.floor(baseGems / 4) : Math.floor(baseGems * streakMultiplier);
        
        const baseCoins = isSimulation ? 12 : 8;
        const totalCoins = Math.floor((hintUsed ? Math.floor(baseCoins / 2.5) : baseCoins) * streakMultiplier * modeMultiplier);
        
        if (totalGems > 0) {
            dispatch(awardGems({ subject, amount: totalGems }));
        }

        if (totalCoins > 0) {
            dispatch(awardCoins(totalCoins));
        }

        // Random drops are now mostly handled by the end-of-quest matrix, 
        // but we keep the legacy call for legacy safety (it returns false anyway).
        if (shouldDropBronzeChest()) {
            const rewards = rollChestRewards('bronze');
            dispatch(dropChest({ chestType: 'bronze', rewards }));
        }

        dispatch(checkAchievements());
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
