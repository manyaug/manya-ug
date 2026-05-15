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

const BASE_LENGTHS = { WARMUP: 5, EXPLORE: 8, PRACTICE: 10, REINFORCE: 12, MASTERY: 12 };
const MIN_LENGTHS  = { WARMUP: 3, EXPLORE: 5, PRACTICE: 8, REINFORCE: 10, MASTERY: 10 };
const MAX_LENGTHS  = { WARMUP: 6, EXPLORE: 10, PRACTICE: 12, REINFORCE: 15, MASTERY: 15 };

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
        const lastAns = conceptAnswers.length > 0 ? conceptAnswers[conceptAnswers.length - 1] : null;
        const lastVariantSeen = lastAns ? parseQuestionId(lastAns.questionId || lastAns.qid).variant : null;
        const lastSeen = lastAns ? new Date(lastAns.answeredAt) : null;
        
        if (lastSeen) {
            const hoursSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);
            if (hoursSince < 24) {
                // Penalize the concept globally to avoid immediate repetition
                score -= 500;
                // HEAVILY penalize the same variant within 24h
                if (lastVariantSeen === variant) score -= 10000;
            }
        } else {
            score += 200;
        }

        // --- VARIANT PROGRESSION & RECOVERY LOGIC ---
        if (!lastAns?.isCorrect && lastVariantSeen === variant) {
            score -= 2000; // Never ask the same variant immediately after a mistake
        }
    }

    if (mastery === 'ready_for_v2' && variant === 'V2') score += 50;
    else if (mastery === 'ready_for_v3' && variant === 'V3') score += 50;
    else if (mastery === 'new' && variant === 'V1') score += 50;
    else if (mastery === 'struggling_v1' && variant === 'V1') score += 100;
    else if (mastery === 'struggling_v2' && variant === 'V1') score += 150; // Force demotion to V1
    else if (mastery === 'struggling_v3' && variant === 'V2') score += 150; // Force demotion to V2
    else if (mastery.startsWith('struggling') && variant === 'V1') score += 60;

    // ── PSYCHOLOGICAL DIFFICULTY ADAPTATION ──
    // If the student is in a "Flow" state (low frustration, high engagement),
    // we increase the score for "Hard" questions to keep them challenged.
    const frustrationScore = conceptRecordMap._frustration || 0;
    if (frustrationScore < 30 && question.difficulty === 'H') {
        score += 40;
        factors.push('flow_challenge');
    }
    // Conversely, if frustration is high, we aggressively penalize hard questions
    if (frustrationScore > 70 && question.difficulty === 'H') {
        score -= 200;
        factors.push('frustration_protection');
    }

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
        
        // ── UPDATED: Use granular conceptMasteryService instead of legacy masteryService ──
        const subjectMasteryMap = await conceptMasteryService.getSubjectOverview(subject);
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

        // 1. DISCOVERY & HYDRATION (v6.5 - Hardened specialized engine detection)
        const pools = { MCQ: [], SIMULATION: [], QUEST_STORY: [], NOTE: [], RECAP: [] };
        
        allQuestions.forEach(q => {
            const itemType = (q.item_type || q.question_type || q.type || q.q_type || "").toUpperCase();
            const engineType = (q.engine_type || q.engineType || q.type || "").toUpperCase();
            const idLower = (q.qid || q.id || "").toLowerCase();

            // 🛡️ [Hydration Guard]: Expanded to include study_notes and JSON refs
            const isHydrated = !!(q.data || q.steps || q.content || q.engine_type || q.engineType || q.study_notes || q.json_reference_path);
            const hasInteractiveData = !!(q.markers || q.cases || q.points || q.lat || q.lon || q.interactive || q.sim_data);

            const MATH_SIM_WHITELIST = ['SET_THEORY', 'SET_STUDY', 'MATH_STUDY', 'VENN_PROB', 'VENN_LOGIC', 'SUBSET_GAME', 'PIZZA_GAME', 'BINARY_GAME', 'VENN_SPOTLIGHT', 'SET_CLASSIFIER', 'STUDY_RECAP', 'READER_STUDY', 'GALLERY_STUDY', 'IMAGE_HOTSPOTS', 'NOTE_EXPLORER'];

            // v6.5: Robust specialized engine detection
            const hasSpecializedEngine = engineType && engineType !== 'NULL' && engineType !== 'MCQ' && engineType !== 'NONE' && engineType !== 'MCQ_STANDALONE';
            
            // Strictly an MCQ ONLY if it has no specialized engine and fits MCQ patterns
            const isStrictMCQ = !hasSpecializedEngine && (itemType.includes('MCQ') || itemType === 'QUESTION' || itemType === 'PRACTICE');
            
            const isSimulation = !isStrictMCQ && (
                itemType === 'SIMULATION' || 
                itemType === 'QUEST' || 
                hasSpecializedEngine ||
                MATH_SIM_WHITELIST.includes(engineType) ||
                hasInteractiveData
            );
            
            const isInvalidMathSim = subject === 'math' && isSimulation && engineType !== '' && !MATH_SIM_WHITELIST.includes(engineType);

            // v6.5: Explicit Note vs Recap vs Story partitioning
            const isStory = itemType === 'QUEST_STORY' || engineType === 'CHAT' || engineType === 'QUEST_RUNNER' || (itemType === 'QUEST' && engineType !== 'HARVEST_GAME');
            const isRecap = itemType === 'RECAP' || q.isRecap || idLower.includes('recap') || (subject === 'english' && idLower.includes('rule'));
            const isNote = !isRecap && (itemType === 'GRAMMAR' || itemType === 'NOTE' || engineType === 'NOTE_EXPLORER' || q.isNote || idLower.includes('note') || idLower.includes('study') || idLower.includes('rule'));

            if (isStory && isHydrated) {
                pools.QUEST_STORY.push({ ...q, isSimulation: true });
            } else if (isNote && isHydrated) {
                pools.NOTE.push({ ...q, isSimulation: true });
            } else if (isRecap && isHydrated) {
                pools.RECAP.push({ ...q, isSimulation: true });
            } else if ((itemType === 'SIMULATION' || isSimulation || hasInteractiveData) && !isStory && !isInvalidMathSim && isHydrated) {
                pools.SIMULATION.push({ ...q, id: q.qid || q.id, isSimulation: true });
            } else if (isStrictMCQ || hasText(q)) {
                // v6.5: Preserve existing engine types, only default to MCQ if missing
                const finalEngine = q.engine_type || q.engineType || 'MCQ';
                pools.MCQ.push({ 
                    ...q, 
                    engine_type: finalEngine, 
                    engineType: finalEngine, 
                    isSimulation: false 
                });
            }
        });

        // Helper to check if item has any question text
        function hasText(q) {
            return (q.question && q.question.trim() !== '' && q.question !== 'None') || 
                    q.question_text || q.question_content || q.q_text;
        }

        // ─── INJECT EXPLICIT SIMULATIONS (v6.4 FIX) ───
        if (Array.isArray(simResources) && simResources.length > 0) {
            simResources.forEach(sim => {
                const itemType = (sim.item_type || sim.question_type || sim.type || "").toUpperCase();
                const engineType = (sim.engine_type || sim.engineType || sim.type || "").toUpperCase();
                const idLower = (sim.qid || sim.id || sim.file || "").toLowerCase();
                
                const isStory = itemType === 'QUEST_STORY' || engineType === 'CHAT' || engineType === 'QUEST_RUNNER' || (itemType === 'QUEST' && engineType !== 'HARVEST_GAME');
                const isRecap = idLower.includes('recap') || itemType === 'RECAP' || sim.isRecap || (subject === 'english' && idLower.includes('rule'));
                const isNote = !isRecap && (itemType === 'GRAMMAR' || itemType === 'NOTE' || engineType === 'NOTE_EXPLORER' || idLower.includes('note') || idLower.includes('study') || idLower.includes('rule') || sim.isNote);

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
            const metadata = scoreQuestion(q, history, subject, subjectMasteryMap, { ...recordMap, _frustration: frustrationScore });
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

        // 4. EMPATHETIC STRUCTURED FLOW ASSEMBLY (v8.6)
        const finalQuestions = [];
        const isWarmupNeeded = needsWarmup(history, session);
        
        // ── STEP A: WARMUP (Force V1) ──
        if (isWarmupNeeded || nodeType === 'WARMUP') {
            const warmupPool = mcqCandidates.filter(q => q.variant === 'V1' || q.difficulty === 'E');
            // If no V1s, fallback to any easy questions
            const finalWarmupPool = warmupPool.length > 0 ? warmupPool : mcqCandidates.slice(0, 20);
            
            const warmupChoices = finalWarmupPool.slice(0, 3);
            console.log(`🌱 [Adaptive] Injected 3 Warmup questions (Variant: V1)`);
            finalQuestions.push(...warmupChoices);
            
            warmupChoices.forEach(wc => {
                const idx = mcqCandidates.findIndex(m => m.id === wc.id);
                if (idx !== -1) mcqCandidates.splice(idx, 1);
            });
        }

        // ── STEP B: SELECTIVE INTRODUCTION (Notes) ──
        // v9.2: Don't start with a note. Move it to the middle if needed.
        let remedialNote = null;
        if (isBadCondition && nodeType !== 'WARMUP') {
            remedialNote = pools.NOTE.length > 0 ? pools.NOTE[0] : pools.QUEST_STORY[0];
            if (remedialNote) {
                remedialNote = { ...remedialNote, isIntro: true, isStudyStep: true, noGamification: true };
            }
        }

        // ── STEP C: CORE BATTLE (Strict Interleaving + Capping) ──
        const targetCoreLength = Math.max(8, questLength - 2);
        
        // v9.2: Relaxed filtering - if we have no V1/V2, take anything to reach target length
        let coreMcqPool = mcqCandidates.filter(q => q.variant === 'V2' || q.variant === 'V1');
        if (coreMcqPool.length < 5) coreMcqPool = [...mcqCandidates]; 
        
        const simStack = [...pools.SIMULATION].sort(() => 0.5 - Math.random());
        
        // ── CORE ASSEMBLY LOOP ──
        let coreCount = 0;
        let simsInjected = 0;
        const maxSims = subject === 'english' ? 4 : 2; // v9.8: English needs more simulations for its modular stories/games

        while (coreCount < targetCoreLength && (coreMcqPool.length > 0 || (simStack.length > 0 && simsInjected < maxSims))) {
            const hasSim = simStack.length > 0 && simsInjected < maxSims;
            const hasMcq = coreMcqPool.length > 0;

            // v9.2: Inject remedial note as the 3rd step if it exists
            if (coreCount === 2 && remedialNote) {
                remedialNote.isStudyStep = true;
                remedialNote.noGamification = true;
                finalQuestions.push(remedialNote);
                remedialNote = null; 
                coreCount++;
                continue;
            }

            // Rhythm: MCQ -> MCQ -> [Potential Sim] -> MCQ
            const shouldInjectSim = hasSim && (
                (coreCount % 3 === 2) || // Every 3rd step
                (!hasMcq) // Or if no MCQs left
            );

            if (shouldInjectSim) {
                const sim = simStack.pop();
                sim.isStudyStep = true;
                sim.noGamification = true;
                finalQuestions.push(sim);
                simsInjected++;
            } else if (hasMcq) {
                const nextQ = coreMcqPool.shift();
                const mIdx = mcqCandidates.findIndex(m => m.id === nextQ.id);
                if (mIdx !== -1) mcqCandidates.splice(mIdx, 1);
                
                nextQ.isStudyStep = false;
                finalQuestions.push(nextQ);
            }
            coreCount++;
        }

        // ── STEP D: BOSS FIGHT (Force V3) ──
        if (nodeType !== 'WARMUP') {
            const bossPool = mcqCandidates.filter(q => q.variant === 'V3' || q.difficulty === 'H');
            const boss = bossPool[0] || mcqCandidates[0]; // Fallback to highest ranked if no V3
            if (boss) {
                console.log(`💀 [Adaptive] Boss Fight Selected: ${boss.id} (Variant: ${boss.variant || 'RAW'})`);
                finalQuestions.push({ ...boss, isBoss: true });
                const bIdx = mcqCandidates.findIndex(m => m.id === boss.id);
                if (bIdx !== -1) mcqCandidates.splice(bIdx, 1);
            }
        }

        // ── STEP E: OUTRO (Recap) ──
        // Only show Recap if they struggled DURING this session or are in bad condition.
        if (pools.RECAP.length > 0 && isBadCondition) {
            finalQuestions.push({ ...pools.RECAP[0], isOutro: true });
        }

        // ── FINAL POLISH: Emergency Fallback ──
        if (finalQuestions.length < 5 && allQuestions.length > 0) {
            finalQuestions.push(...allQuestions.slice(0, 5 - finalQuestions.length));
        }

        console.log(`✨ [Adaptive] Empathetic Quest Assembled: ${finalQuestions.length} steps. (Mode: ${isBadCondition ? 'Remedial' : 'Reward-Heavy'})`);

        return {
            questions: finalQuestions,
            pools: pools,
            metadata: { 
                questLength: finalQuestions.length, 
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
export async function generateRescueStep(subject, currentFrustration, currentConceptId, simPool = [], notePool = [], recapPool = []) {
    console.log(`🛡️ [RescueEngine] Generating rescue for ${subject} (Frustration: ${currentFrustration}). Pools: Sim=${simPool.length}, Note=${notePool.length}, Recap=${recapPool.length}`);
    
    // Priority 1: RECAP from the specific recap pool
    if (recapPool.length > 0) {
        const recap = recapPool[Math.floor(Math.random() * recapPool.length)];
        return {
            ...recap,
            id: `rescue_recap_${Date.now()}`,
            isRescue: true,
            message: "Let's review what we've learned so far to clear things up!"
        };
    }

    // Priority 2: NOTE from the specific note pool
    if (notePool.length > 0) {
        const note = notePool[Math.floor(Math.random() * notePool.length)];
        return {
            ...note,
            id: `rescue_note_${Date.now()}`,
            isRescue: true,
            message: "Here's a quick tip to help you with these questions!"
        };
    }

    // Priority 3: Interactive Simulation fallback (SST/Science specialty)
    if (simPool.length > 0) {
        const sim = simPool[Math.floor(Math.random() * simPool.length)];
        
        // v9.8: ENGINE SAFETY GUARD - Ensure we never return 'UNKNOWN'
        const rawEngine = (sim.engineType || sim.engine_type || sim.type || "").toUpperCase();
        let finalEngine = rawEngine;

        if (!finalEngine || finalEngine === 'UNKNOWN' || finalEngine === 'SIMULATION') {
            if (sim.cases || sim.markers || sim.points) finalEngine = 'THREE_D_STUDY';
            else if (sim.word_list || sim.vocabulary) finalEngine = 'WORDGRID_ENGINE';
            else if (sim.sentence || sim.segments) finalEngine = 'SENTENCE_TRAIN_ENGINE';
            else finalEngine = 'THREE_D_STUDY'; // Safe default for study materials
        }

        return {
            ...sim,
            engineType: finalEngine,
            engine_type: finalEngine,
            id: `rescue_sim_${Date.now()}`,
            isRescue: true,
            isStudyStep: true,
            noGamification: true,
            message: "Let's step away from the questions and try something interactive!"
        };
    }

    // Priority 4: Simple Supportive Note (Fallback)
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
