import React, { useState, useEffect, useRef } from 'react';
import { Check, X, ArrowRight, Lightbulb, Globe, Compass, Zap, Timer, Trophy, RotateCcw, Search, Puzzle, AlertCircle } from 'lucide-react';
import { fetchSstQuestions } from '../../services/sstMockDB';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile } from '../../store/userSlice';
import { generateAdaptiveQuest, selectGameMode } from '../../services/adaptiveEngine';
import {
    getSession, updateSessionAfterAnswer, recordAnswer,
    awardGems, resetSession, saveQuestCompletion
} from '../../services/userStateService';
import { calculateFrustration, calculateHesitation } from '../../services/psychTracker';
import {
    saveNodeCompletion, trackWrongAnswer, resolveRephrased,
    setJustFinished, UNLOCK_THRESHOLDS, NODE_ORDER
} from '../../services/questProgressService';
import { preloadCurriculum } from '../../services/curriculumService';
import UniversalGlobeEngine from '../shared-engines/UniversalGlobeEngine';
import ImageHotspotsEngine from '../shared-engines/ImageHotspotsEngine';
import GalleryStudyEngine from '../shared-engines/GalleryStudyEngine';
import { loadQuestSteps } from '../../utils/questLoader';

/**
 * SIMULATOR BRIDGE
 * Connects the MCQ-based Fetcher to specialized Simulation Engines.
 */
const SimulatorBridge = ({ step, onComplete }) => {
    const [simData, setSimData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSim = async () => {
            try {
                // Use the shared loader to get the JSON content
                const content = await loadQuestSteps([step]);
                if (content && content[0]?.data) {
                    setSimData(content[0].data);
                }
            } catch (err) {
                console.error("Failed to load simulation data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSim();
    }, [step]);

    if (loading) return (
        <div className="flex-1 flex items-center justify-center p-10">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!simData) return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-rose-500 font-bold">
            <AlertCircle size={40} className="mb-4" />
            Simulation Load Failure
            <button onClick={onComplete} className="mt-4 text-xs bg-slate-100 px-4 py-2 rounded-lg">Skip Simulation</button>
        </div>
    );

    // Determine which engine to use
    const engineType = simData.engineType || simData.type || 'IMAGE_HOTSPOTS';

    const handleSimComplete = (results) => {
        console.log(`🎮 [SimulatorBridge] Simulation Complete. Results:`, results);
        // We wrap the result in a standard format
        onComplete({
            success: true,
            score: results?.accuracy ?? 100,
            simResults: results
        });
    };

    switch (engineType) {
        case 'GLOBE_TIME_ENGINE':
        case 'GLOBE_ENGINE':
        case 'UNIVERSAL_GLOBE':
            return <UniversalGlobeEngine data={simData} onComplete={handleSimComplete} />;
        
        case 'IMAGE_HOTSPOTS':
            return <ImageHotspotsEngine data={simData} onComplete={handleSimComplete} />;
        
        case 'GALLERY_STUDY':
            return <GalleryStudyEngine data={simData} onComplete={handleSimComplete} />;

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
 * MANYA SST FETCHER ENGINE v3.0 (Adaptive + Variant Retry + Mastery Save)
 * ========================================================================
 * - Wrong answer → queues rephrased variant for retry within same quest
 * - On completion: saves mastery via questProgressService
 * - Shows completion screen with unlock status or retry prompt
 */
export default function SSTFetcherEngine({ data, onComplete, onResult }) {
    const dispatch = useDispatch();
    const user = useSelector(state => state.user.data);
    
    const [renderError, setRenderError] = useState(null);
    const [questions, setQuestions] = useState([]);
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

    // All questions from bank (for variant lookup)
    const allBankRef = useRef([]);
    const questionStartTime = useRef(Date.now());
    const firstSelection = useRef(null);

    const topicId = data?.topic || 'default';
    const nodeType = data?.nodeType || 'PRACTICE';
    const subject = data?.subject || 'sst';
    const questKey = data?.questKey || `sst/${topicId}`;

    useEffect(() => {
        const loadQuestions = async () => {
            setIsLoading(true);
            resetSession();
            
            // Prime curriculum cache early so map exit is instant
            preloadCurriculum();

            try {
                // 1. Fetch ALL questions from the bank
                const allQuestions = await fetchSstQuestions(topicId);
                allBankRef.current = allQuestions;

                // 2. Run them through the adaptive engine
                const quest = generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, data?.resources || []);
                setQuestions(quest.questions);
                setQuestMeta(quest);

                console.log(`🎯 [SST Adaptive v3] ${nodeType} quest:`, {
                    length: quest.questions.length,
                    gameMode: quest.gameMode,
                });
                
                // Small delay to ensure smooth transition
                setTimeout(() => setIsLoading(false), 300);
            } catch (err) {
                console.error("🔥 [SST] Initialization Failed:", err);
                setRenderError(err);
            }
        };
        loadQuestions();
    }, [topicId, nodeType, questKey]);

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

        if (selectedOption !== null && selectedOption !== option) {
            setAnswerChanged(true);
            setChangeCount(c => c + 1);
        }
        if (!firstSelection.current) firstSelection.current = option;

        setSelectedOption(option);
        window.ManyaAudio?.pop?.();
    };

    const handleSubmit = () => {
        if (isAnswered || selectedOption === null) return;
        setIsAnswered(true);

        const q = questions[currentIdx];
        const isCorrect = selectedOption === q.answer;
        const timeSpentMs = Date.now() - questionStartTime.current;

        if (isCorrect) {
            setScore(s => s + 1);
            window.ManyaAudio?.success?.();

            // If this was a rephrased question, resolve it
            if (q.isRephrased) {
                resolveRephrased(subject, q.originalId);
            }
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
        }

        const session = updateSessionAfterAnswer(isCorrect, hintUsed, answerChanged, timeSpentMs);

        recordAnswer(subject, {
            questionId: q.id,
            isCorrect,
            selectedAnswer: selectedOption,
            correctAnswer: q.answer,
            timeSpentMs,
            hintUsed,
            answerChanged,
            pool: 'exam',
        });

        const gems = awardGems(subject, isCorrect, hintUsed);
        if (gems.subjectGems > 0) {
            setGemsEarned(g => g + gems.subjectGems);
            setShowGemToast(true);
            setTimeout(() => setShowGemToast(false), 1500);
        }

        const hesitation = calculateHesitation({ answerChanged, changeCount, timeSpentMs, hintUsed });
        if (hesitation.level === 'high') {
            console.log('😰 High hesitation:', hesitation.events);
        }

        setTimeout(() => setShowExplanation(true), 500);
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
                const QUEST_INDEX_MAP = {
                    'quest_1_world_stage': 0,
                    'quest_2_grid_master': 1,
                    'quest_3_calculating_time': 2,
                    'quest_4_water_bodies': 3,
                    'quest_5_coastal_features': 4,
                    'quest_6_regional_division_capital_cities': 5,
                    'quest_7_landlocked_countries': 6
                };

                const currentQuestIdx = QUEST_INDEX_MAP[topicId];
                const currentGlobalProg = user?.prog_sst || 0;

                if (currentQuestIdx !== undefined && currentQuestIdx === currentGlobalProg) {
                    const nextProg = currentGlobalProg + 1;
                    console.log(`🌍 [SST Sync] Unlocking next quest on map! prog_sst: ${currentGlobalProg} -> ${nextProg}`);
                    dispatch(updateProfile({ prog_sst: nextProg }));
                }
            }

            // Also save to userStateService
            saveQuestCompletion(questKey, mastery);

            setCompletionResult({ mastery, ...result, score: finalScore, total: questions.length });
            setShowCompletion(true);

            console.log(`🏆 [SST] ${nodeType} complete:`, { mastery, ...result });
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
            type: 'adaptive_sst',
        });
        onComplete?.();
    };

    const showHint = () => {
        if (!hintUsed) {
            setHintUsed(true);
        }
    };

    // ── LOADING ──
    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

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
        const { mastery, unlocked, nextNode, needsRetry, threshold, attempts } = completionResult;
        const isPassing = mastery >= 60;
        const isPerfect = mastery === 100;

        return (
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in duration-700 bg-slate-50/50">
                <div className="w-full max-w-sm bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 p-8 text-center relative overflow-hidden">
                    
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-50 to-transparent opacity-50" />
                    {isPerfect && (
                        <div className="absolute inset-0 pointer-events-none opacity-20">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="absolute animate-bounce" style={{
                                    top: `${Math.random() * 80}%`,
                                    left: `${Math.random() * 100}%`,
                                    animationDelay: `${i * 0.2}s`,
                                    fontSize: '24px'
                                }}>
                                    {['🎈', '🎉', '✨', '🎊'][i % 4]}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Trophy/Status Icon */}
                    <div className="relative mb-6 pt-4">
                        <div className="w-24 h-24 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4 rotate-3 shadow-inner group-hover:rotate-0 transition-transform duration-500">
                             <div className="text-6xl animate-pulse">
                                {mastery >= 90 ? '🏆' : mastery >= 75 ? '🥈' : mastery >= 60 ? '🥉' : '💪'}
                             </div>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
                             {mastery >= 90 ? 'Outstanding!' : mastery >= 75 ? 'Great Job!' : mastery >= 60 ? 'Well Done!' : 'Keep Going!'}
                        </h2>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                             <Compass size={10} /> {nodeType} COMPLETE
                        </div>
                    </div>

                    {/* Mastery Ring Card */}
                    <div className="bg-slate-50 rounded-[2.5rem] p-6 mb-6 border border-slate-100/50">
                        <div className="relative w-32 h-32 mx-auto mb-4">
                            <svg className="w-full h-full -rotate-90">
                                <circle 
                                    cx="64" cy="64" r="58"
                                    fill="none" stroke="#e2e8f0" strokeWidth="12"
                                />
                                <circle 
                                    cx="64" cy="64" r="58"
                                    fill="none" 
                                    stroke={isPassing ? '#10b981' : '#f43f5e'} 
                                    strokeWidth="12"
                                    strokeDasharray="364.4"
                                    strokeDashoffset={364.4 - (364.4 * mastery) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-slate-800 leading-none">{mastery}%</span>
                                <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase mt-1">Mastery</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-around border-t border-slate-200/50 pt-4 mt-2">
                            <div className="text-center">
                                <div className="text-lg font-black text-slate-800">{completionResult.score}/{completionResult.total}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correct</div>
                            </div>
                            <div className="w-[1px] h-8 bg-slate-200" />
                            <div className="text-center">
                                <div className="text-lg font-black text-amber-500 flex items-center gap-1">
                                    <Trophy size={16} fill="currentColor" /> +{gemsEarned}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gems</div>
                            </div>
                        </div>
                    </div>

                    {/* Unlock Feedback */}
                    {unlocked && nextNode ? (
                        <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-4 mb-8 animate-in slide-in-from-bottom-2 duration-500 delay-300">
                             <div className="flex items-center justify-center gap-3">
                                 <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                     <Zap size={16} fill="currentColor" />
                                 </div>
                                 <div className="text-left">
                                     <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">New Milestone</div>
                                     <div className="text-sm font-bold text-emerald-900 leading-none">{nextNode} Unlocked!</div>
                                 </div>
                             </div>
                        </div>
                    ) : needsRetry && (
                        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-4 mb-8">
                             <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Progress Guard</div>
                             <div className="text-sm font-bold text-rose-900">Need {threshold}% to unlock next node</div>
                        </div>
                    )}

                    {/* Bottom Actions */}
                    <div className="flex flex-col gap-3">
                         <button
                            onClick={handleFinish}
                            className="w-full h-14 bg-slate-900 text-white rounded-3xl font-black text-[13px] tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                        >
                            {needsRetry ? 'EXIT QUEST' : 'COLLECT REWARDS'} <ArrowRight size={18} />
                        </button>
                        
                        {needsRetry && (
                             <button
                                onClick={() => {
                                    setShowCompletion(false); setCompletionResult(null); setCurrentIdx(0); setScore(0); setGemsEarned(0); setSelectedOption(null); setIsAnswered(false); setShowExplanation(false); setIsLoading(true); resetSession();
                                    (async () => {
                                        const allQ = await fetchSstQuestions(topicId);
                                        allBankRef.current = allQ;
                                        const quest = generateAdaptiveQuest(allQ, nodeType, subject, questKey);
                                        setQuestions(quest.questions);
                                        setQuestMeta(quest);
                                        setIsLoading(false);
                                    })();
                                }}
                                className="w-full h-14 bg-white text-slate-600 border-2 border-slate-100 rounded-3xl font-black text-[11px] tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                            >
                                <RotateCcw size={16} /> REPLAY NODE
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── QUESTION UI ──
    try {
        const q = questions[currentIdx];
        if (!q) return null;
        
        const session = getSession();
        const frustration = calculateFrustration(session);

        // ── SIMULATION / PUZZLE / RECAP VIEW ──
        if (q.isSimulation || q.type === 'STUDY_RECAP' || q.type === 'INTERACTIVE_PUZZLE') {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-0 animate-in fade-in duration-500 overflow-hidden">
                    <SimulatorBridge 
                        step={q} 
                        onComplete={(results) => {
                            const isSuccess = results?.score >= 60;
                            const timeSpentMs = results?.duration || 30000;

                            // ─── PERSIST SIMULATION RESULT ───
                            updateSessionAfterAnswer(isSuccess, false, false, timeSpentMs);
                            recordAnswer(subject, {
                                questionId: q.id,
                                isCorrect: isSuccess,
                                selectedAnswer: 'COMPLETED',
                                correctAnswer: 'COMPLETED',
                                timeSpentMs,
                                hintUsed: false,
                                answerChanged: false,
                                pool: 'simulation',
                            });

                            if (isSuccess) {
                                setScore(prev => prev + 1);
                                setGemsEarned(prev => prev + 5); 
                            }
                            nextQuestion();
                        }} 
                    />
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl border border-amber-100 p-8 relative overflow-hidden">

                    <div className="absolute -top-10 -right-10 opacity-5 text-amber-900 rotate-12">
                       <Globe size={240} />
                    </div>

                    {showGemToast && (
                        <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-black animate-bounce z-20 flex items-center gap-1">
                            <Trophy size={12} /> +{gemsEarned} gems
                        </div>
                    )}

                    {/* Rephrased question indicator */}
                    {q.isRephrased && (
                        <div className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5 font-bold mb-3 text-center">
                            🔄 Let's try this concept again with different wording
                        </div>
                    )}

                    {frustration.level === 'high' && (
                        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 font-bold mb-3 text-center">
                            💪 Take your time — you're doing great!
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div className="flex gap-2 justify-center mb-10 overflow-x-auto no-scrollbar">
                        {questions.map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 shrink-0 ${i === currentIdx ? 'bg-amber-500 w-6' : (i < currentIdx ? 'bg-amber-500 opacity-40' : 'bg-slate-200')}`} />
                        ))}
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                            <Compass size={14} />
                        </div>
                        <div className="text-amber-600 font-black text-[10px] tracking-widest uppercase opacity-80">
                            {nodeType === 'WARMUP' ? '🌅 Warm-up' : nodeType === 'MASTERY' ? '⚡ Mastery' : 'Concept Mastery'} • {currentIdx + 1} / {questions.length}
                        </div>
                        {questMeta?.gameMode === 'quickfire' && (
                            <div className="ml-auto flex items-center gap-1 text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                                <Zap size={10} /> QUICKFIRE
                            </div>
                        )}
                    </div>

                    <h2 className="text-xl font-bold text-slate-800 mb-8 leading-snug relative z-10">
                        {q.question}
                    </h2>

                    <div className="grid gap-3 w-full relative z-10">
                        {q.options?.map((opt, i) => {
                            const isCorrect = opt === q.answer;
                            const isSelected = opt === selectedOption;
                            // ── DYNAMIC STYLING ──
                            let boxStyle = {
                                background: '#f8fafc',
                                borderColor: '#e2e8f0',
                                color: '#334155',
                                transform: 'scale(1)',
                                boxShadow: 'none'
                            };

                            if (isAnswered) {
                                if (isCorrect) {
                                    boxStyle = { background: '#ecfdf5', borderColor: '#10b981', color: '#064e3b', boxShadow: '0 4px 12px rgba(16,185,129,0.1)' };
                                } else if (isSelected) {
                                    boxStyle = { background: '#fef2f2', borderColor: '#ef4444', color: '#7f1d1d', boxShadow: '0 4px 12px rgba(239,68,68,0.1)' };
                                } else {
                                    boxStyle = { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8', opacity: 0.5, filter: 'grayscale(0.5)' };
                                }
                            } else if (isSelected) {
                                // ── VIBRANT SELECTED STATE ──
                                boxStyle = { 
                                    background: '#fffbeb', 
                                    border: '3px solid #f59e0b', 
                                    color: '#92400e', 
                                    transform: 'scale(1.02)', 
                                    boxShadow: '0 8px 20px rgba(245,158,11,0.2)',
                                    zIndex: 10
                                };
                            }

                            return (
                                <button
                                    key={i}
                                    onClick={() => handleSelect(opt)}
                                    disabled={isAnswered}
                                    style={boxStyle}
                                    className={`group relative w-full h-14 rounded-2xl border-2 transition-all duration-300 flex items-center px-5 text-[15px] font-bold animate-in slide-in-from-bottom-${2 + i} fade-in duration-500`}
                                >
                                    <span className="flex-1 text-left">{opt}</span>
                                    {isAnswered && isCorrect && <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0"><Check size={14} strokeWidth={4} /></div>}
                                    {isAnswered && isSelected && !isCorrect && <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white shrink-0"><X size={14} strokeWidth={4} /></div>}
                                    {!isAnswered && isSelected && <div className="w-5 h-5 rounded-full border-4 border-amber-500 flex items-center justify-center shrink-0"><div className="w-2 h-2 rounded-full bg-amber-500" /></div>}
                                </button>
                            );
                        })}
                    </div>

                    {!isAnswered && !hintUsed && q.explanation && (
                        <button onClick={showHint} className="mt-4 text-xs text-amber-500 font-bold flex items-center gap-1 mx-auto opacity-60 hover:opacity-100 transition-opacity">
                            <Lightbulb size={12} /> Use Hint (−gems)
                        </button>
                    )}

                    {/* HINT DISPLAY (Only if requested and not yet answered) */}
                    {hintUsed && !isAnswered && (
                        <div className="mt-6 relative overflow-hidden bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-start gap-3 relative z-10">
                                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shrink-0">
                                    <Lightbulb size={16} fill="currentColor" />
                                </div>
                                <div>
                                    <h4 className="font-black text-amber-600 text-[10px] tracking-widest uppercase mb-1">Quick Hint</h4>
                                    <p className="text-slate-700 font-bold text-[13px] leading-relaxed">{q.hint || 'No hint available for this concept.'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EXPLANATION / DETAILED SOLUTION (Only after answering) */}
                    {isAnswered && (
                        <div className="mt-8 relative overflow-hidden bg-slate-900 border-2 border-white/10 rounded-2xl p-6 shadow-2xl animate-in fade-in duration-500">
                            <div className="absolute -right-8 -bottom-8 text-white/5 -rotate-12">
                                <Search size={160} />
                            </div>
                            
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
                                    <Check size={20} strokeWidth={4} />
                                </div>
                                <div className="pt-0.5">
                                    <h4 className="font-black text-blue-400 text-[10px] tracking-widest uppercase mb-1.5">Detailed Solution</h4>
                                    <p className="text-white font-bold text-[14px] leading-relaxed">{q.explanation || 'Detailed concept explanation coming soon.'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ACTION BUTTON: SUBMIT OR NEXT */}
                    <div className="mt-8">
                        {!isAnswered ? (
                            <button
                                onClick={handleSubmit}
                                disabled={selectedOption === null}
                                className={`w-full h-14 rounded-xl font-black text-xs tracking-widest uppercase transition-all shadow-xl flex items-center justify-center gap-2 ${
                                    selectedOption !== null 
                                    ? 'bg-amber-500 text-white shadow-amber-500/20 active:scale-95' 
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                SUBMIT ANSWER <Zap size={14} />
                            </button>
                        ) : (
                            <button
                                onClick={nextQuestion}
                                className="w-full h-14 bg-slate-900 text-white rounded-xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-black/10"
                            >
                                {currentIdx === questions.length - 1 ? 'FINISH QUEST' : 'NEXT STEP'}
                                <ArrowRight size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    } catch (err) {
        console.error("🔥 Render Crash in SSTFetcherEngine:", err);
        setRenderError(err);
        return null;
    }
}
