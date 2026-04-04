import { calculateFrustration } from './psychTracker';
import { parseQuestionId, areSameConcept } from '../utils/questionParser';
import { masteryService } from './masteryService';
import { conceptMasteryService } from './conceptMasteryService';
import { spacedRepetitionService } from './spacedRepetitionService';

/**
 * MANYA ADAPTIVE ENGINE (V2)
 * ==========================
 * The intelligent brain of the Manya learning system.
 * Implements: 6-Factor Priority Scoring, 7-State Mastery Ladder, 
 *             2:1 PLE Pool Ratio, and Spaced Repetition.
 */

// ── CONSTANTS & CONFIG ──────────────────────────────────────────────────────

const VARIANT_DISTRIBUTIONS = {
    WARMUP:    { V1: 1.00, V2: 0.00, V3: 0.00 },
    EXPLORE:   { V1: 0.60, V2: 0.30, V3: 0.10 },
    PRACTICE:  { V1: 0.30, V2: 0.50, V3: 0.20 },
    REINFORCE: { V1: 0.20, V2: 0.40, V3: 0.40 },
    MASTERY:   { V1: 0.10, V2: 0.20, V3: 0.70 },
};

// Ported from quest-manager.js: Dynamic length with min/max bounds
const BASE_LENGTHS = { WARMUP: 4, EXPLORE: 8, PRACTICE: 10, REINFORCE: 12, MASTERY: 15 };
const MIN_LENGTHS  = { WARMUP: 3, EXPLORE: 5, PRACTICE: 7,  REINFORCE: 8,  MASTERY: 10 };
const MAX_LENGTHS  = { WARMUP: 6, EXPLORE: 10, PRACTICE: 12, REINFORCE: 14, MASTERY: 18 };

const MASTERY_WEIGHTS = {
    new: 100,
    struggling_v1: 90,
    struggling_v2: 85,
    struggling_v3: 80,
    learning: 60,
    ready_for_v2: 50,
    ready_for_v3: 50,
    mastered: 20,
};

// ── CORE ADAPTIVE LOGIC ─────────────────────────────────────────────────────

/**
 * Scoring Factor 1-6 Implementation
 */
export async function scoreQuestion(question, history, subject, subjectMasteryMap) {
    let score = 0;
    const factors = [];

    const { baseId: conceptId, variant } = parseQuestionId(question.id);
    const mastery = subjectMasteryMap[conceptId] || 'new';

    // 1. Mastery Level Weight (Base Score)
    const baseWeight = MASTERY_WEIGHTS[mastery] || 60;
    score += baseWeight;
    factors.push(`mastery_${mastery}`);

    // 2. Freshness / Spaced Repetition (UPGRADED from flat check to real scheduling)
    const conceptRecord = await conceptMasteryService.getConceptRecord(subject, conceptId).catch(() => null);
    const conceptAnswers = history.filter(ans => (ans.concept_id || parseQuestionId(ans.questionId).baseId) === conceptId);
    
    if (conceptRecord && conceptRecord.nextReviewAt) {
        const reviewPriority = spacedRepetitionService.getReviewPriority(conceptRecord);
        if (reviewPriority > 0) {
            score += reviewPriority;
            factors.push(reviewPriority > 40 ? 'overdue_review' : 'scheduled_review');
        }
    } else {
        // Fallback: Check raw history if no concept record exists yet
        const lastSeen = conceptAnswers.length > 0 ? new Date(conceptAnswers[conceptAnswers.length - 1].answeredAt) : null;
        
        if (lastSeen) {
            const hoursSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);
            
            // ─── STRICT EXCLUSION (24-Hour Rule) ───
            if (hoursSince < 24) {
                // If answered within the last 30 minutes, absolute exclusion
                if (hoursSince < 0.5) {
                    score -= 10000;
                    factors.push('instant_repeat_exclusion');
                } else {
                    score -= 500;
                    factors.push('24h_repeat_penalty');
                }
            }
        } else {
            score += 200; // BOOST: Never seen this concept!
            factors.push('never_seen_concept');
        }
    }

    // ─── INDIVIDUAL QUESTION EXCLUSION ───
    const qLastSeen = history.filter(ans => (ans.questionId || ans.id) === question.id).pop();
    if (qLastSeen) {
        const hoursSince = (Date.now() - new Date(qLastSeen.answeredAt).getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
            score -= 10000; // Strict exclusion for identical Q_ID
            factors.push('duplicate_exclusion');
        }
    } else {
        score += 100; // Boost individual never-seen questions
        factors.push('never_seen_question');
    }

    // 3. PLE Boost (Exam Readiness)
    const isPLE = question.pool === 'yes' || question.isPLE;
    if (isPLE) {
        score = score * 1.5;
        factors.push('ple_priority');
    }

    // 4. Frustration Mercy
    // (Handled partially in selection, but here we penalize high-difficulty if frustrated)
    // frustration logic injected via generator

    // 5. Hint Dependency
    const hintCount = conceptAnswers.filter(a => a.hintUsed).length;
    if (conceptAnswers.length > 0 && (hintCount / conceptAnswers.length) > 0.3) {
        score += 30;
        factors.push('high_hint_dependency');
    }

    // 6. Difficulty Matching (Variant Logic)
    // We boost the question if its variant matches the mastery "Ready" state
    if (mastery === 'ready_for_v2' && variant === 'V2') score += 50;
    else if (mastery === 'ready_for_v3' && variant === 'V3') score += 50;
    else if (mastery === 'new' && variant === 'V1') score += 50;
    else if (mastery.startsWith('struggling') && variant === 'V1') score += 60;

    return { score, factors, mastery };
}

/**
 * PLE Ratio Selector (2:1 Ratio)
 */
function selectTargetPool(history) {
    const recent = history.slice(-10);
    const pleCount = recent.filter(a => a.pool === 'yes' || a.is_ple).length;
    const practiceCount = recent.filter(a => a.pool === 'no' || !a.is_ple).length;
    
    // Target: 66% PLE (2:1)
    if (pleCount < practiceCount * 2) return 'yes';
    return 'no';
}

/**
 * Spacing Validator
 */
function validateSpacing(questionId, selected, minSpacing = 3) {
    const { baseId: conceptId } = parseQuestionId(questionId);
    const window = selected.slice(-minSpacing);
    return !window.some(q => parseQuestionId(q.id).baseId === conceptId);
}

// ── DYNAMIC QUEST LENGTH CALCULATOR ─────────────────────────────────────────
// Ported from: Manya-app-master/quest-manager.js calculateQuestionCount()

function calculateDynamicQuestLength(nodeType, frustrationScore, dominantMastery, topicComplexity = 'normal') {
    let count = BASE_LENGTHS[nodeType] || 10;
    const min = MIN_LENGTHS[nodeType] || 5;
    const max = MAX_LENGTHS[nodeType] || 15;

    // Mercy: Reduce if student is struggling
    if (dominantMastery?.startsWith('struggling')) {
        count = Math.max(min, count - 2);
    }

    // Mercy: Reduce if frustrated
    if (frustrationScore > 70) {
        count = Math.max(min, count - 2);
    } else if (frustrationScore < 20 && !dominantMastery?.startsWith('struggling')) {
        // Calm + not struggling → add 1 question for extra challenge
        count = Math.min(max, count + 1);
    }

    // Complex topics get fewer questions (prevent cognitive overload)
    if (topicComplexity === 'high') {
        count = Math.max(min, count - 1);
    }

    // MASTERY node always uses maximum (exam stamina building)
    if (nodeType === 'MASTERY') {
        count = max;
    }

    return Math.min(max, Math.max(min, count));
}

// ── MAIN API — GENERATE ADAPTIVE QUEST ──────────────────────────────────────

/**
 * The entry point for all Subject Fetcher Engines.
 */
export async function generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, history, simResources = []) {
    try {
        console.log(`🧠 [Adaptive] Generating ${nodeType} quest for ${subject}. Bank: ${allQuestions.length}, Sims: ${simResources.length}`);
    
    const frustration = calculateFrustration(session);
    const subjectMasteryMap = await masteryService.getSubjectMasteryOverview(subject);
    const targetPool = selectTargetPool(history);

    // Dynamic quest length (ported from quest-manager.js)
    const dominantMastery = Object.values(subjectMasteryMap)[0] || 'learning';
    const questLength = calculateDynamicQuestLength(nodeType, frustration.score, dominantMastery);

    // 1. DISCOVERY & HYDRATION (v4.7)
    // We separate DB rows into MCQs and Simulation Pointers
    const mcqPool = [];
    const discoveredSims = [];
    const usedJsonFiles = new Set();
    const cleanName = (n) => n ? n.toLowerCase().replace(/\.json$/, '').replace(/\\/g, '/').split('/').pop() : "";

    allQuestions.forEach(q => {
        const jsonRef = (q.json_reference_path && q.json_reference_path !== 'null') ? q.json_reference_path : null;
        const normType = (q.questiontype || q.type || "").toLowerCase();
        const normEngine = (q.engine_type || "").toUpperCase();
        const isSimPointer = jsonRef || normType.includes('simulation') || normEngine === 'SIM';

        if (isSimPointer) {
            // Try to HYDRATE this pointer with a real JSON resource
            const dbFileName = cleanName(q.filename || jsonRef);
            
            const matchingSim = simResources.find(s => {
                const sName = cleanName(s.file || s.id);
                return sName && (sName === dbFileName || dbFileName.includes(sName) || sName.includes(dbFileName));
            });

            if (matchingSim) {
                console.log(`🧠 [Discovery] HYDRATED: DB Pointer "${dbFileName}" -> JSON "${cleanName(matchingSim.file)}"`);
                discoveredSims.push({
                    ...matchingSim,
                    ...q, 
                    id: matchingSim.id || q.id,
                    isSimulation: true,
                    source: 'hybrid_sim'
                });
                if (matchingSim.file) usedJsonFiles.add(matchingSim.file.toLowerCase());
            } else {
                console.warn(`🧠 [Discovery] FAIL: No JSON match for DB Pointer "${dbFileName}". Pool has ${simResources.length} items. [${simResources.map(s => cleanName(s.file)).slice(0, 5).join(', ')}...]`);
            }
        } else {
            mcqPool.push(q);
        }
    });

    // 2. SELECT MCQs adaptively
    let availableQuestions = mcqPool;
    if (nodeType === 'MASTERY') {
        const strictQuestions = availableQuestions.filter(q => 
            (q.difficulty === 'hard' || q.difficulty === 'H') && 
            (q.pool === 'yes' || q.isPLE || q.is_ple)
        );
        availableQuestions = strictQuestions.length > 0 ? strictQuestions : availableQuestions;
    }

    const mcqCandidates = await Promise.all(availableQuestions.map(async q => {
        const metadata = await scoreQuestion(q, history, subject, subjectMasteryMap);
        if (frustration.score > 70 && (q.variant === 'V3' || q.difficulty === 'H')) metadata.score = -1000;
        return { ...q, _adaptive: metadata };
    }));
    mcqCandidates.sort((a, b) => b._adaptive.score - a._adaptive.score);

    const selectedMCQs = [];
    for (const q of mcqCandidates) {
        if (selectedMCQs.length >= questLength) break;
        if (!validateSpacing(q.id, selectedMCQs, 3)) continue;
        selectedMCQs.push(q);
    }

    // 3. PREPARE SIMULATIONS (Merge Discovered + Fresh JSONs)
    const freshJsonSims = simResources
        .filter(s => s.file && !usedJsonFiles.has(s.file.toLowerCase()))
        .map(sim => ({
            ...sim,
            id: sim.id || (sim.file ? `sim_${sim.file.replace('.json', '')}` : `sim_${Math.random().toString(36).substr(2, 5)}`),
            isSimulation: true,
            source: 'json_sim'
        }));

    const allSimCandidates = [...discoveredSims, ...freshJsonSims];

    // Filter out recently seen simulations
    const filteredSims = allSimCandidates.filter(sim => {
        const lastSeen = history.filter(h => h.questionId === sim.id).pop();
        if (!lastSeen) return true;
        const hoursSince = (Date.now() - new Date(lastSeen.answeredAt).getTime()) / (1000 * 60 * 60);
        return hoursSince >= 24; // Strict 24h simulation exclusion
    });

    // Shuffle sims for variety
    const finalizedSims = (filteredSims.length > 0 ? filteredSims : allSimCandidates); 
    finalizedSims.sort(() => 0.5 - Math.random());

    // 3. INTERLEAVE MCQs AND SIMs
    const finalQuestions = [];
    const mcqStack = [...selectedMCQs];
    const simStack = [...finalizedSims].reverse(); // pop() from end

    // Target length is the maximum of the questLength or available sims
    const mcqTargetCount = Math.min(mcqStack.length, questLength);
    const totalTarget = Math.max(mcqTargetCount, simStack.length);

    while (finalQuestions.length < totalTarget && (mcqStack.length > 0 || simStack.length > 0)) {
        // Interleave logic (v4.5): 
        // ─── PEDAGOGY: MCQs FIRST ───
        const mcqBatchSize = (nodeType === 'WARMUP' || nodeType === 'PRACTICE') ? 2 : 1;
        
        for (let i = 0; i < mcqBatchSize; i++) {
            if (mcqStack.length > 0 && finalQuestions.length < totalTarget) {
                finalQuestions.push(mcqStack.pop());
            }
        }

        const simFrequency = (nodeType === 'REINFORCE' || nodeType === 'MASTERY') ? 2 : 1;
        for (let i = 0; i < simFrequency; i++) {
            if (simStack.length > 0 && finalQuestions.length < totalTarget) {
                finalQuestions.push(simStack.pop());
            }
        }
        
        if (finalQuestions.length >= 30) break;
    }

    console.log(`\ud83c\udfaf [Adaptive] ${nodeType} final quest: ${finalQuestions.length} steps (${allSimCandidates.length} sims, ${selectedMCQs.length} MCQs)`);

        return {
            questions: finalQuestions,
            metadata: {
                questLength,
                frustration: frustration.score,
                gameMode: frustration.score > 60 ? 'MERCY' : 'NORMAL'
            }
        };
    } catch (err) {
        console.warn(`⚠️ [Adaptive] Generation Error (Falling back to raw):`, err);
        return { 
            questions: allQuestions.slice(0, 10), 
            metadata: { questLength: 10, frustration: 0, gameMode: 'SAFE_FALLBACK' } 
        };
    }
}

/**
 * Determine if a Warmup is needed based on time and performance
 */
export function needsWarmup(history, session) {
    if (!history || history.length === 0) return true;

    // Time-based check (>12 hours)
    const lastAnswer = history[history.length - 1];
    if (lastAnswer?.answeredAt) {
        const hoursSince = (Date.now() - new Date(lastAnswer.answeredAt).getTime()) / (1000 * 60 * 60);
        if (hoursSince > 12) return true;
    }

    // Performance-based (struggling in current session)
    if (session.consecutiveWrong >= 3) return true;

    return false;
}
