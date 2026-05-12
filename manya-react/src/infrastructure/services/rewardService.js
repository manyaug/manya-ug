import { syncService } from '../sync/syncService.js';
import { storageFacade } from '../storage/storageFacade.js';
import { rollChestRewards } from '../../domain/gamification/chestService.js';

/**
 * MANYA REWARD SERVICE (Phase 2 🎁)
 * ============================================================
 * Handles the "Inventory" model for rewards.
 * Decouples Quest completion from immediate currency granting.
 */
export const rewardService = {

    /**
     * GRANT CHEST
     * Adds a chest to the user's permanent inventory.
     */
    async grantChest(userId, chestType, reason = 'quest_completion') {
        const payload = {
            user_id: userId,
            chest_type: chestType,
            // reason: reason, // [FIX]: Column does not exist in schema
            opened: false,
            created_at: new Date().toISOString()
        };

        const data = await storageFacade.put('db:/user_chests', payload);
        // Put returns the upserted data array, we want the single record
        const record = Array.isArray(data) ? data[0] : data;

        console.log(`🎁 [RewardService] Chest Granted: ${chestType} (${reason})`);
        return record;
    },

    /**
     * FETCH PENDING CHESTS
     * Pulls all unopened chests for the user.
     */
    async fetchPendingChests(userId) {
        try {
            const data = await storageFacade.get(`db:/user_chests?uid=${userId}&opened=false&order=created_at:asc`);
            
            // Map database schema to app schema
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
     * OPEN CHEST
     * Calculates rewards and updates balance via transaction ledger.
     */
    async openChest(chestId) {
        // 1. Fetch Chest
        const chest = await storageFacade.get(`db:/user_chests/${chestId}`);

        if (!chest) throw new Error('Chest not found');
        if (chest.opened) throw new Error('Chest already opened');

        // 2. Calculate Rewards (RNG weights from Domain)
        const rewards = rollChestRewards(chest.chest_type);

        // 3. Mark as Opened
        await storageFacade.patch(`db:/user_chests/${chestId}`, { 
            opened: true, 
            opened_at: new Date().toISOString() 
        });

        // 4. Apply Rewards to Balance & Ledger
        for (const r of rewards) {
            const currencyKey = r.type === 'gems' ? `gem_${r.subject || 'overall'}` : r.type;
            await syncService.updateBalance(
                currencyKey, 
                r.amount, 
                'CHEST_REWARD', 
                chestId
            );
        }
        return {
            rewards,
            reason: chest.reason
        };
    }
};
