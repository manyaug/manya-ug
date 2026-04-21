import { calculateFrustration } from '../domain/psych/psychTracker';
import { parseQuestionId, areSameConcept } from '../utils/questionParser';
import { masteryService } from '../domain/mastery/masteryService';
import { conceptMasteryService } from '../domain/mastery/conceptMasteryService';
import { spacedRepetitionService } from '../domain/mastery/spacedRepetitionService';

/**
 * MANYA ADAPTIVE ENGINE (V5.2 - ENGINE LOCKDOWN)
 * =================================================
 * Implements: Strict Engine Quarantine (No CHAT outside Explore),
 *             Robust MCQ Recovery, and Psychological Rescue.
 */

// ── CONSTANTS & CONFIG ──────────────────────────────────────────────────────

const VARIANT_DISTRIBUTIONS = {
    WARMUP:    { V1: 1.00, V2: 0.00, V3: 0.00 },
    EXPLORE:   { V1: 0.60, V2: 0.30, V3: 0.10 },
    PRACTICE:  { V1: 0.30, V2: 0.50, V3: 0.20 },
    REINFORCE: { V1: 0.20, V2: 0.40, V3: 0.40 },
    MASTERY:   { V1: 0.10, V2: 0.20, V3: 0.70 },
};

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

export function scoreQuestion(question, history, subject, subjectMasteryMap, conceptRecordMap = {}) {
    let score = 0;
    const factors = [];
    const { baseId: conceptId, variant } = parseQuestionId(question.id || question.qid);
    const mastery = subjectMasteryMap[conceptId] || 'new';

    const baseWeight = MASTERY_WEIGHTS[mastery] || 60;
    score += baseWeight;
    factors.push(`mastery_${mastery}`);

    const conceptRecord = conceptRecordMap[conceptId] || null;
    const conceptAnswers = history.filter(ans => (ans.concept_id || parseQuestionId(ans.questionId).baseId) === conceptId);
    
    if (conceptRecord && conceptRecord.nextReviewAt) {
        const reviewPriority = spacedRepetitionService.getReviewPriority(conceptRecord);
        if (reviewPriority > 0) {
            score += reviewPriority;
            factors.push(reviewPriority > 40 ? 'overdue_review' : 'scheduled_review');
        }
    } else {
        const lastSeen = conceptAnswers.length > 0 ? new Date(conceptAnswers[conceptAnswers.length - 1].answeredAt) : null;
        if (lastSeen) {
            const hoursSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);
            if (hoursSince < 24) {
                if (hoursSince < 0.5) score -= 10000;
                else score -= 500;
            }
        } else {
            score += 200;
        }
    }

    if (mastery === 'ready_for_v2' && variant === 'V2') score += 50;
    else if (mastery === 'ready_for_v3' && variant === 'V3') score += 50;
    else if (mastery === 'new' && variant === 'V1') score += 50;
    else if (mastery.startsWith('struggling') && variant === 'V1') score += 60;

    return { score, factors, mastery };
}

function calculateDynamicQuestLength(nodeType, frustrationScore, dominantMastery) {
    let count = BASE_LENGTHS[nodeType] || 10;
    const min = MIN_LENGTHS[nodeType] || 5;
    const max = MAX_LENGTHS[nodeType] || 15;
    if (dominantMastery?.startsWith('struggling')) count = Math.max(min, count - 2);
    if (frustrationScore > 70) count = Math.max(min, count - 2);
    if (nodeType === 'MASTERY') count = max;
    return Math.min(max, Math.max(min, count));
}

// ── MAIN API — GENERATE ADAPTIVE QUEST ──────────────────────────────────────

export async function generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, history, simResources = []) {
    try {
        console.log(`🧠 [Adaptive] Generating ${nodeType} quest for ${subject}. Bank: ${allQuestions.length}`);
    
        const frustration = calculateFrustration(session);
        const subjectMasteryMap = await masteryService.getSubjectMasteryOverview(subject);
        const dominantMastery = Object.values(subjectMasteryMap)[0] || 'learning';
        const questLength = calculateDynamicQuestLength(nodeType, frustration.score, dominantMastery);

        // 1. DISCOVERY & HYDRATION (v5.3 - Robust Routing)
        const SUPPORTED_ENGINES = [
            'WORDGRID_ENGINE', 'GARDEN_GUARD', 'SENTENCE_BLOCKS', 'HARVEST_GAME', 
            'TENSE_TREEHOUSE', 'SENTENCE_TRAIN', 'GRAMMAR_MAZE', 'MORPH_GAME',
            'ENGLISH_RULE_MASTER', 'CHAT', 'DEEP_READER', 'FUNCTIONAL_COMPOSER',
            'SIMULATION', 'QUEST', 'STORY'
        ];

        const pools = { MCQ: [], SIMULATION: [], QUEST_STORY: [], GRAMMAR: [] };
        
        allQuestions.forEach(q => {
            const itemType = (q.item_type || q.question_type || q.type || "").toUpperCase();
            let engineType = (q.engine_type || q.engineType || q.type || "").toUpperCase();
            
            // Unified Simulation Detection: Logic that determines if it MUST use a SimulatorBridge
            // CRITICAL: If engine_type is MCQ, it must NEVER be true, even if item_type is SIMULATION.
            const isSimulation = (itemType === 'SIMULATION' || itemType === 'QUEST' || (engineType && engineType !== 'NULL' && engineType !== 'MCQ' && engineType !== 'NONE' && engineType !== 'STUDY_RECAP')) && (engineType !== 'MCQ');
            
            // Check against supported math engines if applicable
            const MATH_SIM_WHITELIST = ['SET_THEORY', 'SET_STUDY', 'MATH_STUDY', 'VENN_PROB', 'VENN_LOGIC', 'SUBSET_GAME', 'PIZZA_GAME', 'BINARY_GAME', 'VENN_SPOTLIGHT', 'SET_CLASSIFIER', 'STUDY_RECAP'];
            const isInvalidMathSim = subject === 'math' && isSimulation && engineType !== '' && !MATH_SIM_WHITELIST.includes(engineType);

            // v5.8 NARRATIVE LOCKDOWN: Explicitly include QUEST_RUNNER and QUEST in story detection
            const isStory = itemType === 'QUEST_STORY' || engineType === 'CHAT' || engineType === 'QUEST_RUNNER' || (itemType === 'QUEST' && engineType !== 'HARVEST_GAME');
            const isNote = itemType === 'GRAMMAR' || itemType === 'NOTE' || engineType === 'NOTE_EXPLORER';

            if (isStory) {
                pools.QUEST_STORY.push({ ...q, isSimulation });
            } else if (isNote) {
                pools.GRAMMAR.push({ ...q, isSimulation });
            } else if ((itemType === 'SIMULATION' || isSimulation) && !isStory && !isInvalidMathSim) {
                // Ensure story content NEVER leaks into the simulation practice pool
                pools.SIMULATION.push({ ...q, id: q.qid || q.id, isSimulation });
            } else if (itemType !== 'QUEST' && itemType !== 'SIMULATION') {
                // MCQ RECOVERY: Robust check for question text to ensure MCQ pools are filled
                const hasText = (q.question && q.question.trim() !== '' && q.question !== 'None') || 
                                q.question_text || q.question_content || q.q_text;
                if (hasText) pools.MCQ.push(q);
            }
        });

        // ─── INJECT EXPLICIT SIMULATIONS (v5.4 FIX) ───
        if (Array.isArray(simResources) && simResources.length > 0) {
            simResources.forEach(sim => {
                const itemType = (sim.item_type || sim.question_type || sim.type || "").toUpperCase();
                const engineType = (sim.engine_type || sim.engineType || sim.type || "").toUpperCase();
                
                // Reuse lockdown detection
                const isStory = itemType === 'QUEST_STORY' || engineType === 'CHAT' || engineType === 'QUEST_RUNNER' || (itemType === 'QUEST' && engineType !== 'HARVEST_GAME');
                const isNote = itemType === 'GRAMMAR' || itemType === 'NOTE' || engineType === 'NOTE_EXPLORER';

                // Flattened Hydration (Fixes data-nesting bug)
                const hydration = { ...sim, isSimulation: true, id: sim.qid || sim.id || sim.file };

                if (isStory) {
                    pools.QUEST_STORY.push(hydration);
                } else if (isNote) {
                    pools.GRAMMAR.push(hydration);
                } else {
                    pools.SIMULATION.push(hydration);
                }
            });
            console.log(`🔌 [Adaptive] Injected ${simResources.length} explicitly provided simulations into pools.`);
        }

        // ─── STRICT EXPLORE RULE: STORY or NOTE ONLY ───
        if (nodeType === 'EXPLORE') {
            const storyCandidates = [...pools.QUEST_STORY, ...pools.GRAMMAR];
            const subtopicStory = storyCandidates.find(q => q.subtopic === allQuestions[0]?.subtopic) || storyCandidates[0];
            
            if (subtopicStory) {
                console.log(`🎬 [Adaptive] EXPLORE Node: Enforcing Narrative Content (${subtopicStory.qid || subtopicStory.id}).`);
                
                // Ensure it's treated as a simulation/story ONLY if it's not a standard MCQ
                const eType = (subtopicStory.engine_type || subtopicStory.engineType || subtopicStory.type || "").toUpperCase();
                const shouldBeSim = eType !== 'MCQ' && eType !== 'NONE' && eType !== 'NULL';
                
                return {
                    questions: [{ ...subtopicStory, isSimulation: shouldBeSim }],
                    metadata: { questLength: 1, gameMode: 'STORY' }
                };
            }
        }

        // 2. CONDITION CHECK: Is the student struggling?
        const recentAccuracy = history.length > 0 ? (history.slice(-5).filter(h => h.isCorrect).length / Math.min(5, history.length)) : 1;
        const isBadCondition = frustration.score > 70 || recentAccuracy <= 0.4 || dominantMastery.startsWith('struggling');
        const needsMotivation = frustration.score > 54 || recentAccuracy <= 0.6;

        console.log(`📡 [Adaptive] Condition: ${isBadCondition ? '🚨 CRITICAL' : needsMotivation ? '⚠️ STRUGGLING' : '✅ HEALTHY'} (Acc: ${recentAccuracy.toFixed(2)})`);

        // 3. ADAPTIVE MCQ SELECTION
        const baseIds = pools.MCQ.map(q => parseQuestionId(q.id || q.qid).baseId);
        const allRecords = await conceptMasteryService.getBatch(subject, baseIds);
        const recordMap = Object.fromEntries(allRecords.map(r => [r.baseId, r]));

        let mcqCandidates = pools.MCQ.map(q => {
            const metadata = scoreQuestion(q, history, subject, subjectMasteryMap, recordMap);
            if (frustration.score > 70 && (q.variant === 'V3' || q.difficulty === 'H')) metadata.score = -1000;
            return { ...q, _adaptive: metadata };
        });

        // --- NEW: Concept De-duplication (v5.5) ---
        // Avoid picking different variants (V1, V2, V3) of the same question in a single session.
        const conceptMap = {};
        mcqCandidates.forEach(cand => {
            const { baseId } = parseQuestionId(cand.id || cand.qid);
            // Keep the variant with the highest score for this baseId
            if (!conceptMap[baseId] || cand._adaptive.score > conceptMap[baseId]._adaptive.score) {
                conceptMap[baseId] = cand;
            }
        });
        mcqCandidates = Object.values(conceptMap);

        // ─── ENGLISH STRUCTURED PARTITIONING (Level 1.0) ───
        if (subject === 'english') {
            const diffMap = {
                'WARMUP': ['E'],
                'EXPLORE': ['E', 'M'],
                'PRACTICE': ['M'],
                'REINFORCE': ['M'],
                'MASTERY': ['H']
            };
            const targetDifficulty = diffMap[nodeType] || ['M'];
            
            let filteredCandidates = mcqCandidates.filter(c => targetDifficulty.includes(c.difficulty));
            
            // Fallback: If no questions match difficulty, allow neighbors
            if (filteredCandidates.length < 3) {
                console.warn(`⚠️ [Adaptive] Low candidate count for ${nodeType} (${subject}). Falling back to adjacent difficulties.`);
                filteredCandidates = mcqCandidates; 
            }
            mcqCandidates = filteredCandidates;
        }

        // Sort by adaptive score
        mcqCandidates.sort((a, b) => b._adaptive.score - a._adaptive.score);

        // Slice to target length
        const selectedMCQs = mcqCandidates.slice(0, questLength);

        // 4. INTERLEAVE & RESCUE LOGIC
        let finalQuestions = [];
        const mcqStack = [...selectedMCQs];
        
        // --- ADAPTIVE EXCLUSION (v5.6 - Smart Fallback) ---
        const isWarmup = nodeType === 'WARMUP';
        const isExplore = nodeType === 'EXPLORE';

        // 🛡️ RESILIENCE: If there are ZERO MCQs but we have Simulations, 
        // we MUST allow simulations even in WARMUP/EXPLORE to prevent empty quests.
        const mustAllowSims = pools.MCQ.length === 0 && pools.SIMULATION.length > 0;
        const excludeSims = (isWarmup || isExplore) && !mustAllowSims;
        
        const simStack = excludeSims ? [] : [...pools.SIMULATION].sort(() => 0.5 - Math.random());
        const grammarStack = excludeSims ? [] : [...pools.GRAMMAR].sort(() => 0.5 - Math.random());

        // ─── THE RESCUE PATTERN: GRAMMAR + PRACTICE ─────
        // Only trigger if NOT a warmup
        if (isBadCondition && grammarStack.length > 0 && !isWarmup) {
            const rule = grammarStack.pop();
            finalQuestions.push({ ...rule, isRescue: true, message: "Let's pause and review the rule!" });
            if (simStack.length > 0) finalQuestions.push({ ...simStack.pop(), isRescuePractice: true });
        }

        // ─── MOTIVATION / INTERLEAVE FILL ─────
        // v5.7 English Overdrive: Guarantee at least 2 sims if available for PRACTICE/MASTERY
        const isGameNode = ['PRACTICE', 'REINFORCE', 'MASTERY'].includes(nodeType);
        const minSims = (subject === 'english' && isGameNode && simStack.length > 0) ? 2 : 0;
        let forcedSims = 0;

        while (finalQuestions.length < questLength && (mcqStack.length > 0 || simStack.length > 0)) {
            const hasSim = simStack.length > 0 && (!isWarmup || mustAllowSims);
            const hasMcq = mcqStack.length > 0;

            if (hasSim && !hasMcq) {
                finalQuestions.push(simStack.pop());
            } else if (!hasSim && hasMcq) {
                finalQuestions.push(mcqStack.shift());
            } else if (hasSim && hasMcq) {
                let simChance = needsMotivation ? 0.6 : 0.30;
                if (subject === 'english' && isGameNode) simChance = 0.50; // ENHANCED CHANCE

                const forceSim = forcedSims < minSims;
                
                if (forceSim || Math.random() < simChance) {
                    finalQuestions.push(simStack.pop());
                    forcedSims++;
                } else {
                    finalQuestions.push(mcqStack.shift());
                }
            } else {
                break;
            }
        }

        // ─── EMERGENCY RECOVERY (v5.6) ───
        // If finalQuestions is STILL empty but the bank has data, 
        // force a slice of whatever we have as a last resort.
        if (finalQuestions.length === 0 && allQuestions.length > 0) {
            console.warn(`🚨 [Adaptive] Emergency Recovery Triggered. Forcing ${Math.min(3, allQuestions.length)} items from bank.`);
            finalQuestions = allQuestions.slice(0, 3).map(q => ({
                ...q, 
                isSimulation: (q.engine_type && q.engine_type !== 'MCQ')
            }));
        }

        // --- NEW: Final Randomization (Shuffle the sequencing) ---
        // This ensures the order of questions is random every time, even if the pool is the same.
        finalQuestions = (finalQuestions.length > 0 ? finalQuestions : selectedMCQs).sort(() => 0.5 - Math.random());

        return {
            questions: finalQuestions,
            metadata: { 
                questLength: finalQuestions.length, 
                frustration: frustration.score, 
                isBadCondition, 
                needsMotivation,
                gameMode: isBadCondition ? 'RESCUE' : needsMotivation ? 'MOTIVATION' : 'NORMAL'
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

export function needsWarmup(history, session) {
    if (!history || history.length === 0) return true;
    const lastAnswer = history[history.length - 1];
    if (lastAnswer?.answeredAt) {
        const hoursSince = (Date.now() - new Date(lastAnswer.answeredAt).getTime()) / (1000 * 60 * 60);
        if (hoursSince > 12) return true;
    }
    if (session.consecutiveWrong >= 3) return true;
    return false;
}
