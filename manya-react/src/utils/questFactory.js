/**
 * MANYA QUEST FACTORY - v1.0
 * ===========================
 * Builds a steps[] array for a given node type by collecting the
 * right content JSON files from /content/{subject}/{unitId}/{questFolder}/.
 *
 * Node types (matching QuestPathView STEPS):
 *   WARMUP      → first 3 numbered practice files (easy)
 *   EXPLORE     → all study/resource JSON files for the quest
 *   PRACTICE    → next 5 numbered practice files
 *   REINFORCE   → latest 4 numbered files (harder)
 *   MASTERY     → all numbered files (full challenge)
 *
 * Numbered files follow the pattern:  {prefix}-NNN.json
 * Resource  files follow the pattern:  {file}.json  (from curriculum resources[])
 */

import { loadQuestSteps, contentUrl } from './questLoader.js';

/**
 * Build steps for a quest node tap.
 *
 * @param {object} params
 * @param {string} params.subject       e.g. 'math'
 * @param {string} params.unitId        e.g. 'set_theory'
 * @param {string} params.questFolder   e.g. 'quest_01_finite_infinite_sets'
 * @param {string} params.prefix        e.g. '01' (for numbered files)
 * @param {number} params.practiceCount total number of practice files
 * @param {Array}  params.resources     array of { label, file } from curriculum
 * @param {string} params.nodeType      WARMUP | EXPLORE | PRACTICE | REINFORCE | MASTERY
 *
 * @returns {Promise<Array>} steps[]
 */
export async function buildSteps({ subject, unitId, questFolder, prefix, practiceCount, resources, nodeType }) {

    // ── EXPLORE: fetch study JSON files listed in curriculum resources ────────
    if (nodeType === 'EXPLORE') {
        if (!resources || resources.length === 0) return [];
        const allSteps = [];
        for (const res of resources) {
            try {
                const { steps } = await loadQuestSteps(subject, unitId, questFolder, res.file);
                allSteps.push(...steps);
            } catch (e) {
                console.warn(`[QuestFactory] Could not load resource: ${res.file}`, e);
            }
        }
        return allSteps;
    }

    // ── PRACTICE / WARMUP / REINFORCE / MASTERY: numbered files ─────────────
    if (!practiceCount || practiceCount === 0 || !prefix) return [];

    // Generate the list of numbered file IDs
    const allIDs = Array.from({ length: practiceCount }, (_, i) =>
        `${prefix}-${String(i + 1).padStart(3, '0')}`
    );

    let slice;
    switch (nodeType) {
        case 'WARMUP':     slice = allIDs.slice(0, Math.min(3, allIDs.length));  break;
        case 'PRACTICE':   slice = allIDs.slice(0, Math.min(5, allIDs.length));  break;
        case 'REINFORCE':  slice = allIDs.slice(Math.max(0, Math.floor(allIDs.length / 2)));  break;
        case 'MASTERY':    slice = allIDs;  break;
        default:           slice = allIDs.slice(0, 3);
    }

    const allSteps = [];
    for (const id of slice) {
        try {
            const { steps } = await loadQuestSteps(subject, unitId, questFolder, id);
            allSteps.push(...steps);
        } catch (e) {
            console.warn(`[QuestFactory] Could not load numbered file: ${id}`, e);
        }
    }
    return allSteps;
}
