import { calculateFrustration, calculateHistoricalPsych } from '../domain/psych/psychTracker';
import { syncService } from '../infrastructure/sync/syncService.js';
import { parseQuestionId, areSameConcept } from '../utils/questionParser';
import { masteryService } from '../domain/mastery/masteryService';
import { conceptMasteryService } from '../domain/mastery/conceptMasteryService';
import { spacedRepetitionService } from '../domain/mastery/spacedRepetitionService';
import { BehavioralEngine } from '../domain/psych/behavioralEngine.js';
import { PriorityScorer } from '../domain/scoring/priorityScorer.js';
import { QuestEngineCore } from '../domain/progress/questEngine.js';

/**
 * MANYA ADAPTIVE ENGINE (V6.0 - HEADLESS CORE INTEGRATION)
 * ==========================================================
 * Upgraded to use the ported Headless Domain Engines:
 *   - BehavioralEngine  → Guessing rate, deep-thinking detection
 *   - PriorityScorer    → PLE 2:1 pool selection, variant spacing enforcement
 *   - QuestEngineCore   → Dynamic game mode, simulation ratio per quest level
 *
 * PUBLIC API IS UNCHANGED. All subject fetchers (Science, Math, SST, English)
 * call generateAdaptiveQuest() with the same parameters and expect the same return shape.
 */

// ── CONSTANTS & CONFIG ──────────────────────────────────────────────────────

const VARIANT_DISTRIBUTIONS = {
    WARMUP:    { V1: 1.00, V2: 0.00, V3: 0.00 },
    EXPLORE:   { V1: 0.60, V2: 0.30, V3: 0.10 },
    PRACTICE:  { V1: 0.30, V2: 0.50, V3: 0.20 },
    REINFORCE: { V1: 0.20, V2: 0.40, V3: 0.40 },
    MASTERY:   { V1: 0.10, V2: 0.20, V3: 0.70 },
};

const BASE_LENGTHS = { WARMUP: 6, EXPLORE: 10, PRACTICE: 12, REINFORCE: 15, MASTERY: 18 };
const MIN_LENGTHS  = { WARMUP: 4, EXPLORE: 6, PRACTICE: 10, REINFORCE: 12, MASTERY: 15 };
const MAX_LENGTHS  = { WARMUP: 8, EXPLORE: 12, PRACTICE: 15, REINFORCE: 18, MASTERY: 25 };

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

// Singleton scorer instance — avoids re-instantiating on every quest
const priScorer = new PriorityScorer();

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
    else if (mastery === 'struggling_v1' && variant === 'V1') score += 100;
    else if (mastery === 'struggling_v2' && variant === 'V1') score += 150; // Force demotion to V1
    else if (mastery === 'struggling_v3' && variant === 'V2') score += 150; // Force demotion to V2
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
        console.log(`🧠 [Adaptive V6] Generating ${nodeType} quest for ${subject}. Bank: ${allQuestions.length}`);
    
        // ── THE BRAIN: FETCH HISTORICAL TELEMETRY ──
        const recentTelemetry = await syncService.fetchRecentTelemetry(subject, 10);
        const historicalPsych = calculateHistoricalPsych(recentTelemetry);
        const sessionPsych = calculateFrustration(session);

        // Calculate Integrated Frustration (History + Current Session)
        const frustrationScore = Math.max(sessionPsych.score, historicalPsych.avgFrustration * 10); // scale 0-10 to 0-100
        const isHistoricalBad = historicalPsych.avgFrustration > 7 || historicalPsych.trend === 'declining';
        
        const subjectMasteryMap = await masteryService.getSubjectMasteryOverview(subject);
        const dominantMastery = Object.values(subjectMasteryMap)[0] || 'learning';
        const questLength = calculateDynamicQuestLength(nodeType, frustrationScore, dominantMastery);

        // ── BEHAVIORAL ENGINE: Detect guessing vs deep thinking patterns ─────
        const behaviorPattern = BehavioralEngine.analyzeAnswerPattern(history || []);
        const isHardGuesser = behaviorPattern.guessingRate > 60;
        console.log(`🔬 [Behavioral] Guessing: ${behaviorPattern.guessingRate}% | Deep: ${behaviorPattern.deepThinkingRate}% | HintDep: ${behaviorPattern.hintDependency}%`);

        // ── PRIORITY SCORER: PLE 2:1 pool selection ──────────────────────────
        const answersWithMark = (history || []).map(h => ({ mark: h.pool || 'yes' }));
        const selectedPool = priScorer.selectPool({ totalAnswers: history.length, recentQuestions: answersWithMark });
        console.log(`📊 [PriorityScorer] PLE Pool: ${selectedPool}`);

        // ── QUEST ENGINE CORE: Game mode + simulation ratio per quest level ───
        const nodeToQuestId = { WARMUP: 1, EXPLORE: 2, PRACTICE: 3, REINFORCE: 4, MASTERY: 5 };
        const questId = nodeToQuestId[nodeType] || 3;
        const recentAnswers = (history || []).slice(-10);
        const recentAccuracyRaw = recentAnswers.length > 0
            ? recentAnswers.filter(h => h.isCorrect).length / recentAnswers.length
            : 0.65;
        const hintCountRecent = recentAnswers.filter(h => h.hintUsed).length;

        const userStateForEngine = {
            overallAccuracy: Math.round(recentAccuracyRaw * 100),
            overallTopicAccuracy: Math.round(recentAccuracyRaw * 100),
            confidence: Math.min(session?.confidence || 70, historicalPsych.avgConfidence * 10),
            frustration: frustrationScore,
            hintUsage: recentAnswers.length > 0 ? Math.round((hintCountRecent / recentAnswers.length) * 100) : 0,
            consecutiveErrors: session?.consecutiveWrong || 0,
            avgResponseTime: behaviorPattern.averageTime || 15,
        };

        const gameMode = QuestEngineCore.selectGameMode(userStateForEngine, questId);
        const simRatio = QuestEngineCore.getSimulationRatio(questId, userStateForEngine);
        console.log(`🎮 [QuestCore] Game Mode: ${gameMode} | Sim Ratio: ${Math.round(simRatio * 100)}% | Integrated Frustration: ${frustrationScore}`);

        // 1. DISCOVERY & HYDRATION (v6.4 - Hardened MCQ Detection)
        const pools = { MCQ: [], SIMULATION: [], QUEST_STORY: [], NOTE: [], RECAP: [] };
        
        allQuestions.forEach(q => {
            const itemType = (q.item_type || q.question_type || q.type || q.q_type || "").toUpperCase();
            const engineType = (q.engine_type || q.engineType || q.type || "").toUpperCase();
            
            // v6.4: Robust MCQ Detection
            const isStrictMCQ = itemType.includes('MCQ') || itemType === 'QUESTION' || itemType === 'PRACTICE';
            
            const MATH_SIM_WHITELIST = ['SET_THEORY', 'SET_STUDY', 'MATH_STUDY', 'VENN_PROB', 'VENN_LOGIC', 'SUBSET_GAME', 'PIZZA_GAME', 'BINARY_GAME', 'VENN_SPOTLIGHT', 'SET_CLASSIFIER', 'STUDY_RECAP', 'READER_STUDY', 'GALLERY_STUDY', 'IMAGE_HOTSPOTS', 'NOTE_EXPLORER'];
            
            const isSimulation = !isStrictMCQ && (
                itemType === 'SIMULATION' || 
                itemType === 'QUEST' || 
                (engineType && engineType !== 'NULL' && engineType !== 'MCQ' && engineType !== 'NONE') ||
                MATH_SIM_WHITELIST.includes(engineType)
            );
            
            const isInvalidMathSim = subject === 'math' && isSimulation && engineType !== '' && !MATH_SIM_WHITELIST.includes(engineType);

            // v6.4: Explicit Note vs Recap vs Story partitioning
            const idLower = (q.qid || q.id || "").toLowerCase();
            const isStory = itemType === 'QUEST_STORY' || engineType === 'CHAT' || engineType === 'QUEST_RUNNER' || (itemType === 'QUEST' && engineType !== 'HARVEST_GAME');
            const isRecap = itemType === 'RECAP' || q.isRecap; // Removed idLower.includes('recap')
            const isNote = !isRecap && (itemType === 'GRAMMAR' || itemType === 'NOTE' || engineType === 'NOTE_EXPLORER' || q.isNote); // Removed idLower.includes('note/study')

            // 🛡️ [Hydration Guard]: Only pool as Sim/Note if it's already hydrated or has 'data'
            const isHydrated = !!(q.data || q.steps || q.content);

            if (isStory && isHydrated) {
                pools.QUEST_STORY.push({ ...q, isSimulation });
            } else if (isNote && isHydrated) {
                pools.NOTE.push({ ...q, isSimulation: true });
            } else if (isRecap && isHydrated) {
                pools.RECAP.push({ ...q, isSimulation: true });
            } else if ((itemType === 'SIMULATION' || isSimulation) && !isStory && !isInvalidMathSim && isHydrated) {
                pools.SIMULATION.push({ ...q, id: q.qid || q.id, isSimulation: true });
            } else if (isStrictMCQ) {
                const hasText = (q.question && q.question.trim() !== '' && q.question !== 'None') || 
                                q.question_text || q.question_content || q.q_text;
                if (hasText) pools.MCQ.push({ ...q, engine_type: 'MCQ', engineType: 'MCQ', isSimulation: false });
            }
        });

        // ─── INJECT EXPLICIT SIMULATIONS (v6.4 FIX) ───
        if (Array.isArray(simResources) && simResources.length > 0) {
            simResources.forEach(sim => {
                const itemType = (sim.item_type || sim.question_type || sim.type || "").toUpperCase();
                const engineType = (sim.engine_type || sim.engineType || sim.type || "").toUpperCase();
                const idLower = (sim.qid || sim.id || sim.file || "").toLowerCase();
                
                const isStory = itemType === 'QUEST_STORY' || engineType === 'CHAT' || engineType === 'QUEST_RUNNER' || (itemType === 'QUEST' && engineType !== 'HARVEST_GAME');
                const isRecap = idLower.includes('recap') || itemType === 'RECAP' || sim.isRecap;
                const isNote = !isRecap && (itemType === 'GRAMMAR' || itemType === 'NOTE' || engineType === 'NOTE_EXPLORER' || idLower.includes('note') || idLower.includes('study') || sim.isNote);

                const hydration = { ...sim, isSimulation: true, id: sim.qid || sim.id || sim.file };

                if (isStory) pools.QUEST_STORY.push(hydration);
                else if (isNote) pools.NOTE.push(hydration);
                else if (isRecap) pools.RECAP.push(hydration);
                else pools.SIMULATION.push(hydration);
            });
            console.log(`🔌 [Adaptive] Injected ${simResources.length} explicit simulations into pools.`);
        }

        // ─── STRICT EXPLORE RULE: STORY, NOTE, or SST SIMULATIONS ───
        if (nodeType === 'EXPLORE') {
            const exploreCandidates = [...pools.QUEST_STORY, ...pools.NOTE];
            if (subject === 'sst' || exploreCandidates.length === 0) exploreCandidates.push(...pools.SIMULATION);

            const subtopicExplore = exploreCandidates.find(q => q.subtopic === (allQuestions[0]?.subtopic || q.subtopic)) || exploreCandidates[0];
            
            if (subtopicExplore) {
                console.log(`🎬 [Adaptive] EXPLORE Node: Delivering Primary Teaching Content (${subtopicExplore.qid || subtopicExplore.id}).`);
                return {
                    questions: [subtopicExplore],
                    metadata: { questLength: subtopicExplore.isSimulationBundle ? subtopicExplore.steps.length : 1, gameMode: 'STORY' }
                };
            }
        }

        // 2. CONDITION CHECK
        const recentAccuracy = history.length > 0 ? (history.slice(-5).filter(h => h.isCorrect).length / Math.min(5, history.length)) : 1;
        const isBadCondition = frustrationScore > 70 || recentAccuracy <= 0.4 || dominantMastery.startsWith('struggling') || isHardGuesser;
        const needsMotivation = frustrationScore > 54 || recentAccuracy <= 0.6;

        console.log(`📡 [Adaptive] ${isBadCondition ? '🚨 CRITICAL' : needsMotivation ? '⚠️ STRUGGLING' : '✅ HEALTHY'} | Acc: ${recentAccuracy.toFixed(2)} | Guessing: ${behaviorPattern.guessingRate}%`);

        // 3. ADAPTIVE MCQ SELECTION
        const baseIds = pools.MCQ.map(q => parseQuestionId(q.id || q.qid).baseId);
        const allRecords = await conceptMasteryService.getBatch(subject, baseIds);
        const recordMap = Object.fromEntries(allRecords.map(r => [r.baseId, r]));

        let mcqCandidates = pools.MCQ.map(q => {
            const metadata = scoreQuestion(q, history, subject, subjectMasteryMap, recordMap);
            if (frustrationScore > 70 && (q.variant === 'V3' || q.difficulty === 'H')) metadata.score = -1000;
            if (selectedPool === 'no' && q.isPLE) metadata.score -= 200;
            return { ...q, _adaptive: metadata };
        });

        // Concept De-duplication
        const conceptMap = {};
        mcqCandidates.forEach(cand => {
            const { baseId } = parseQuestionId(cand.id || cand.qid);
            if (!conceptMap[baseId] || cand._adaptive.score > conceptMap[baseId]._adaptive.score) {
                conceptMap[baseId] = cand;
            }
        });
        mcqCandidates = Object.values(conceptMap);

        // Variant Spacing
        const recentQIds = (history || []).slice(-3).map(h => h.questionId).filter(Boolean);
        if (recentQIds.length > 0) {
            const spaced = mcqCandidates.filter(q => priScorer.validateVariantSpacing(q.id || q.qid, recentQIds, 3));
            if (spaced.length > 0) mcqCandidates = spaced;
        }

        mcqCandidates.sort((a, b) => b._adaptive.score - a._adaptive.score);
        const selectedMCQs = mcqCandidates.slice(0, questLength);

        // 4. STRUCTURED FLOW ASSEMBLY (v6.4 - No more random recaps at start)
        const finalQuestions = [];
        const isWarmup = nodeType === 'WARMUP';
        const mustAllowSims = pools.MCQ.length === 0 && pools.SIMULATION.length > 0;
        
        // ── Step A: INTRO (Note or Story) ──
        // [Manya Logic v8.1] ONLY inject intro if this is an EXPLORE node or if explicitly forced.
        // Practice/Reinforce/Mastery should dive straight into questions.
        if (nodeType === 'EXPLORE' && (pools.NOTE.length > 0 || pools.QUEST_STORY.length > 0)) {
            const intro = pools.NOTE.length > 0 ? pools.NOTE[0] : pools.QUEST_STORY[0];
            finalQuestions.push({ ...intro, isIntro: true });
        }

        // ── Step B: CORE (Interleaved MCQs & Sims) ──
        const mcqStack = [...selectedMCQs];
        const simStack = (isWarmup && !mustAllowSims) ? [] : [...pools.SIMULATION].sort(() => 0.5 - Math.random());
        
        let consecutiveSims = 0;
        let currentLength = 0;
        while (currentLength < questLength && (mcqStack.length > 0 || simStack.length > 0)) {
            const hasSim = simStack.length > 0;
            const hasMcq = mcqStack.length > 0;

            if (hasSim && !hasMcq) {
                const sim = simStack.pop();
                finalQuestions.push(sim);
                currentLength++;
            } else if (!hasSim && hasMcq) {
                finalQuestions.push(mcqStack.shift());
                currentLength++;
            } else {
                let chance = needsMotivation ? Math.min(simRatio + 0.2, 0.8) : simRatio;
                if (consecutiveSims >= 2) chance *= 0.2;
                
                if (Math.random() < chance) {
                    const sim = simStack.pop();
                    finalQuestions.push(sim);
                    currentLength++;
                    consecutiveSims++;
                } else {
                    finalQuestions.push(mcqStack.shift());
                    currentLength++;
                    consecutiveSims = 0;
                }
            }
        }

        // ── Step C: OUTRO (Recap) ──
        // [Manya Logic v8.1] No more forced recaps. Recaps are now mid-quest 'Rescue' injections or EXPLORE content.

        // ── Step D: EMERGENCY FALLBACK ──
        if (finalQuestions.length === 0 && allQuestions.length > 0) {
            finalQuestions.push(...allQuestions.slice(0, 3));
        }

        return {
            questions: finalQuestions, // No global shuffle anymore!
            metadata: { 
                questLength: currentLength || finalQuestions.length, 
                frustration: frustrationScore, 
                isBadCondition, 
                gameMode: gameMode !== 'none' ? gameMode.toUpperCase() : (isBadCondition ? 'RESCUE' : 'NORMAL'),
                selectedPool,
                behaviorPattern,
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

/**
 * GENERATE RESCUE STEP
 * --------------------
 * Creates a dynamic mid-quest injection when the student is struggling.
 */
export async function generateRescueStep(subject, currentFrustration, currentConceptId, simResources = [], grammarPool = []) {
    console.log(`🛡️ [RescueEngine] Generating rescue for ${subject} (Frustration: ${currentFrustration})`);
    
    // Priority 1: Grammar/Rule Note if available
    if (grammarPool.length > 0) {
        const rule = grammarPool[Math.floor(Math.random() * grammarPool.length)];
        return {
            ...rule,
            id: `rescue_note_${Date.now()}`,
            isRescue: true,
            isSimulation: false,
            message: "Pause: Let's quickly review the rule before trying again!"
        };
    }

    // Priority 2: Simple Supportive Note
    return {
        id: `rescue_fallback_${Date.now()}`,
        item_type: 'NOTE',
        engineType: 'NOTE_EXPLORER',
        study_notes: {
            title: "Take a breath 🌟",
            introduction: "Don't worry! Mistakes help us grow. Take a deep breath and let's try a simpler version next."
        },
        isRescue: true,
        isSimulation: false
    };
}
