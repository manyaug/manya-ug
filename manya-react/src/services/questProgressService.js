/**
 * MANYA QUEST PROGRESS SERVICE
 * =============================
 * localStorage-based mastery & node-unlock tracking.
 * Ported from: questManager.js (isQuestUnlocked, updateQuestProgress)
 *
 * Storage key:  manya_quest_progress_{subject}
 * Shape:  { [questKey]: { warmup: { mastery, status, attempts }, explore: {...}, ... } }
 *
 * Node unlock thresholds (from legacy questManager):
 *   WARMUP   → always open
 *   EXPLORE  → Warmup ≥ 60%
 *   PRACTICE → Explore ≥ 65%
 *   REINFORCE→ Practice ≥ 70%
 *   MASTERY  → Reinforce ≥ 75%
 */

import { syncService } from './syncService';

// ─── Node definitions ────────────────────────────────────────────────────────

const NODE_ORDER = ['WARMUP', 'EXPLORE', 'PRACTICE', 'REINFORCE', 'MASTERY'];

// XP rewards per node type (ported from Manya-app-master/quest-manager.js)
const QUEST_XP_REWARDS = {
    WARMUP:    50,
    EXPLORE:   100,
    PRACTICE:  150,
    REINFORCE: 200,
    MASTERY:   500,
};

const UNLOCK_THRESHOLDS = {
    WARMUP:    0,   // Always open
    EXPLORE:   60,  // Need 60% on Warmup
    PRACTICE:  65,  // Need 65% on Explore
    REINFORCE: 70,  // Need 70% on Practice
    MASTERY:   75,  // Need 75% on Reinforce
};

// What the PREVIOUS node needs for THIS node to unlock
const PREV_NODE = {
    WARMUP:    null,
    EXPLORE:   'WARMUP',
    PRACTICE:  'EXPLORE',
    REINFORCE: 'PRACTICE',
    MASTERY:   'REINFORCE',
};

// ─── Storage helpers ────────────────────────────────────────────────────────

function getProgressKey(subject) {
    return `manya_quest_progress_${subject}`;
}

export function loadAllProgress(subject) {
    try {
        const raw = localStorage.getItem(getProgressKey(subject));
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function saveAllProgress(subject, data) {
    localStorage.setItem(getProgressKey(subject), JSON.stringify(data));
}

/**
 * Build a stable quest key across the app.
 */
export function getQuestKey(subject, unitId, folderOrTitle) {
    const slug = folderOrTitle.replace(/\s+/g, '_').toLowerCase();
    return `${subject}/${unitId}/${slug}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get the full progress object for one quest (e.g. 'sst/locating_africa/quest_1_world_stage')
 * Returns: { WARMUP: { mastery, status, attempts, lastAttempt }, EXPLORE: {...}, ... }
 */
export function getQuestProgress(subject, questKey) {
    const all = loadAllProgress(subject);
    const quest = all[questKey] || {};

    // Ensure every node exists with defaults
    const result = {};
    for (const node of NODE_ORDER) {
        result[node] = quest[node] || { mastery: 0, status: 'locked', attempts: 0, lastAttempt: null };
    }

    // Warmup is always at least 'available'
    if (result.WARMUP.status === 'locked') {
        result.WARMUP.status = 'available';
    }

    // Recalculate unlock states from mastery data
    for (let i = 1; i < NODE_ORDER.length; i++) {
        const node = NODE_ORDER[i];
        const prevNode = NODE_ORDER[i - 1];
        const prevMastery = result[prevNode].mastery || 0;
        const threshold = UNLOCK_THRESHOLDS[node];

        if (result[node].status === 'completed') continue; // Already done

        if (prevMastery >= threshold && result[prevNode].status === 'completed') {
            if (result[node].status === 'locked') {
                result[node].status = 'available';
            }
        } else {
            // If previous didn't meet threshold, this stays locked
            if (result[node].status !== 'completed') {
                result[node].status = 'locked';
            }
        }
    }

    return result;
}

/**
 * Save the result of completing a node.
 * Returns: { unlocked: boolean, nextNode: string|null, mastery: number, needsRetry: boolean }
 */
export function saveNodeCompletion(subject, questKey, nodeType, mastery) {
    const all = loadAllProgress(subject);
    if (!all[questKey]) all[questKey] = {};
    if (!all[questKey][nodeType]) all[questKey][nodeType] = { mastery: 0, status: 'locked', attempts: 0, lastAttempt: null };

    const prev = all[questKey][nodeType];

    // Keep highest mastery
    const finalMastery = Math.max(prev.mastery, mastery);

    all[questKey][nodeType] = {
        mastery: finalMastery,
        status: 'completed',
        attempts: (prev.attempts || 0) + 1,
        lastAttempt: new Date().toISOString(),
    };

    // Determine if next node unlocks
    const nodeIdx = NODE_ORDER.indexOf(nodeType);
    const nextNode = nodeIdx < NODE_ORDER.length - 1 ? NODE_ORDER[nodeIdx + 1] : null;
    let unlocked = false;
    let needsRetry = false;

    if (nextNode) {
        const threshold = UNLOCK_THRESHOLDS[nextNode];
        if (finalMastery >= threshold) {
            // Unlock next node
            if (!all[questKey][nextNode]) {
                all[questKey][nextNode] = { mastery: 0, status: 'available', attempts: 0, lastAttempt: null };
            } else if (all[questKey][nextNode].status === 'locked') {
                all[questKey][nextNode].status = 'available';
            }
            unlocked = true;
        } else {
            needsRetry = true;
        }
    }

    saveAllProgress(subject, all);

    // ─── CLOUD SYNC: Push current node completion to Supabase ───
    syncService.updateProgress(questKey, {
        nodeType,
        mastery: finalMastery,
        status: 'completed',
        attempts: all[questKey][nodeType].attempts
    }).catch(e => console.warn('[Sync] Failed to fire progress sync:', e));

    // ─── CLOUD SYNC: Push next node unlock to Supabase ───
    if (unlocked && nextNode) {
        syncService.updateProgress(questKey, {
            nodeType: nextNode,
            mastery: all[questKey][nextNode].mastery,
            status: all[questKey][nextNode].status,
            attempts: all[questKey][nextNode].attempts
        }).catch(e => console.warn('[Sync] Failed to fire unlock sync:', e));
    }

    return {
        unlocked,
        nextNode,
        mastery: finalMastery,
        needsRetry,
        threshold: nextNode ? UNLOCK_THRESHOLDS[nextNode] : 0,
        attempts: all[questKey][nodeType].attempts,
        xpReward: QUEST_XP_REWARDS[nodeType] || 100,
    };
}

/**
 * Check if a specific node is unlocked.
 */
export function isNodeUnlocked(subject, questKey, nodeType) {
    const progress = getQuestProgress(subject, questKey);
    return progress[nodeType]?.status !== 'locked';
}

/**
 * Get status of a specific node.
 * Returns: 'locked' | 'available' | 'completed'
 */
export function getNodeStatus(subject, questKey, nodeType) {
    const progress = getQuestProgress(subject, questKey);
    return progress[nodeType]?.status || 'locked';
}

/**
 * Get the current active node index (first non-completed, available node).
 */
export function getCurrentNodeIndex(subject, questKey) {
    const progress = getQuestProgress(subject, questKey);
    for (let i = 0; i < NODE_ORDER.length; i++) {
        const status = progress[NODE_ORDER[i]]?.status;
        if (status === 'available') return i;
    }
    // All completed? Return last
    return NODE_ORDER.length - 1;
}

/**
 * Get the mastery of a specific node.
 */
export function getNodeMastery(subject, questKey, nodeType) {
    const progress = getQuestProgress(subject, questKey);
    return progress[nodeType]?.mastery || 0;
}

/**
 * Get earned gems for the quest path (3 gems per completed node).
 */
export function getEarnedGems(subject, questKey) {
    const progress = getQuestProgress(subject, questKey);
    let gems = 0;
    for (const node of NODE_ORDER) {
        if (progress[node]?.status === 'completed') gems += 3;
    }
    return gems;
}

/**
 * Track wrong answers for V1→V2→V3 retry.
 * Key: manya_wrong_qs_{subject}
 * Shape: { [questionId]: { wrongCount, lastWrong, needsRephrase } }
 */
export function trackWrongAnswer(subject, questionId) {
    const key = `manya_wrong_qs_${subject}`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');

    if (!data[questionId]) {
        data[questionId] = { wrongCount: 0, lastWrong: null, needsRephrase: false };
    }

    data[questionId].wrongCount += 1;
    data[questionId].lastWrong = new Date().toISOString();
    data[questionId].needsRephrase = true;

    localStorage.setItem(key, JSON.stringify(data));
    return data[questionId];
}

/**
 * Get questions that the student got wrong and need rephrased versions.
 */
export function getWrongQuestions(subject) {
    const key = `manya_wrong_qs_${subject}`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.entries(data)
        .filter(([_, v]) => v.needsRephrase)
        .map(([id, v]) => ({ id, ...v }));
}

/**
 * Mark a rephrased question as resolved (student got it right).
 */
export function resolveRephrased(subject, questionId) {
    const key = `manya_wrong_qs_${subject}`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    if (data[questionId]) {
        data[questionId].needsRephrase = false;
    }
    localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Track a quest node that was just finished to trigger animations in QuestPathView.
 */
export function setJustFinished(status) {
    localStorage.setItem('manya_just_finished', JSON.stringify({
        ...status,
        timestamp: Date.now()
    }));
}

/**
 * Get the last finished quest info.
 */
export function getJustFinished() {
    const raw = localStorage.getItem('manya_just_finished');
    if (!raw) return null;
    const data = JSON.parse(raw);
    
    // Only valid if finished in the last 2 minutes
    if (Date.now() - data.timestamp > 120000) return null;
    
    return data;
}

/**
 * Clear the just-finished flag explicitly.
 */
export function clearJustFinished() {
    localStorage.removeItem('manya_just_finished');
}

/**
 * Check if a quest is fully completed (MASTERY node is status === 'completed').
 */
export function isQuestCompleted(subject, questKey) {
    const all = loadAllProgress(subject);
    const quest = all[questKey] || {};
    return quest.MASTERY?.status === 'completed';
}

// Export constants
export { NODE_ORDER, UNLOCK_THRESHOLDS };
