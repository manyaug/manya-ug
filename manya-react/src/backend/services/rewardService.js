/**
 * MANYA REWARD SERVICE  (Backend Layer)
 * ========================================
 * Handles loot chest granting, inventory management, and reward payouts.
 * All operations go through storageFacade → SQLite on Android.
 */

import { syncService } from '../sync/syncService.js';
import { storageFacade } from '../storage/storageFacade.js';
import { rollChestRewards } from '../../domain/gamification/chestService.js';

export const rewardService = {
    /**
     * GRANT CHEST — Add a chest to the user's inventory.
     * Android: INSERT into user_chests SQLite table (opened=false).
     */
    async grantChest(userId, chestType, reason = 'quest_completion') {
        const payload = {
            user_id: userId,
            chest_type: chestType,
            opened: false,
            created_at: new Date().toISOString()
        };
        const data = await storageFacade.put('db:/user_chests', payload);
        const record = Array.isArray(data) ? data[0] : data;
        console.log(`🎁 [RewardService] Chest Granted: ${chestType}`);
        return record;
    },

    /**
     * FETCH PENDING CHESTS — Get all unopened chests for the user.
     * Android: SELECT * FROM user_chests WHERE user_id=? AND opened=0 ORDER BY created_at ASC
     */
    async fetchPendingChests(userId) {
        try {
            const data = await storageFacade.get(`db:/user_chests?uid=${userId}&opened=false&order=created_at:asc`);
            return data.map(c => ({
                id: c.id,
                chestType: c.chest_type,
                reason: c.reason || 'Earned from Quest'
            }));
        } catch (error) {
            console.error('❌ [RewardService] Failed to fetch chests:', error.message);
            return [];
        }
    },

    /**
     * OPEN CHEST — Calculate rewards and apply them to the user's balance.
     * Android:
     *   1. SELECT from user_chests WHERE id=chestId
     *   2. Run rollChestRewards (this is pure JS logic, no DB needed)
     *   3. UPDATE user_chests SET opened=1, opened_at=now() WHERE id=chestId
     *   4. Call syncService.updateBalance for each reward
     */
    async openChest(chestId) {
        const chest = await storageFacade.get(`db:/user_chests/${chestId}`);
        if (!chest) throw new Error('Chest not found');
        if (chest.opened) throw new Error('Chest already opened');

        const rewards = rollChestRewards(chest.chest_type);

        await storageFacade.patch(`db:/user_chests/${chestId}`, {
            opened: true,
            opened_at: new Date().toISOString()
        });

        for (const r of rewards) {
            const currencyKey = r.type === 'gems' ? `gem_${r.subject || 'overall'}` : r.type;
            await syncService.updateBalance(currencyKey, r.amount, 'CHEST_REWARD', chestId);
        }
        return { rewards, reason: chest.reason };
    }
};
