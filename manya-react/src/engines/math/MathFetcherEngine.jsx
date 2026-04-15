import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, ArrowRight, Lightbulb, Globe, Compass, Zap, Timer, Trophy, RotateCcw, Search, Puzzle, AlertCircle, BookOpen, Sparkles } from 'lucide-react';
import { fetchMathQuestions } from '../../services/mathMockDB';
import { syncService } from '../../services/syncService';
import { useDispatch, useSelector } from 'react-redux';
import { 
    updateProfile, 
    awardGems, 
    addXP,
    resetSession, 
    updateSessionAfterAnswer 
} from '../../store/userSlice';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import { ManyaDB } from '../../utils/manyaDB';
import { calculateFrustration, calculateHesitation } from '../../services/psychTracker';
import { conceptMasteryService } from '../../services/conceptMasteryService';
import { achievementService } from '../../services/achievementService';
import { parseQuestionId } from '../../utils/questionParser';
import AchievementUnlocked from '../../components/AchievementUnlocked';
import {
    saveNodeCompletion, trackWrongAnswer, resolveRephrased,
    setJustFinished, UNLOCK_THRESHOLDS, NODE_ORDER
} from '../../services/questProgressService';

import { preloadCurriculum } from '../../services/curriculumService';
import UniversalGlobeEngine from '../shared-engines/UniversalGlobeEngine';
import ImageHotspotsEngine from '../shared-engines/ImageHotspotsEngine';
import GalleryStudyEngine from '../shared-engines/GalleryStudyEngine';
import { loadQuestSteps } from '../../utils/questLoader';
import { ENGINE_REGISTRY } from '../../utils/engineRouter';
import { calculateUSP } from '../../utils/scoringUtility';
import { getLoadingConfig, getRandomFact } from '../../config/loadingData';
import CelebrationView from '../shared-engines/CelebrationView';
import '../../styles/mcq-engine.css';
import MathSolutionSteps from '../../components/MathSolutionSteps';

// Specialized Math Engines
import SetTheoryEngine from './SetTheoryEngine';
import SetStudyEngine from './SetStudyEngine';
import VennProbEngine from './VennProbEngine';
import SubsetGameEngine from './SubsetGameEngine';
import PizzaGameEngine from './PizzaGameEngine';
import BinaryGameEngine from './BinaryGameEngine';
import VennSpotlightEngine from './VennSpotlightEngine';
import SetClassifierEngine from './SetClassifierEngine';
import ReaderStudyEngine from '../shared-engines/ReaderStudyEngine';

/**
 * SUPPORTED ENGINES (v3.3)
 * Only these engine types are allowed to use the SimulatorBridge.
 * Everything else (including MCQ, null, etc.) will use the standard Fetcher UI.
 */
const SUPPORTED_SIM_ENGINES = [
    'SST_STUDY', 'NOTE_EXPLORER', 'GLOBE_TIME_ENGINE', 'GLOBE_ENGINE', 
    'UNIVERSAL_GLOBE', 'IMAGE_HOTSPOTS', 'GALLERY_STUDY', 'READER_STUDY',
    'THREE_D_STUDY', '3D_SKELETON', 'SET_THEORY', 'SET_STUDY', 'VENN_PROB',
    'SUBSET_GAME', 'PIZZA_GAME', 'BINARY_GAME', 'VENN_SPOTLIGHT', 'SET_CLASSIFIER'
];

/**
 * UNIFIED ENGINE DETECTION (v3.2)
 * Ensures both Parent and Bridge agree on what the engine actually is.
 * Prioritizes: data.engine_type > data.type > top.engine_type > top.type
 */
const getEngineType = (q) => {
    const data = q?.data || q;
    // Prefer the inner data definitions as they are the source of truth for specialized engines
    const raw = data?.engine_type || data?.engineType || q?.engine_type || q?.engineType || data?.type || q?.type || "";
    return String(raw).toUpperCase().trim();
};

/**
 * SIMULATOR BRIDGE
 * Connects the MCQ-based Fetcher to specialized Simulation Engines.
 */
const SimulatorBridge = ({ step, onComplete, onAttempt }) => {
    // ─── DATA FLATTENING (v3.7) ───
    const simData = step?.data?.questions ? step.data : (step?.data || step);
    const resultRef = useRef(null);
    const finishedRef = useRef(false);

    if (!simData) return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-rose-500 font-bold">
            <AlertCircle size={40} className="mb-4" />
            Simulation Load Failure
            <button onClick={onComplete} className="mt-4 text-xs bg-slate-100 px-4 py-2 rounded-lg">Skip Simulation</button>
        </div>
    );

    // Determine which engine to use
    let engineType = getEngineType(step);
    if (engineType === 'IMAGE_HOTSPOTS' && !simData.engineType && !simData.type) engineType = 'IMAGE_HOTSPOTS'; // Default fallback

    const handleSimComplete = (results) => {
        // results may come from common engines; resultRef.current may come from specialized engines
        const finalResults = results || resultRef.current;

        if (finishedRef.current) return;
        finishedRef.current = true;
        
        console.log(`🎮 [SimulatorBridge] Simulation Complete. Raw Results:`, finalResults);
        
        // APPLY UNIFIED SCORING PROTOCOL (USP)
        const usp = calculateUSP({
            accuracy: finalResults?.accuracy ?? (finalResults?.score && finalResults?.total ? (finalResults.score / finalResults.total) : 1.0),
            mistakes: finalResults?.mistakes || 0,
            timeSpentMs: finalResults?.duration || finalResults?.timeSpentMs || 30000,
            engineType: engineType
        }, 'math');

        console.log(`📊 [SimulatorBridge] USP Mastery Score: ${usp.masteryScore}%`, usp);

        onComplete({
            success: true, 
            score: usp.masteryScore,
            usp: usp,
            simResults: finalResults
        });
    };

    const handleSimResult = (res) => {
        if (finishedRef.current) return; // Ignore updates after completion
        console.log(`📊 [SimulatorBridge] Engine sent result:`, res);
        resultRef.current = res;
    };

    const sharedProps = {
        data: simData,
        onComplete: handleSimComplete,
        onResult: handleSimResult,
        onAttempt // Forward attempt tracking to sub-engines
    };

    switch (engineType) {
        case 'GLOBE_TIME_ENGINE':
        case 'GLOBE_ENGINE':
        case 'UNIVERSAL_GLOBE':
            return <UniversalGlobeEngine {...sharedProps} />;
        
        case 'IMAGE_HOTSPOTS':
            return <ImageHotspotsEngine {...sharedProps} />;
        
        case 'GALLERY_STUDY':
            return <GalleryStudyEngine {...sharedProps} />;

        case 'SET_THEORY':
            return <SetTheoryEngine {...sharedProps} />;
        
        case 'MATH_STUDY':
            return <SetStudyEngine {...sharedProps} />;
        
        case 'VENN_PROB_ENGINE':
            return <VennProbEngine {...sharedProps} />;
        
        case 'SUBSET_GAME':
            return <SubsetGameEngine {...sharedProps} />;
        
        case 'PIZZA_GAME':
            return <PizzaGameEngine {...sharedProps} />;
        
        case 'BINARY_GENERATOR':
        case 'BINARY_GAME':
            return <BinaryGameEngine {...sharedProps} />;
        
        case 'VENN_SPOTLIGHT':
            return <VennSpotlightEngine {...sharedProps} />;
        
        case 'SET_CLASSIFIER':
            return <SetClassifierEngine {...sharedProps} />;

        case 'READER_STUDY':
            return <ReaderStudyEngine {...sharedProps} />;

        case 'NOTE_EXPLORER':
            return <NoteExplorerEngine {...sharedProps} />;

        default:
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500">
                    <Puzzle size={40} className="mb-4 opacity-20" />
                    <p className="font-bold">Unsupported Engine: {engineType}</p>
                    <button onClick={onComplete} className="mt-4 text-xs bg-slate-100 px-4 py-2 rounded-lg text-slate-900 font-black">CONTINUE QUEST</button>
                </div>
            );
    }
};

/**
 * MANYA MATH FETCHER ENGINE v3.5 (Adaptive + Variant Retry + Mastery Save)
 * ========================================================================
 * - Wrong answer → queues rephrased variant for retry within same quest
 * - On completion: saves mastery via questProgressService
 * - Shows completion screen with unlock status or retry prompt
 */
/**
 * SOLUTION DISPLAYER
 * Specialized component to parse and render step-by-step Math solutions.
 */
const SolutionDisplayer = ({ explanation }) => {
    if (!explanation) return <p className="text-[var(--text-sub)] text-[13px] italic">Detailed concept explanation coming soon.</p>;

    // Standards: explanation is now pre-parsed by the data funnel (mathMockDB)
    const sol = explanation;

    if (sol && (sol.logic || sol.calculation || sol.answer)) {
        return (
            <div className="flex flex-col gap-4">
                {parsed.logic && (
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 mt-1">
                            <Lightbulb size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Logic</p>
                            <p className="text-[var(--text-main)] text-[14px] font-bold leading-relaxed">{sol.logic}</p>
                        </div>
                    </div>
                )}
                {parsed.calculation && (
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0 mt-1">
                            <Zap size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Working</p>
                            <div className="text-[var(--text-main)] text-[14px] font-medium leading-relaxed whitespace-pre-line bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)]">
                                {sol.calculation}
                            </div>
                        </div>
                    </div>
                )}
                {parsed.answer && (
                    <div className="flex gap-3 items-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                            <Check size={14} strokeWidth={4} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Final Answer:</p>
                            <p className="text-[var(--text-main)] font-black text-[16px]">{sol.answer}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return <p className="text-[var(--text-main)] font-bold text-[14px] leading-relaxed">{explanation}</p>;
};

export default function MathFetcherEngine({ data, onComplete, onResult }) {
    const dispatch = useDispatch();
    const user = useSelector(state => state.user.data);
    const session = useSelector(state => state.user.session);
    
    const [renderError, setRenderError] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [history, setHistory] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hintUsed, setHintUsed] = useState(false);
    const [answerChanged, setAnswerChanged] = useState(false);
    const [changeCount, setChangeCount] = useState(0);
    const [questMeta, setQuestMeta] = useState(null);
    const [gemsEarned, setGemsEarned] = useState(0);
    const [showGemToast, setShowGemToast] = useState(false);
    const [showCompletion, setShowCompletion] = useState(false);
    const [completionResult, setCompletionResult] = useState(null);
    const [isFinished, setIsFinished] = useState(false);
    const [earnedAchievements, setEarnedAchievements] = useState([]);
    
    // ─── RESCUE RECAP STATE (v5.0) ───
    const [recapSteps, setRecapSteps] = useState([]);    // Loaded recap sim steps (held, not in queue)
    const consecutiveWrongRef = useRef(0);                // Local tracker for real-time recap trigger
    const recapUsedIndexRef = useRef(0);                  // Tracks which recap we've used

    // Efficiency: Prevent duplicate simulation logs
    const lastSimAttemptRef = useRef({ time: 0, label: '' });

    // Guard: Prevent double-fetching during initialization (v3.8)
    const fetchIterationRef = useRef(0);
    const allBankRef = useRef([]);
    const questionStartTime = useRef(Date.now());
    const firstSelection = useRef(null);

    const topicId = data?.topic || 'default';
    const nodeType = data?.nodeType || 'PRACTICE';
    const subject = data?.subject || 'math';
    const questKey = data?.questKey || `math/${topicId}`;

    useEffect(() => {
        const loadQuestions = async () => {
            // Guard: ensure we only load once per topic change
            if (fetchIterationRef.current === topicId) return;
            fetchIterationRef.current = topicId;

            setIsLoading(true);
            dispatch(resetSession());
            
            // Prime curriculum cache early so map exit is instant
            preloadCurriculum();

            try {
                // 1. Fetch ALL questions from the bank
                console.log(`\ud83c\udf0d [MathEngine] Loading quest for topic="${topicId}", nodeType="${nodeType}"`);
                const rawQuestions = await fetchMathQuestions(topicId);
                const allQuestions = rawQuestions.map(q => ({ ...q, id: String(q.id || q.qid) }));
                allBankRef.current = allQuestions;

                console.log(`\ud83d\udcca [MathEngine] Bank size: ${allQuestions.length} questions for "${topicId}"`);

                // Guard: if the bank is empty, show the "No Questions Found" UI instead of a hard crash
                if (allQuestions.length === 0) {
                    console.warn(`⚠️ [MathEngine] No questions found for "${topicId}". Showing empty state.`);
                    setQuestions([]);
                    setIsLoading(false);
                    return;
                }

                // 2. Fetch history from ManyaDB
                const userHistory = await ManyaDB.getAnswerHistory(subject);
                
                // ─── LATEST SESSION SYNC (v3.6) ───
                // Merge IndexedDB history with current Redux session answers 
                // to prevent repeats if a user restarts a node.
                const sessionAnswers = session?.answers || [];
                const mergedHistory = [...userHistory, ...sessionAnswers];
                setHistory(mergedHistory);

                // 3. Load all Interactive Simulations
                const simCandidates = [];
                if (data?.simResources && data.simResources.length > 0) {
                    console.log(`🎮 [MathEngine] Loading ${data.simResources.length} simulations...`);
                    for (const simRes of data.simResources) {
                        try {
                            const fileName = simRes.file.endsWith('.json') ? simRes.file : `${simRes.file}.json`;
                            const { steps: simSteps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                            simSteps.forEach((s, idx) => { 
                                s.isSimulation = true; 
                                // FORCE DETERMINISTIC ID (v3.7)
                                s.id = s.id || `sim_${simRes.file.replace('.json', '')}_${idx}`;
                                s.file = simRes.file; 
                            });
                            simCandidates.push(...simSteps);
                        } catch (e) {
                            console.warn("Failed to load sim:", simRes.file);
                        }
                    }
                }

                // 3b. Pre-load Recap Resources (held separately for 3-consecutive-wrong rescue)
                const recapCandidates = [];
                if (data?.recapResources && data.recapResources.length > 0) {
                    console.log(`📖 [MathEngine] Pre-loading ${data.recapResources.length} recap resources for rescue...`);
                    for (const recapRes of data.recapResources) {
                        try {
                            const fileName = recapRes.file.endsWith('.json') ? recapRes.file : `${recapRes.file}.json`;
                            const { steps: rSteps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                            rSteps.forEach((s, idx) => {
                                // Exhaustive engine detection (v3.2)
                                const eType = getEngineType(s);

                                s.isSimulation = eType !== 'MCQ' && eType !== 'NONE' && eType !== 'NULL';
                                s.isRecap = true;
                                s.id = s.id || `recap_${recapRes.file.replace('.json', '')}_${idx}`;
                            });
                            recapCandidates.push(...rSteps);
                        } catch (e) {
                            console.warn("[MathEngine] Failed to load recap:", recapRes.file);
                        }
                    }
                    setRecapSteps(recapCandidates);
                    console.log(`✅ [MathEngine] ${recapCandidates.length} recap steps ready for rescue.`);
                }

                // 4. Run them through the adaptive engine (now supports interleaving!)
                const quest = await generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, mergedHistory, simCandidates);
                const finalQuestions = quest.questions;
                
                setQuestions(finalQuestions);
                setQuestMeta(quest);

                console.log(`\ud83c\udfaf [Math Adaptive v4.1] ${nodeType} quest generated:`, {
                    bankSize: allQuestions.length,
                    simCount: simCandidates.length,
                    recapCount: recapCandidates.length,
                    finalLength: finalQuestions.length,
                    gameMode: quest.metadata.gameMode,
                });
                
                // Small delay to ensure smooth transition
                setTimeout(() => setIsLoading(false), 300);
            } catch (err) {
                console.error("\ud83d\udd25 [Math] Initialization Failed:", err);
                setRenderError(err);
                setIsLoading(false);
            }
        };
        loadQuestions();
    }, [topicId, nodeType, questKey, data?.simResources]);



    /**
     * Find a rephrased variant of a question in the bank.
     * Looks for questions testing the same concept with different wording.
     * Uses difficulty progression: E → M → H as "variant levels".
     */
    const findRephrased = (wrongQuestion) => {
        const bank = allBankRef.current;
        // Strategy 1: Find a question with the same base ID pattern but different difficulty
        const baseId = wrongQuestion.id?.replace(/-V\d+$/, '') || '';
        const wrongDifficulty = wrongQuestion.difficulty || 'E';

        // Difficulty progression map
        const nextDiff = { 'E': 'E', 'M': 'E', 'H': 'M' }; // If wrong, give an EASIER version
        const targetDiff = nextDiff[wrongDifficulty] || 'E';

        // Find a question from the same subtopic with matching difficulty, not already in queue
        const usedIds = new Set(questions.map(q => q.id));
        const candidate = bank.find(q =>
            q.id !== wrongQuestion.id &&
            !usedIds.has(q.id) &&
            q.subtopic === wrongQuestion.subtopic &&
            q.difficulty === targetDiff
        );

        if (candidate) return { ...candidate, isRephrased: true, originalId: wrongQuestion.id };

        // Strategy 2: Just pick any unused question from same subtopic
        const fallback = bank.find(q =>
            q.id !== wrongQuestion.id &&
            !usedIds.has(q.id) &&
            q.subtopic === wrongQuestion.subtopic
        );

        if (fallback) return { ...fallback, isRephrased: true, originalId: wrongQuestion.id };

        return null; // No rephrase available
    };

    const handleSelect = (option) => {
        if (isAnswered) return;
        setHintUsed(false); // Auto-close on select (User Request Phase 2)

        if (selectedOption !== null && selectedOption !== option) {
            setAnswerChanged(true);
            setChangeCount(c => c + 1);
        }
        if (!firstSelection.current) firstSelection.current = option;

        setSelectedOption(option);
        window.ManyaAudio?.pop?.();
    };

    const normalize = (str) => String(str || '').trim().toLowerCase();
    const resolveCorrectText = (target, options) => {
        if (!target || !options) return 'N/A';
        const t = normalize(target);
        const directIdx = options.findIndex(opt => normalize(opt) === t);
        if (directIdx !== -1) return options[directIdx];
        const optMatch = t.match(/option_([a-d])/i);
        if (optMatch) { const idx = optMatch[1].toUpperCase().charCodeAt(0) - 65; return options[idx] || target; }
        if (t.length === 1 && /^[a-d]$/i.test(t)) { return options[t.toUpperCase().charCodeAt(0) - 65] || target; }
        return target;
    };
    const isOptionCorrect = (opt, answer, options) => {
        if (!answer || !options) return false;
        const t = normalize(answer);
        const o = normalize(opt);
        if (o === t) return true;
        const optMatch = t.match(/option_([a-d])/i);
        if (optMatch) { const idx = optMatch[1].toUpperCase().charCodeAt(0) - 65; return normalize(options[idx] || "") === o; }
        if (t.length === 1 && /^[a-d]$/i.test(t)) { const idx = t.toUpperCase().charCodeAt(0) - 65; return normalize(options[idx] || "") === o; }
        return false;
    };

    const handleSubmit = () => {
        if (isAnswered || selectedOption === null) return;
        setIsAnswered(true);

        const q = questions[currentIdx];
        const isCorrect = isOptionCorrect(selectedOption, q.answer, q.options);
        const correctText = resolveCorrectText(q.answer, q.options);
        const timeSpentMs = Date.now() - questionStartTime.current;

        if (isCorrect) {
            setScore(s => s + 1);
            window.ManyaAudio?.success?.();

            // If this was a rephrased question, resolve it
            if (q.isRephrased) {
                resolveRephrased(subject, q.originalId);
            }

            // Reset consecutive wrong counter on correct answer
            consecutiveWrongRef.current = 0;
        } else {
            window.ManyaAudio?.error?.();

            // Track wrong answer for variant retry
            trackWrongAnswer(subject, q.id);

            // Queue a rephrased version at the end of the quest
            const rephrased = findRephrased(q);
            if (rephrased) {
                setQuestions(prev => [...prev, rephrased]);
                console.log(`🔄 [Variant Retry] Queued rephrased Q after wrong: ${rephrased.id}`);
            }

            // ─── 🆘 RESCUE RECAP: 3 consecutive wrong → inject recap ───
            consecutiveWrongRef.current += 1;
            if (consecutiveWrongRef.current >= 3 && recapSteps.length > 0 && nodeType !== 'WARMUP') {
                const recapIdx = recapUsedIndexRef.current % recapSteps.length;
                const recapToInject = { ...recapSteps[recapIdx] };
                recapUsedIndexRef.current += 1;
                consecutiveWrongRef.current = 0; // Reset after injection

                // Insert recap as the NEXT question (right after current)
                setQuestions(prev => {
                    const copy = [...prev];
                    copy.splice(currentIdx + 1, 0, recapToInject);
                    return copy;
                });
                console.log(`🆘 [Rescue Recap] 3 consecutive wrong → Injecting recap: ${recapToInject.id}`);
            }
        }

        dispatch(updateSessionAfterAnswer({ isCorrect, hintUsed, answerChanged, timeSpentMs }));

        const frustration = calculateFrustration(session);
        const { baseId, variant } = q.id?.includes('-V') 
            ? { baseId: q.id.split('-V')[0], variant: 'V' + q.id.split('-V')[1] }
            : { baseId: q.id, variant: 'V0' };

        const answerLog = {
            questionId: q.id,
            isCorrect,
            selectedAnswer: selectedOption,
            correctAnswer: q.answer,
            timeSpentMs,
            hintUsed,
            answerChanged,
            changeCount,
            pool: q.isPLE ? 'yes' : 'no',
            concept_id: baseId,
            variant: variant,
            engine_type: 'MCQ',
            frustrationLevel: frustration?.score || 0
        };
        ManyaDB.recordAnswer(subject, answerLog);
        setHistory(prev => [...prev, answerLog]);
        syncService.pushAnswer(subject, answerLog);

        // ─── CONCEPT MASTERY TRACKING (Spaced Repetition) ───
        conceptMasteryService.updateAfterAnswer(subject, baseId, isCorrect)
            .catch(e => console.warn('[ConceptMastery] Update failed:', e));

        // Gem Calculation (Logic copied from awardGems for precision)
        const streakMultiplier = (user.current_streak >= 7) ? 2.0 : (user.current_streak >= 5) ? 1.5 : (user.current_streak >= 3) ? 1.2 : 1.0;
        const baseAmount = hintUsed ? 1 : 3;
        const bonus = (!hintUsed && isCorrect) ? 1 : 0;
        const totalGems = isCorrect ? Math.floor((baseAmount + bonus) * streakMultiplier) : 0;
        const totalXP = hintUsed ? 5 : 10;

        if (isCorrect) {
            dispatch(awardGems({ subject, amount: totalGems, xp: totalXP }));
            setGemsEarned(g => g + totalGems);
            setShowGemToast(true);
            setTimeout(() => setShowGemToast(false), 1500);

            // ─── SEAMLESS AUTO-ADVANCE (v4.2) ───
            // After a correct answer, wait 800ms to show the green state, then glide to next question.
            setTimeout(() => nextQuestion(), 800);
        } else {
            // Wrong answer: Wait 500ms then show the Absolute Solution Portal
            setTimeout(() => setShowExplanation(true), 500);
        }

        const hesitation = calculateHesitation({ answerChanged, changeCount, timeSpentMs, hintUsed });
    };

    const nextQuestion = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(c => c + 1);
            setSelectedOption(null);
            setIsAnswered(false);
            setShowExplanation(false);
            setHintUsed(false);
            setAnswerChanged(false);
            setChangeCount(0);
            firstSelection.current = null;
            questionStartTime.current = Date.now();
        } else if (isFinished !== undefined && !isFinished) {
            // ── QUEST COMPLETE ──
            if (setIsFinished) setIsFinished(true); // LOCK IT
            const finalScore = score;
            const mastery = Math.round((finalScore / questions.length) * 100);

            // Save to questProgressService (updates node status + unlocks next)
            const result = saveNodeCompletion(subject, questKey, nodeType, mastery);

            // Signal for QuestPathView animation
            setJustFinished({
                subject,
                questKey,
                nodeType,
                mastery,
                unlocked: result.unlocked,
                nextNode: result.nextNode
            });

            // ─── GLOBAL SPIRAL PROGRESS SYNC ───
            // If this was the MASTERY node and they passed (>= 60%),
            // check if we need to unlock the next quest on the SST World map.
            if (nodeType === 'MASTERY' && mastery >= 60) {
                const mapIndex = data?.questIndex ?? 0;
                const progKey = `prog_${subject}`;
                const currentProg = user[progKey] || 0;
                if (mapIndex >= currentProg) {
                    dispatch(updateProfile({ [progKey]: mapIndex + 1 }));
                }
            }

            setCompletionResult({ mastery, ...result, score: finalScore, total: questions.length });
            setShowCompletion(true);

            // ─── XP REWARD ───
            if (result.xpReward) {
                dispatch(addXP(result.xpReward));
            }

            // ─── ACHIEVEMENT CHECK ───
            const achieveCtx = {
                questsCompleted: (user[`prog_${subject}`] || 0) + 1,
                mastery,
                streak: user.current_streak || 0,
                questCompletedNoHints: session.hintCount === 0,
                avgTime: questions.length > 0 ? (questions.reduce((sum, q) => sum + (q._timeSpent || 10000), 0)) / questions.length : 15000,
                accuracy: questions.length > 0 ? finalScore / questions.length : 0,
                totalCorrect: (user[`prog_${subject}`] || 0) * 6 + finalScore,
                nodeType,
                attempts: result.attempts || 1,
                v3Mastered: 0,
                gemsEarned: user[`${subject}Gems`] || 0,
            };
            const newBadges = achievementService.checkAchievements(subject, achieveCtx);
            if (newBadges.length > 0) {
                setEarnedAchievements(newBadges);
            }

            console.log(`🏆 [Math] ${nodeType} complete:`, { mastery, ...result });
        }
    };

    const handleFinish = () => {
        const mastery = completionResult?.mastery || 0;
        onResult?.({
            isCorrect: mastery >= 60,
            score: completionResult?.score || score,
            total: completionResult?.total || questions.length,
            mastery,
            gemsEarned,
            type: 'adaptive_math',
        });
        onComplete?.();
    };

    const showHint = () => {
        if (!hintUsed) {
            setHintUsed(true);
        }
    };

    if (isLoading) {
        const cfg = getLoadingConfig('math');
        const randomFact = getRandomFact('math');

        return (
            <div className="quest-loading-overlay" style={{ '--loader-color': cfg.color, '--loader-dark': cfg.colorDark, '--loader-bg': cfg.bgLight }}>
                {/* Ambient Glow Blobs */}
                <div className="loader-blob loader-blob-1" style={{ background: cfg.color }} />
                <div className="loader-blob loader-blob-2" style={{ background: cfg.color }} />

                <div className="loader-content-card">
                    {/* Mascot Hero */}
                    <div className="loader-mascot-ring" style={{ borderColor: cfg.color }}>
                        <img src={cfg.mascot} alt="Manya" className="loader-mascot-img" />
                    </div>

                    {/* Title & Bounce Dots */}
                    <h3 className="loader-title">{cfg.title}</h3>
                    <div className="loader-bounce-dots">
                        <span className="loader-dot" style={{ background: cfg.color, animationDelay: '0ms' }} />
                        <span className="loader-dot" style={{ background: cfg.color, animationDelay: '200ms' }} />
                        <span className="loader-dot" style={{ background: cfg.color, animationDelay: '400ms' }} />
                    </div>

                    {/* Fun Fact Card */}
                    <div className="loader-fact-card" style={{ borderColor: `${cfg.color}30` }}>
                        <span className="loader-fact-label" style={{ color: cfg.color }}>Did you know?</span>
                        <p className="loader-fact-text">{randomFact}</p>
                    </div>

                    {/* Status */}
                    <p className="loader-status-text">{cfg.sub}</p>
                </div>
            </div>
        );
    }

    const RenderError = ({ error, onRetry }) => (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-rose-500/10">
                <X size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Engine Glitch</h3>
            <p className="text-sm text-slate-500 font-bold mb-8 max-w-xs mx-auto">
                Something went wrong on your device. Let's try to reload.
            </p>
            <div className="w-full max-w-md bg-slate-900 text-rose-400 p-6 rounded-2xl text-left font-mono text-[10px] overflow-auto max-h-60 mb-8 border border-white/10">
                <strong>Error:</strong> {error.message}
                <br /><br />
                <strong>Stack:</strong>
                <pre className="opacity-70 mt-2">{error.stack}</pre>
            </div>
            <button 
                onClick={onRetry}
                className="px-8 h-14 bg-slate-900 text-white rounded-2xl font-black tracking-widest uppercase flex items-center gap-2 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
            >
                RELOAD ENGINE <RotateCcw size={18} />
            </button>
        </div>
    );

    // ── RENDER DEBUG OVERLAY ──
    const renderDebug = () => {
        if (!data?.debug) return null;
        const q = questions[currentIdx];
        const factors = q?._score?.factors || [];
        return (
            <div className="fixed bottom-24 left-4 right-4 bg-black/80 text-white p-3 rounded-lg text-[10px] font-mono z-[100] backdrop-blur-sm border border-white/20 pointer-events-none">
                <div className="flex justify-between border-b border-white/20 pb-1 mb-1">
                    <span className="text-amber-400">ADM-DEBUG v3.2</span>
                    <span className="opacity-50 uppercase">{nodeType}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                    <span className="bg-blue-500/30 px-1 rounded">SRC: {q?.source || 'unknown'}</span>
                    <span className="bg-purple-500/30 px-1 rounded">DIF: {q?.difficulty || 'E'}</span>
                    {q?.isPLE && <span className="bg-emerald-500/30 px-1 rounded">PLE: YES</span>}
                    {factors.map(f => <span key={f} className="bg-white/10 px-1 rounded border border-white/10">{f}</span>)}
                </div>
            </div>
        );
    };

    if (renderError) return <RenderError error={renderError} onRetry={() => window.location.reload()} />;

    if (questions.length === 0) return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <Search size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">No Questions Found</h3>
            <p className="text-sm text-slate-500 font-bold max-w-xs mx-auto mb-6">
                We couldn't find any questions for <span className="text-amber-600">"{topicId}"</span>. Please check your Supabase data or subtopic filters.
            </p>
            <button 
                onClick={handleFinish}
                className="px-6 h-12 bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2"
            >
                BACK TO MAP <ArrowRight size={18} />
            </button>
        </div>
    );

    // ── COMPLETION SCREEN ──
    if (showCompletion && completionResult) {
        return (
            <CelebrationView
                subject="Math"
                nodeType={nodeType}
                mastery={completionResult.mastery}
                score={completionResult.score}
                total={completionResult.total}
                gemsEarned={gemsEarned}
                onCollect={handleFinish}
            />
        );
    }

    // ── QUESTION UI ──
    try {
        const q = questions[currentIdx];
        if (!q) return null;
        
        // Use session from Redux state (already imported above)
        const frustration = calculateFrustration(session);
        const correctText = resolveCorrectText(q.answer, q.options);

        // ─── SIMULATION / PUZZLE / RECAP VIEW (Whitelist-based Routing v3.3) ───
        const eType = getEngineType(q);
        const isActuallySimulation = SUPPORTED_SIM_ENGINES.includes(eType);

        if (isActuallySimulation) {
            return (
                <div className="flex-1 min-h-0 flex flex-col animate-in fade-in duration-500 overflow-hidden relative">
                     <SimulatorBridge 
                        key={q.id || currentIdx}
                        step={q} 
                        onComplete={(results) => {
                            // If engine provides USP, use its logic
                            const usp = results?.usp;
                            const isSuccess = usp ? usp.isPassing : (results ? (results.score >= (results.total * 0.6) || results.isCorrect) : true);
                            const timeSpentMs = usp ? usp.timeSpentMs : (results?.duration || 30000);

                            console.log(`🏁 [MathEngine] Simulation complete:`, results);

                            // ─── PERSIST SIMULATION RESULT ───
                            dispatch(updateSessionAfterAnswer({
                                isCorrect: isSuccess,
                                hintUsed: false,
                                answerChanged: false,
                                timeSpentMs
                            }));

                            const finalLog = {
                                questionId: q.id,
                                isCorrect: isSuccess,
                                selectedAnswer: 'COMPLETED',
                                correctAnswer: 'COMPLETED',
                                timeSpentMs,
                                hintUsed: false,
                                answerChanged: false,
                                pool: 'simulation',
                                answeredAt: new Date().toISOString(),
                                mistakes: usp ? usp.mistakes : (results?.mistakes || 0),
                                engine_type: q.engineType || q.type || 'SIMULATION',
                                usp_data: usp // Store full USP breakdown
                            };
                            ManyaDB.recordAnswer(subject, finalLog);
                            syncService.pushAnswer(subject, finalLog);

                            if (isSuccess) {
                                // Add bonus gems for high accuracy
                                const accuracyBonus = usp ? Math.floor(usp.accuracy / 20) : 0;
                                setScore(prev => prev + 1);
                                setGemsEarned(prev => prev + 5 + accuracyBonus); 
                            }
                            nextQuestion();
                        }} 
                        onAttempt={(attempt) => {
                            // ─── EFFICIENCY: PREVENT DUPLICATES ───
                            const now = Date.now();
                            if (now - lastSimAttemptRef.current.time < 500 && lastSimAttemptRef.current.label === attempt.label) {
                                return;
                            }
                            lastSimAttemptRef.current = { time: now, label: attempt.label };

                            // ─── GRANULAR SIMULATION TRACKING ───
                            const frustration = calculateFrustration(session);
                            const engineType = q.engineType || q.type || 'IMAGE_HOTSPOTS';
                            const attemptLog = {
                                questionId: q.id,
                                isCorrect: attempt.isCorrect,
                                selectedAnswer: attempt.selectedAnswer || attempt.label || 'SIM_ATTEMPT',
                                correctAnswer: attempt.correctAnswer || 'STEP_COMPLETE',
                                timeSpentMs: attempt.duration || 0,
                                pool: 'simulation_step',
                                engine_type: engineType,
                                frustrationLevel: frustration?.score || 0,
                                mistakes: attempt.mistakes || 0
                            };
                            
                            console.log(`📡 [MathEngine] Recording granular attempt:`, attemptLog);
                            ManyaDB.recordAnswer(subject, attemptLog);
                            syncService.pushAnswer(subject, attemptLog);
                        }}
                    />
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden relative" style={{ maxHeight: '100%' }}>
                {/* ── GEM TOAST ── */}
                {showGemToast && (
                    <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-black animate-bounce z-20 flex items-center gap-1 pointer-events-none">
                        <Trophy size={12} /> +{gemsEarned} gems
                    </div>
                )}

                {/* ── QUESTION CARD ── */}
                <div className="flex-1 flex flex-col px-4 pt-4 overflow-hidden">

                    {/* Progress dots */}
                    <div className="flex gap-1.5 justify-center mb-5 overflow-x-auto no-scrollbar flex-shrink-0">
                        {questions.map((_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 shrink-0 ${i === currentIdx ? 'bg-amber-500 w-5' : (i < currentIdx ? 'bg-amber-500 opacity-35 w-1.5' : 'bg-slate-200 w-1.5')}`} />
                        ))}
                    </div>

                    {/* Rephrased / frustration nudge */}
                    {q.isRephrased && (
                        <div className="text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2 font-bold mb-3 text-center flex-shrink-0">
                            🔄 Let's try this concept again with different wording
                        </div>
                    )}
                    {calculateFrustration(session).level === 'high' && (
                        <div className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 font-bold mb-3 text-center flex-shrink-0">
                            💪 Take your time — you're doing great!
                        </div>
                    )}

                    {/* ── QUESTION TEXT (Themed) ── */}
                    <div 
                        className="bg-[var(--bg-card)] rounded-[2rem] border-[4.5px] border-[var(--sub-theme-bg)] px-6 py-6 mb-4 shadow-xl flex-shrink-0 relative"
                        style={{ '--sub-theme-bg': '#8b5cf6', '--sub-theme-border': '#7c3aed' }}
                    >
                        <div className="toy-card-gloss" />
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                    <Compass size={12} className="text-amber-500" />
                                </div>
                                <span className="text-amber-500 font-black text-[9px] tracking-widest uppercase opacity-80">
                                    {nodeType === 'WARMUP' ? '🌅 Warm-up' : nodeType === 'MASTERY' ? '⚡ Mastery' : 'Practice'} · {currentIdx + 1}/{questions.length}
                                </span>
                            </div>
                            
                            {/* 💡 TOP-RIGHT LIGHTBULB HINT TOGGLE (Floating v2.0) */}
                            {!isAnswered && q.hint && (
                                <div className="relative">
                                    <button 
                                        key="hint-btn" 
                                        onClick={() => setHintUsed(!hintUsed)} 
                                        className={`p-2 rounded-xl transition-all relative z-10 ${hintUsed ? 'bg-[var(--sub-theme-bg)] text-white shadow-lg shadow-purple-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                    >
                                        <Lightbulb size={18} />
                                    </button>

                                    {hintUsed && (
                                        <div className="mcq-hint-bubble">
                                            <div className="toy-card-gloss" />
                                            <div className="mcq-hint-header">
                                                <Sparkles size={14} className="text-white" />
                                                <span className="mcq-hint-badge">Tutor Hint</span>
                                            </div>
                                            <p className="mcq-hint-text">{q.hint}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-[var(--text-main)] font-bold text-[17px] leading-snug m-0">
                            {q.question}
                        </p>
                    </div>

                    {/* ── OPTIONS ── */}
                    <div className="flex flex-col gap-2.5 flex-shrink-0">
                        {q.options?.map((opt, i) => {
                            const isThisCorrect = isOptionCorrect(opt, q.answer, q.options);
                            const isSelected = opt === selectedOption;

                            let cls = 'mcq-fe-btn';
                            if (isAnswered) {
                                if (isThisCorrect)      cls += ' mcq-fe-correct';
                                else if (isSelected)    cls += ' mcq-fe-wrong';
                                else                    cls += ' mcq-fe-faded';
                            } else if (isSelected) {
                                cls += ' mcq-fe-selected';
                            }

                            return (
                                <button
                                    key={i}
                                    className={cls}
                                    onClick={() => handleSelect(opt)}
                                    disabled={isAnswered}
                                >
                                    <div className="toy-card-gloss" />
                                    <span className="mcq-fe-letter">{String.fromCharCode(65 + i)}</span>
                                    <span className="mcq-fe-text">{opt}</span>
                                    {isAnswered && isThisCorrect && <Check size={16} className="mcq-fe-icon correct-icon" strokeWidth={3} />}
                                    {isAnswered && isSelected && !isThisCorrect && <X size={16} className="mcq-fe-icon wrong-icon" strokeWidth={3} />}
                                </button>
                            );
                        })}
                    </div>



                    {/* ── SUBMIT BUTTON (only when not yet answered) ── */}
                        <button
                            onClick={handleSubmit}
                            disabled={selectedOption === null}
                            className={`mt-4 w-full h-14 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 flex-shrink-0 relative overflow-hidden ${
                                selectedOption !== null
                                    ? 'bg-[#58cc02] hover:bg-[#46a302] text-white border-b-[4px] border-[#46a302] active:border-b-0 active:translate-y-1 shadow-[inset_0_2px_0_rgba(255,255,255,0.3)]'
                                    : 'bg-[#e5e5e5] text-[#a0a0a0] border-b-[4px] border-[#d4d4d4] cursor-not-allowed dark:bg-slate-700 dark:border-slate-800 dark:text-slate-500'
                            }`}
                        >
                            <span className="relative z-10 flex items-center gap-2 drop-shadow-sm">SUBMIT ANSWER <Zap size={14} fill="currentColor" /></span>
                        </button>
                </div>


                {/* ── WRONG: SOLUTION POPUP (PORTAL TO BODY) ── */}
                {isAnswered && selectedOption !== q.answer && showExplanation && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        {/* Backdrop: Full screen fixed backdrop */}
                        <div 
                            className="fixed inset-0" 
                            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }} 
                            onClick={nextQuestion}
                        />

                        {/* Floating panel: Vertically centered on screen */}
                        <div className="relative w-full max-w-md z-[10000] rounded-[2.5rem] overflow-hidden"
                             style={{ 
                                 background: 'var(--bg-card)', 
                                 animation: 'mcqFadeScaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)', 
                                 padding: '24px 20px 24px',
                                 boxShadow: '0 40px 100px -10px rgba(0,0,0,0.85)',
                                 border: '1px solid var(--border-glass)'
                             }}>

                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                                    <X size={20} strokeWidth={3} />
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 950, fontSize: 18, color: 'var(--text-main)' }}>Not quite!</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-sub)', fontWeight: 700 }}>Here's how to solve it</div>
                                </div>
                            </div>

                            {/* Correct answer chip */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16, 185, 129, 0.1)', border: '1.5px solid rgba(16, 185, 129, 0.2)', borderRadius: 12, padding: '9px 14px', fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 16 }}>
                                <Check size={14} strokeWidth={3} style={{ flexShrink: 0 }} />
                                <span style={{ flexShrink: 0 }}>Correct Answer:</span> 
                                <strong style={{ marginLeft: 4 }}>{correctText}</strong>
                            </div>

                            {/* Steps Area with Scrollbar removal */}
                            <div className="no-scrollbar" style={{ marginBottom: 20, maxHeight: '45vh', overflowY: 'auto' }}>
                                <MathSolutionSteps steps={q.explanation} />
                            </div>

                            {/* Continue button */}
                            <button
                                onClick={nextQuestion}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    width: '100%', height: 56,
                                    borderRadius: 20, border: 'none',
                                    background: '#ef4444', color: 'white',
                                    fontWeight: 950, fontSize: 15, letterSpacing: 0.5,
                                    boxShadow: '0 6px 0 #b91c1c', cursor: 'pointer',
                                    transition: 'transform 0.1s'
                                }}
                                className="active:scale-95"
                            >
                                {currentIdx === (questions?.length || 0) - 1 ? 'FINISH QUEST' : 'Continue'} <ArrowRight size={18} strokeWidth={3} />
                            </button>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        );
    } catch (err) {
        console.error("🔥 Render Crash in MathFetcherEngine:", err);
        setRenderError(err);
        return null;
    }
}
