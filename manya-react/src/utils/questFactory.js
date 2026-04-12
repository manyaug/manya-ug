/**
 * MANYA QUEST FACTORY - v4.0 (English Data-Driven Refactor)
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
import { fetchEnglishQuestions } from '../services/englishMockDB.js';
import { getQuestKey, getNodeMastery, getQuestProgress } from '../services/questProgressService.js';


/**
 * Build steps for a quest node tap.
 */
export async function buildSteps({ subject, unitId, questFolder, prefix, practiceCount, resources, nodeType }) {

    // ─────────────────────────────────────────────────────────────────────────
    // ADAPTIVE FETCHER INJECTION
    // ─────────────────────────────────────────────────────────────────────────

    const FETCHER_MAP = {
        'sst': 'SST_FETCHER',
        'math': 'MATH_FETCHER',
        'science': 'SCIENCE_FETCHER',
        'english': 'ENGLISH_FETCHER'
    };

    // ── English: Data-Driven Two-Layer Architecture ──────────────────────────
    if (subject === 'english' && ['WARMUP', 'EXPLORE', 'PRACTICE', 'REINFORCE', 'MASTERY'].includes(nodeType)) {
        const steps = [];
        const questKey = getQuestKey('english', unitId, questFolder);

        // 1. EXPLORE: Load the narrative story JSON directly (CHAT + interactive games)
        if (nodeType === 'EXPLORE') {
            try {
                // Try to find the QUEST_STORY item in the database bank first
                const allQuestions = await fetchEnglishQuestions(questFolder);
                const storyAnchor = allQuestions.find(q => q.type === 'QUEST_STORY' || q.item_type === 'QUEST_STORY');
                
                if (storyAnchor) {
                    const stepsToFlatten = storyAnchor.steps || storyAnchor.data?.steps || storyAnchor.interaction_config?.steps;
                    const cdnUrl = storyAnchor.cdn_url || storyAnchor.data?.cdn_url || storyAnchor.interaction_config?.cdn_url;

                    if (stepsToFlatten && stepsToFlatten.length > 0) {
                        return stepsToFlatten.map(s => ({ ...s, item_type: 'QUEST_STORY' }));
                    } else if (cdnUrl || storyAnchor.qid) {
                        // If it's a pointer, use the smart loader to follow the CDN link
                        const qid = storyAnchor.qid || storyAnchor.id;
                        const loaded = await loadQuestSteps('english', unitId, questFolder, qid);
                        if (loaded.steps) {
                            return loaded.steps.map(s => ({ ...s, item_type: 'QUEST_STORY' }));
                        }
                    }
                }

                // Fallback to legacy file-based loader
                const storyFile = deriveStoryFile(questFolder);
                const fileName = storyFile.endsWith('.json') ? storyFile : `${storyFile}.json`;
                const { steps: storySteps } = await loadQuestSteps('english', unitId, questFolder, fileName);
                if (storySteps.length > 0) {
                    return storySteps;
                }
            } catch (e) {
                console.warn(`[QuestFactory] Could not load English story steps:`, e);
            }
            
            // Fallback: Use FETCHER in story mode if all else fails
            steps.push({
                engineType: 'ENGLISH_FETCHER',
                topic: questFolder,
                mode: 'story',
                data: { topic: questFolder, nodeType: 'EXPLORE', subject: 'english', unitId, questKey }
            });
            return steps;
        }

        // 2. WARMUP: Rule Card Injection (e.g., rule_going_to)
        if (nodeType === 'WARMUP' && resources && resources.length > 0) {
            const ruleRes = resources.find(r => r.file.startsWith('rule_') || r.file.includes('_rule'));
            if (ruleRes) {
                const fileName = ruleRes.file.endsWith('.json') ? ruleRes.file : `${ruleRes.file}.json`;
                try {
                    const { steps: ruleSteps } = await loadQuestSteps('english', unitId, questFolder, fileName);
                    if (ruleSteps.length > 0) {
                        steps.push(...ruleSteps);
                    }
                } catch (e) {
                    console.warn(`[QuestFactory] Could not load rule card: ${fileName}`, e);
                }
            }
        }

        // 3. ALL: MCQ Fetcher Engine (Adaptive Quiz Bank)
        steps.push({
            engineType: 'ENGLISH_FETCHER',
            topic: questFolder,
            mode: 'quiz',
            data: {
                topic: questFolder,
                nodeType,
                subject: 'english',
                unitId,
                questKey,
                simResources: resources?.filter(r => !r.file.startsWith('rule_') && !r.file.includes('_rule')) || []
            }
        });

        return steps;
    }

    // Helper: quest_01_holiday_kickoff -> "01_holiday_kickoff"
    function deriveStoryFile(subName) {
        if (!subName) return null;
        return subName.replace(/^quest_/, '');
    }

    // ── SST, Math, Science: Adaptive Fetcher with content sequencing ────────
    if (['sst', 'math', 'science'].includes(subject) && (nodeType === 'WARMUP' || nodeType === 'EXPLORE' || nodeType === 'PRACTICE' || nodeType === 'REINFORCE' || nodeType === 'MASTERY')) {
        const steps = [];
        let postWarmupSteps = []; // Holds the warmup recap to be injected *after* the test

        // WARMUP gets 1 intro study sim, EXPLORE gets all available matching json activities
        if ((nodeType === 'WARMUP' || nodeType === 'EXPLORE') && resources && resources.length > 0) {
            const matchingResources = resources.filter(r => {
                // EXPLORE is strictly for note_ files only
                if (nodeType === 'EXPLORE') {
                    return r.file.startsWith('note_') || r.file.includes('_note');
                }
                // WARMUP and others maintain the broader set
                return (
                    r.file.startsWith('study_') || r.file.includes('_study') ||
                    r.file.startsWith('recap_') || r.file.includes('_recap') ||
                    r.file.startsWith('note_') || r.file.includes('_note') ||
                    r.file.startsWith('puzzle_') || r.file.includes('_puzzle') ||
                    r.file.startsWith('quiz_') || r.file.includes('_quiz') ||
                    r.file.includes('project_genesis') || r.file.includes('extremes_of_africa')
                );
            });

            // WARMUP takes the first one, EXPLORE takes the whole battery
            const targetResources = nodeType === 'EXPLORE' ? matchingResources : matchingResources.slice(0, 1);

            // Orchestrate the sequence: 1. Recap (Refresh) -> 2. Study (Learn) -> 3. Quiz/Puzzle (Verify)
            targetResources.sort((a, b) => {
                const getWeight = (file) => {
                    const lower = file.toLowerCase();
                    if (lower.includes('note_')) return 0;
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

        // ── IDENTIFY SIMULATIONS (Partitioned: Recap vs Quiz/Sim) ──
        let selectedSims = [];
        let recapSims = [];
        if ((nodeType === 'WARMUP' || nodeType === 'PRACTICE' || nodeType === 'REINFORCE' || nodeType === 'MASTERY')) {
            // A. Check for explicit JSON resources — partition into recap vs quiz
            if (resources && resources.length > 0) {
                for (const r of resources) {
                    const lower = (r.file || '').toLowerCase();
                    if (lower.startsWith('recap_') || lower.includes('_recap')) {
                        recapSims.push(r);
                    } else {
                        selectedSims.push(r);
                    }
                }
            }

            // B. Check for Numbered Practice convention
            const inferredPrefix = prefix || (questFolder.startsWith('quest_') ? questFolder.split('_')[1] : null);

            if (practiceCount > 0 && inferredPrefix) {
                for (let i = 1; i <= practiceCount; i++) {
                    const fileName = `${inferredPrefix}-${String(i).padStart(3, '0')}.json`;
                    if (!selectedSims.find(s => s.file === fileName)) {
                        selectedSims.push({ label: `Task ${i}`, file: fileName });
                    }
                }
            }
        }

        // PRACTICE/REINFORCE: insert recap upfront if previous node mastery was low
        if (nodeType === 'PRACTICE' || nodeType === 'REINFORCE') {
            const prevNode = nodeType === 'PRACTICE' ? 'EXPLORE' : 'PRACTICE';
            const questKey = getQuestKey(subject, unitId, questFolder);
            const prevMastery = getNodeMastery(subject, questKey, prevNode);

            if (prevMastery < 60 && recapSims.length > 0) {
                // Pre-inject the first recap as an intro step when previous mastery was low
                const recapRes = recapSims[0];
                const fileName = recapRes.file.endsWith('.json') ? recapRes.file : `${recapRes.file}.json`;
                try {
                    const { steps: recapSteps } = await loadQuestSteps(subject, unitId, questFolder, fileName);
                    steps.push(...recapSteps);
                } catch (e) {
                    console.warn(`[QuestFactory] Could not load recap:`, e);
                }
            }
        }

        // Then the MCQ fetcher engine step
        if (nodeType !== 'EXPLORE') {
            steps.push({
                engineType: FETCHER_MAP[subject],
                topic: questFolder,
                mode: 'quiz',
                data: {
                    topic: questFolder,
                    nodeType,
                    subject: subject,
                    unitId,
                    questKey: getQuestKey(subject, unitId, questFolder),
                    simResources: selectedSims,
                    recapResources: recapSims  // NEW: Separate channel for 3-consecutive-wrong rescue
                }
            });
        }

        if (postWarmupSteps.length > 0) {
            steps.push(...postWarmupSteps);
        }

        return steps;
    }

    // ── NUMBERED FILES (fallback) ──────────────────────────────────────────
    if (!practiceCount || practiceCount === 0 || !prefix) return [];

    const allIDs = Array.from({ length: practiceCount }, (_, i) =>
        `${prefix}-${String(i + 1).padStart(3, '0')}`
    );

    const allSteps = [];
    for (const id of allIDs) {
        try {
            const { steps } = await loadQuestSteps(subject, unitId, questFolder, id);
            allSteps.push(...steps);
        } catch (e) {
            console.warn(`[QuestFactory] Could not load numbered file: ${id}`, e);
        }
    }
    return allSteps;
}
