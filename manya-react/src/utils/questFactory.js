/**
 * MANYA QUEST FACTORY - v3.0 (Adaptive + Content Sequencing)
 * ===========================================================
 * Builds steps[] using the FULL legacy engine rules:
 *
 * WARMUP:    Study sim first (if available) → 6 easy MCQs (80% V1, 20% V2)
 * EXPLORE:   One study JSON at a time (cycles through resources)
 * PRACTICE:  MCQs + 20% simulations. Recap if previous accuracy < 60%
 * REINFORCE: MCQs + 22% simulations. Marathon mode if struggling
 * MASTERY:   MCQs + 25% simulations. Timed if confident
 */

import { loadQuestSteps, contentUrl } from './questLoader.js';
import { getNodeMastery, getQuestProgress } from '../services/questProgressService.js';


/**
 * Build steps for a quest node tap.
 */
export async function buildSteps({ subject, unitId, questFolder, prefix, practiceCount, resources, nodeType }) {

    // ── EXPLORE: serve study JSONs ONE AT A TIME ─────────────────────────────
    if (nodeType === 'EXPLORE') {
        if (!resources || resources.length === 0) return [];

        // Filter to study/recap resources only (not practice files)
        const studyResources = resources.filter(r =>
            r.file.startsWith('study_') ||
            r.file.startsWith('recap_') ||
            r.file.includes('_study') ||
            r.file.includes('_recap')
        );

        if (studyResources.length === 0) {
            // Fallback: use all resources
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

        // Cycle through study resources — use attempt count to pick the next one
        const progressKey = `${subject}/${unitId}/${questFolder.replace(/\s+/g, '_').toLowerCase()}`;
        const exploreAttempt = getExploreAttempt(subject, progressKey);
        const resourceIdx = exploreAttempt % studyResources.length;
        const selectedResource = studyResources[resourceIdx];

        try {
            const { steps } = await loadQuestSteps(subject, unitId, questFolder, selectedResource.file);
            incrementExploreAttempt(subject, progressKey);
            return steps;
        } catch (e) {
            console.warn(`[QuestFactory] Could not load study resource: ${selectedResource.file}`, e);
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADAPTIVE FETCHER INJECTION
    // ─────────────────────────────────────────────────────────────────────────

    // ── SST: Adaptive Fetcher with content sequencing ────────────────────────
    if (subject === 'sst' && (nodeType === 'WARMUP' || nodeType === 'PRACTICE' || nodeType === 'REINFORCE' || nodeType === 'MASTERY')) {
        const steps = [];

        // WARMUP gets a study sim first (from legacy: questId === 1 → study sim at start)
        if (nodeType === 'WARMUP' && resources && resources.length > 0) {
            const studyRes = resources.find(r =>
                r.file.startsWith('study_') || r.file.includes('_study')
            );
            if (studyRes) {
                try {
                    const { steps: studySteps } = await loadQuestSteps(subject, unitId, questFolder, studyRes.file);
                    if (studySteps.length > 0) {
                        // Mark as a study sim intro step
                        studySteps[0].isStudySim = true;
                        steps.push(...studySteps);
                    }
                } catch (e) {
                    console.warn(`[QuestFactory] Could not load warmup study sim:`, e);
                }
            }
        }

        // PRACTICE/REINFORCE: insert recap if previous node mastery was low
        if (nodeType === 'PRACTICE' || nodeType === 'REINFORCE') {
            const prevNode = nodeType === 'PRACTICE' ? 'EXPLORE' : 'PRACTICE';
            const questKey = `${subject}/${unitId}/${questFolder.replace(/\s+/g, '_').toLowerCase()}`;
            const prevMastery = getNodeMastery(subject, questKey, prevNode);

            if (prevMastery < 60 && resources && resources.length > 0) {
                // Insert a recap step
                const recapRes = resources.find(r =>
                    r.file.startsWith('recap_') || r.file.includes('_recap')
                );
                if (recapRes) {
                    try {
                        const { steps: recapSteps } = await loadQuestSteps(subject, unitId, questFolder, recapRes.file);
                        steps.push(...recapSteps);
                    } catch (e) {
                        console.warn(`[QuestFactory] Could not load recap:`, e);
                    }
                }
            }
        }

        // Then the MCQ fetcher engine step
        steps.push({
            engineType: 'SST_FETCHER',
            topic: questFolder,
            mode: 'quiz',
            data: {
                topic: questFolder,
                nodeType,
                subject: 'sst',
                unitId,
                questKey: `sst/${unitId}/${questFolder}`,
            }
        });

        return steps;
    }

    // ── English: same pattern ────────────────────────────────────────────────
    if (subject === 'english' && (nodeType === 'WARMUP' || nodeType === 'PRACTICE' || nodeType === 'REINFORCE' || nodeType === 'MASTERY')) {
        return [{
            engineType: 'ENGLISH_FETCHER',
            topic: questFolder,
            mode: 'quiz',
            data: {
                topic: questFolder,
                nodeType,
                subject: 'english',
                unitId,
                questKey: `english/${unitId}/${questFolder}`,
            }
        }];
    }

    // ── NUMBERED FILES (math/science) ────────────────────────────────────────
    if (!practiceCount || practiceCount === 0 || !prefix) return [];

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


// ─── Explore cycling helpers ────────────────────────────────────────────────

function getExploreAttempt(subject, questKey) {
    try {
        const key = `manya_explore_cycle_${subject}`;
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return data[questKey] || 0;
    } catch { return 0; }
}

function incrementExploreAttempt(subject, questKey) {
    try {
        const key = `manya_explore_cycle_${subject}`;
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        data[questKey] = (data[questKey] || 0) + 1;
        localStorage.setItem(key, JSON.stringify(data));
    } catch { /* silent */ }
}
