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
import { getQuestKey, getNodeMastery, getQuestProgress } from '../services/questProgressService.js';


/**
 * Build steps for a quest node tap.
 */
export async function buildSteps({ subject, unitId, questFolder, prefix, practiceCount, resources, nodeType }) {

    // ─────────────────────────────────────────────────────────────────────────
    // ADAPTIVE FETCHER INJECTION
    // ─────────────────────────────────────────────────────────────────────────

    // ── SST: Adaptive Fetcher with content sequencing ────────────────────────
    if (subject === 'sst' && (nodeType === 'WARMUP' || nodeType === 'EXPLORE' || nodeType === 'PRACTICE' || nodeType === 'REINFORCE' || nodeType === 'MASTERY')) {
        const steps = [];
        let postWarmupSteps = []; // Holds the warmup recap to be injected *after* the test

        // WARMUP gets 1 intro study sim, EXPLORE gets all available matching json activities
        if ((nodeType === 'WARMUP' || nodeType === 'EXPLORE') && resources && resources.length > 0) {
            const matchingResources = resources.filter(r =>
                r.file.startsWith('study_') || r.file.includes('_study') ||
                r.file.startsWith('recap_') || r.file.includes('_recap') ||
                r.file.startsWith('puzzle_') || r.file.includes('_puzzle') ||
                r.file.startsWith('quiz_') || r.file.includes('_quiz') ||
                r.file.includes('project_genesis') || r.file.includes('extremes_of_africa')
            );

            // WARMUP takes the first one, EXPLORE takes the whole battery
            const targetResources = nodeType === 'EXPLORE' ? matchingResources : matchingResources.slice(0, 1);

            // Orchestrate the sequence: 1. Recap (Refresh) -> 2. Study (Learn) -> 3. Quiz/Puzzle (Verify)
            targetResources.sort((a, b) => {
                const getWeight = (file) => {
                    const lower = file.toLowerCase();
                    if (lower.includes('recap')) return 1;
                    if (lower.includes('study')) return 2;
                    if (lower.includes('quiz') || lower.includes('puzzle') || lower.includes('project_') || lower.includes('extremes_')) return 3;
                    return 4;
                };
                return getWeight(a.file) - getWeight(b.file);
            });

            for (const studyRes of targetResources) {
                // Determine whether it needs .json suffix
                const fileName = studyRes.file.endsWith('.json') ? studyRes.file : `${studyRes.file}.json`;
                try {
                    const { steps: studySteps } = await loadQuestSteps(subject, unitId, questFolder, fileName);
                    if (studySteps.length > 0) {
                        // Mark as a study sim intro step
                        studySteps[0].isStudySim = true;
                        if (nodeType === 'WARMUP') {
                            postWarmupSteps.push(...studySteps);
                        } else {
                            steps.push(...studySteps);
                        }
                    }
                } catch (e) {
                    console.warn(`[QuestFactory] Could not load study asset ${fileName}:`, e);
                }
            }
        }

        // PRACTICE/REINFORCE: insert recap if previous node mastery was low
        if (nodeType === 'PRACTICE' || nodeType === 'REINFORCE') {
            const prevNode = nodeType === 'PRACTICE' ? 'EXPLORE' : 'PRACTICE';
            const questKey = getQuestKey(subject, unitId, questFolder);
            const prevMastery = getNodeMastery(subject, questKey, prevNode);

            if (prevMastery < 60 && resources && resources.length > 0) {
                // Insert a recap step
                const recapRes = resources.find(r =>
                    r.file.startsWith('recap_') || r.file.includes('_recap') ||
                    r.file.startsWith('study_') || r.file.includes('_study')
                );
                if (recapRes) {
                    const fileName = recapRes.file.endsWith('.json') ? recapRes.file : `${recapRes.file}.json`;
                    try {
                        const { steps: recapSteps } = await loadQuestSteps(subject, unitId, questFolder, fileName);
                        steps.push(...recapSteps);
                    } catch (e) {
                        console.warn(`[QuestFactory] Could not load recap:`, e);
                    }
                }
            }
        }

        // Then the MCQ fetcher engine step (except for EXPLORE which is just study/recap)
        if (nodeType !== 'EXPLORE') {
            steps.push({
                engineType: 'SST_FETCHER',
                topic: questFolder,
                mode: 'quiz',
                data: {
                    topic: questFolder,
                    nodeType,
                    subject: 'sst',
                    unitId,
                    questKey: getQuestKey('sst', unitId, questFolder),
                }
            });
        }

        // Push Warmup recap *after* the fetcher step as requested by user
        if (postWarmupSteps.length > 0) {
            steps.push(...postWarmupSteps);
        }

        return steps;
    }

    // ── English: same pattern ────────────────────────────────────────────────
    if (subject === 'english' && (nodeType === 'WARMUP' || nodeType === 'EXPLORE' || nodeType === 'PRACTICE' || nodeType === 'REINFORCE' || nodeType === 'MASTERY')) {
        const steps = [];
        
        // TODO: English can also push JSON recaps here if available in the future.
        
        if (nodeType !== 'EXPLORE') {
            steps.push({
                engineType: 'ENGLISH_FETCHER',
                topic: questFolder,
                mode: 'quiz',
                data: {
                    topic: questFolder,
                    nodeType,
                    subject: 'english',
                    unitId,
                    questKey: getQuestKey('english', unitId, questFolder),
                }
            });
        }
        return steps;
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
