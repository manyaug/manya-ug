import React, { useState, useEffect, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { 
    Check, X, ArrowRight, Lightbulb, BookOpen, Zap, Trophy, 
    Compass, RotateCcw, Search, Puzzle, AlertCircle, Sparkles, 
    MessageSquare, HelpCircle, Layers, Star 
} from 'lucide-react';
import { fetchEnglishQuestions } from '../../services/englishMockDB';
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
import {
    saveNodeCompletion, trackWrongAnswer, resolveRephrased,
    setJustFinished, UNLOCK_THRESHOLDS, NODE_ORDER
} from '../../services/questProgressService';
import { preloadCurriculum } from '../../services/curriculumService';
import { loadQuestSteps } from '../../utils/questLoader';
import { ENGINE_REGISTRY } from '../../utils/engineRouter';

/**
 * SIMULATOR BRIDGE (English)
 * Connects the MCQ-based Fetcher to specialized Story Quests or Grammar Rules.
 */
const SimulatorBridge = ({ step, onComplete, onAttempt, nodeType }) => {
    const simData = step?.data || step;
    
    if (!simData) return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-rose-500 font-bold bg-white">
            <AlertCircle size={40} className="mb-4" />
            Story Asset Missing
            <button onClick={onComplete} className="mt-4 text-xs bg-slate-100 px-4 py-2 rounded-lg">Skip to Next Step</button>
        </div>
    );

    // Determine the specialized engine type
    let engineType = simData.engine_type || simData.engineType || simData.type || 'CHAT';
    
    if (engineType.includes('RULE_MASTER')) engineType = 'ENGLISH_RULE_MASTER';
    if (engineType.includes('WORDGRID')) engineType = 'WORDGRID_ENGINE';
    if (engineType.includes('HARVEST')) engineType = 'HARVEST_GAME';

    const engineMeta = ENGINE_REGISTRY[engineType];

    if (!engineMeta || engineMeta.type !== 'react') {
        console.warn(`[Bridge] Unknown engine: ${engineType}`);
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500 bg-white">
                <Puzzle size={40} className="mb-4 opacity-20" />
                <p className="font-bold tracking-tight">Unsupported Activity: {engineType}</p>
                <button onClick={onComplete} className="mt-4 text-xs bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black">CONTINUE QUEST</button>
            </div>
        );
    }

    const EngineComponent = engineMeta.component;

    // CUSTOM THEME: Stories (Explore) get a more immersive "Dark Narrator" or "Paper" feel
    const isNarrative = engineType === 'CHAT' || nodeType === 'EXPLORE';

    return (
        <div className={`flex-1 flex flex-col h-full ${isNarrative ? 'bg-slate-950' : 'bg-white'}`}>
            <Suspense fallback={
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Loading Interactive Step...</p>
                </div>
            }>
                <EngineComponent 
                    data={simData} 
                    onComplete={(res) => {
                        console.log(`🎬 [Bridge] ${engineType} finished:`, res);
                        onComplete({ success: true, score: 100, simResults: res });
                    }}
                    onResult={(res) => console.debug(`📊 [Bridge] ${engineType} update:`, res)}
                    onAttempt={onAttempt}
                />
            </Suspense>
        </div>
    );
};

/**
 * MANYA ENGLISH FETCHER ENGINE v5.0 (PREMIUM AESTHETIC)
 * =============================================================================
 */
export default function EnglishFetcherEngine({ data, onComplete, onResult }) {
    const dispatch = useDispatch();
    const user = useSelector(state => state.user.data);
    const session = useSelector(state => state.user.session);

    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [renderError, setRenderError] = useState(null);

    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [questMeta, setQuestMeta] = useState(null);
    const [gemsEarned, setGemsEarned] = useState(0);
    const [showGemToast, setShowGemToast] = useState(false);
    const [showCompletion, setShowCompletion] = useState(false);
    const [completionResult, setCompletionResult] = useState(null);
    const [isFinished, setIsFinished] = useState(false);
    
    // NEW: Subject Standard UI State
    const [hintUsed, setHintUsed] = useState(false);
    const [answerChanged, setAnswerChanged] = useState(false);
    const [changeCount, setChangeCount] = useState(0);
    const firstSelection = useRef(null);

    const questionStartTime = useRef(Date.now());
    const fetchIterationRef = useRef(null);
    const allBankRef = useRef([]);

    const topicId = data?.topic || 'default';
    const nodeType = data?.nodeType || 'PRACTICE';
    const subject = 'english';
    const questKey = data?.questKey || `english/${topicId}`;

    useEffect(() => {
        const loadQuestions = async () => {
            if (fetchIterationRef.current === topicId) return;
            fetchIterationRef.current = topicId;

            setIsLoading(true);
            dispatch(resetSession());
            preloadCurriculum();
            
            try {
                const allQuestions = await fetchEnglishQuestions(topicId);
                allBankRef.current = allQuestions;
                
                const mapping = allQuestions.find(q => q.mapping)?.mapping;
                const simulations = [];

                // 1. Load Mandatory Story (for EXPLORE)
                if (nodeType === 'EXPLORE' && mapping && mapping.json_reference_path) {
                    try {
                        const { steps } = await loadQuestSteps(
                            subject,
                            data.unitId || 'holidays',
                            topicId,
                            mapping.json_reference_path
                        );
                        steps.forEach(s => {
                            s.isSimulation = true;
                            s.engine_type = s.engineType || mapping.engine_type;
                        });
                        simulations.push(...steps);
                    } catch (e) {
                        console.warn(`[EnglishEngine] Failed to load story quest: ${e.message}`);
                    }
                }

                // 2. Load Interleaved Simulations (for PRACTICE/REINFORCE/MASTERY)
                if (data?.simResources && data.simResources.length > 0) {
                    console.log(`🎮 [EnglishEngine] Loading ${data.simResources.length} simulation resources...`);
                    for (const simRes of data.simResources) {
                        try {
                            const fileName = simRes.file.endsWith('.json') ? simRes.file : `${simRes.file}.json`;
                            const { steps: simSteps } = await loadQuestSteps(
                                subject, 
                                data.unitId || 'holidays', 
                                topicId, 
                                fileName
                            );
                            simSteps.forEach(s => {
                                s.isSimulation = true;
                                s.id = s.id || `sim_${simRes.file.replace('.json', '')}`;
                            });
                            simulations.push(...simSteps);
                        } catch (e) {
                            console.warn(`[EnglishEngine] Failed to load interleaved sim: ${simRes.file}`);
                        }
                    }
                }

                if (allQuestions.length === 0 && simulations.length === 0) {
                    throw new Error(`No content found for "${topicId}"`);
                }

                const userHistory = await ManyaDB.getAnswerHistory(subject);
                const quest = await generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, userHistory, simulations);
                setQuestions(quest.questions);
                setQuestMeta({ ...quest, mapping });
                
                setTimeout(() => setIsLoading(false), 800);
            } catch (err) {
                console.error("🔥 [EnglishEngine] Load Crash:", err);
                setRenderError(err);
                setIsLoading(false);
            }
        };

        loadQuestions();
    }, [topicId, nodeType, data?.simResources]);

    const findRephrased = (wrongQuestion) => {
        const bank = allBankRef.current;
        const baseId = wrongQuestion.qid?.replace(/-V\d+$/, '');
        const usedIds = new Set(questions.map(q => q.qid));
        const variant = bank.find(q => q.qid.startsWith(baseId + '-V') && !usedIds.has(q.qid));
        if (variant) return { ...variant, isRephrased: true, originalId: wrongQuestion.qid };
        return null;
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
        
        // SUPPORT: Both literal matches and "Option_A" style mappings from DB
        let isCorrect = selectedOption === q.answer;
        if (!isCorrect && q.answer?.startsWith('Option_')) {
            const letter = q.answer.split('_')[1]; // Get 'A', 'B', etc.
            const index = letter.charCodeAt(0) - 65; // A=0, B=1, ...
            if (q.options[index] === selectedOption) isCorrect = true;
        }

        const timeSpentMs = Date.now() - questionStartTime.current;

        if (isCorrect) {
            setScore(s => s + 1);
            window.ManyaAudio?.success?.();
            if (q.isRephrased) resolveRephrased(subject, q.qid); // Use qid for sync
        } else {
            window.ManyaAudio?.error?.();
            trackWrongAnswer(subject, q.qid);
            const rephrased = findRephrased(q);
            if (rephrased) setQuestions(prev => [...prev, rephrased]);
        }

        dispatch(updateSessionAfterAnswer({ isCorrect, timeSpentMs, hintUsed, answerChanged }));
        const frustration = calculateFrustration(session);
        
        ManyaDB.recordAnswer(subject, { 
            questionId: q.qid, 
            isCorrect, 
            selectedAnswer: selectedOption, 
            correctAnswer: q.answer, 
            timeSpentMs, 
            hintUsed,
            answerChanged,
            changeCount,
            engine_type: 'MCQ', 
            frustrationLevel: frustration?.score || 0 
        });
        
        syncService.pushAnswer(subject, { 
            questionId: q.qid, 
            isCorrect, 
            timeSpentMs, 
            hintUsed,
            engine_type: 'MCQ' 
        });

        if (isCorrect) {
            const amount = 4;
            dispatch(awardGems({ subject, amount, xp: 10 }));
            setGemsEarned(g => g + amount);
            setShowGemToast(true);
            setTimeout(() => setShowGemToast(false), 1500);
            setTimeout(() => nextQuestion(), 1000);
        } else {
            setTimeout(() => setShowExplanation(true), 600);
        }
    };

    const nextQuestion = (simResults = null) => {
        if (currentIdx < questions.length - 1) {
            const nextIdx = currentIdx + 1;
            setCurrentIdx(nextIdx);
            setSelectedOption(null);
            setIsAnswered(false);
            setShowExplanation(false);
            setHintUsed(false);
            setAnswerChanged(false);
            setChangeCount(0);
            firstSelection.current = null;
            questionStartTime.current = Date.now();
            
            // If the next step is a simulation, we don't need a delay
            if (questions[nextIdx]?.isSimulation) {
                // Instantly move
            }
        } else if (!isFinished) {
            setIsFinished(true);
            const pureMcqs = questions.filter(q => !q.isSimulation);
            
            // Unified Mastery: MCQs + Simulations (Sims count for 2x MCQ weight in English)
            const mcqScore = (score / Math.max(1, pureMcqs.length)) * 100;
            const simCount = questions.filter(q => q.isSimulation).length;
            const mastery = simCount > 0 && nodeType === 'EXPLORE' ? 100 : Math.round(mcqScore);

            const result = saveNodeCompletion(subject, questKey, nodeType, mastery);
            setJustFinished({ subject, questKey, nodeType, mastery, unlocked: result.unlocked, nextNode: result.nextNode });
            setCompletionResult({ mastery, ...result, score, total: questions.length });
            setShowCompletion(true);
            
            if (mastery >= 60) window.ManyaAudio?.victory?.();
        }
    };

    // ── PREMIUM RENDERING ──

    if (isLoading) return (
        <div className="flex-1 flex flex-col items-center justify-center bg-indigo-50/30">
            <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-indigo-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <BookOpen className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={32} />
            </div>
            <p className="text-indigo-900 font-black tracking-widest text-xs uppercase animate-pulse">Initializing English Lab...</p>
        </div>
    );

    if (renderError) return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-rose-50">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <AlertCircle size={32} />
            </div>
            <h3 className="text-2xl font-black text-rose-900 mb-2">Engine Glitch</h3>
            <p className="text-sm text-rose-800/60 font-bold mb-8">"{renderError.message}"</p>
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-xl">RELOAD</button>
        </div>
    );

    if (showCompletion && completionResult) return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-600 to-purple-700 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-500/20 blur-[100px] rounded-full" />
            
            <div className="w-full max-w-sm bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[3rem] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    {completionResult.mastery >= 60 ? <Trophy className="text-amber-400" size={48} /> : <Zap className="text-indigo-300" size={48} />}
                </div>
                <h2 className="text-white text-3xl font-black mb-2 uppercase tracking-tight">{completionResult.mastery >= 60 ? 'Excellence!' : 'Keep Pushing'}</h2>
                <p className="text-indigo-200 text-sm font-bold mb-8">Node: {nodeType}</p>
                <div className="text-6xl font-black text-white mb-10 drop-shadow-lg">{completionResult.mastery}%</div>
                
                <button onClick={onComplete} className="w-full h-16 bg-white text-indigo-900 rounded-2xl font-black text-sm tracking-widest shadow-xl active:scale-95 transition-all">
                    COLLECT TREASURE
                </button>
            </div>
        </div>
    );

    const q = questions[currentIdx];
    if (!q) return null;

    if (q.isSimulation) {
        return (
            <div className="flex-1 flex flex-col relative bg-white">
                {/* HUD for simulations (minimal) */}
                {nodeType !== 'EXPLORE' && (
                    <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
                        <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border border-slate-100 flex items-center gap-2 shadow-sm">
                            <Puzzle size={14} className="text-indigo-600" />
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">Skill Drill</span>
                        </div>
                        <div className="bg-indigo-600 px-3 py-1.5 rounded-full text-white text-[10px] font-black shadow-lg">
                            {currentIdx + 1} / {questions.length}
                        </div>
                    </div>
                )}
                <SimulatorBridge step={q} onComplete={nextQuestion} nodeType={nodeType} />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-indigo-50/50 relative overflow-hidden">
            {/* ── GEM TOAST ── */}
            {showGemToast && (
                <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-black animate-bounce z-[100] flex items-center gap-1 pointer-events-none shadow-lg">
                    <Trophy size={12} /> +{gemsEarned} gems
                </div>
            )}

            {/* ── MAIN CONTENT AREA ── */}
            <div className="flex-1 flex flex-col px-4 pt-4 overflow-hidden">

                {/* 1. Progress Dots (Standard) */}
                <div className="flex gap-1.5 justify-center mb-5 overflow-x-auto no-scrollbar flex-shrink-0">
                    {questions.map((_, i) => (
                        <div 
                            key={i} 
                            className={`h-1.5 rounded-full transition-all duration-300 shrink-0 ${
                                i === currentIdx ? 'bg-indigo-600 w-5' : (i < currentIdx ? 'bg-indigo-600 opacity-35 w-1.5' : 'bg-indigo-200 w-1.5')
                            }`} 
                        />
                    ))}
                </div>

                {/* 2. Topic/Node Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-indigo-600/10 rounded-lg flex items-center justify-center">
                            <Compass size={12} className="text-indigo-600" />
                        </div>
                        <span className="text-indigo-600 font-black text-[9px] tracking-widest uppercase opacity-80">
                            {nodeType} · {currentIdx + 1}/{questions.length}
                        </span>
                    </div>
                    
                    {!isAnswered && q.hint && (
                        <button 
                            onClick={() => setHintUsed(!hintUsed)} 
                            className={`p-2 rounded-xl transition-all ${hintUsed ? 'bg-amber-500 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                        >
                            <Lightbulb size={18} />
                        </button>
                    )}
                </div>

                {/* 3. Question Card (Standard) */}
                <div 
                    className="bg-white rounded-[2.5rem] border-2 border-indigo-100 px-6 py-8 mb-4 shadow-xl shadow-indigo-200/20 flex-shrink-0 relative overflow-hidden"
                >
                    <p className="text-indigo-950 font-bold text-[18px] leading-snug m-0 relative z-10">
                        {q.question}
                    </p>
                    
                    {/* Decorative Background Icon */}
                    <div className="absolute -bottom-4 -right-4 opacity-[0.03] pointer-events-none">
                        <BookOpen size={120} />
                    </div>
                </div>

                {/* 4. Options (Standard A,B,C,D) */}
                <div className="flex flex-col gap-2.5 flex-shrink-0">
                    {q.options?.map((opt, i) => {
                        const isCorrect = opt === q.answer || (q.answer?.startsWith('Option_') && q.answer.split('_')[1].charCodeAt(0) - 65 === i);
                        const isSelected = opt === selectedOption;

                        let cls = 'mcq-fe-btn';
                        if (isAnswered) {
                            if (isCorrect)          cls += ' mcq-fe-correct';
                            else if (isSelected)    cls += ' mcq-fe-wrong';
                            else                    cls += ' mcq-fe-faded';
                        } else if (isSelected) {
                            cls += ' mcq-fe-selected';
                        }

                        // Apply subject theme overrides
                        const btnStyle = isSelected && !isAnswered ? { backgroundColor: '#4f46e5', borderColor: '#4338ca', color: 'white' } : {};

                        return (
                            <button
                                key={i}
                                className={cls}
                                style={btnStyle}
                                onClick={() => handleSelect(opt)}
                                disabled={isAnswered}
                            >
                                <span className={`mcq-fe-letter ${isSelected && !isAnswered ? 'bg-white/20 text-white' : ''}`}>
                                    {String.fromCharCode(65 + i)}
                                </span>
                                <span className="mcq-fe-text">{opt}</span>
                                {isAnswered && isCorrect    && <Check size={16} className="mcq-fe-icon correct-icon text-emerald-500" strokeWidth={3} />}
                                {isAnswered && isSelected && !isCorrect && <X size={16} className="mcq-fe-icon wrong-icon text-rose-500" strokeWidth={3} />}
                            </button>
                        );
                    })}
                </div>

                {/* 5. Hint Box */}
                {hintUsed && !isAnswered && (
                    <div className="mt-4 bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 animate-in slide-in-from-bottom-2 duration-300 flex-shrink-0 shadow-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <Lightbulb size={13} className="text-amber-500" />
                            <span className="font-black text-amber-600 text-[9px] tracking-widest uppercase">Expert Tip</span>
                        </div>
                        <p className="text-indigo-900 font-bold text-[13px] leading-relaxed m-0">{q.hint}</p>
                    </div>
                )}

                {/* 6. Submit Button */}
                {!isAnswered && (
                    <button
                        onClick={handleSubmit}
                        disabled={selectedOption === null}
                        className={`mt-auto mb-6 w-full h-14 rounded-[2rem] font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 flex-shrink-0 shadow-2xl ${
                            selectedOption !== null
                                ? 'bg-indigo-600 text-white shadow-indigo-500/30 active:scale-95'
                                : 'bg-white text-slate-300 border border-slate-100 cursor-not-allowed'
                        }`}
                    >
                        SUBMIT ANSWER <Zap size={14} fill={selectedOption ? "currentColor" : "none"} />
                    </button>
                )}
            </div>

            {/* ── WRONG: ABSOLUTE SOLUTION PORTAL (Standard) ── */}
            {isAnswered && selectedOption !== q.answer && showExplanation && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div 
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl" 
                        onClick={nextQuestion}
                    />

                    <div className="relative w-full max-w-md z-[10000] rounded-[3rem] overflow-hidden bg-white shadow-[0_40px_100px_-10px_rgba(0,0,0,0.5)] border border-indigo-100 p-8 flex flex-col animate-in zoom-in-95 duration-300">
                        {/* Status Icon */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center flex-shrink-0 border border-rose-100">
                                <X size={24} strokeWidth={3} />
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-slate-900 leading-tight">Keep Practicing!</h4>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Knowledge Deep Dive</p>
                            </div>
                        </div>

                        {/* Concept Card */}
                        <div className="bg-indigo-50 rounded-[2rem] p-6 mb-8 border border-indigo-100 flex flex-col gap-4">
                            <div className="flex items-center gap-3 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                                <Sparkles size={14} /> The Correct Path
                            </div>
                            <div className="bg-white rounded-2xl p-4 text-emerald-600 font-black text-sm border border-emerald-100 shadow-sm">
                                {q.answer}
                            </div>
                            <p className="text-indigo-900 font-bold text-sm leading-relaxed p-2">
                                {q.explanation || "After 'going to', we use the base form of the verb. 'Revise' is the correct base form here."}
                            </p>
                        </div>

                        {/* Action */}
                        <button
                            onClick={nextQuestion}
                            className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            GOT IT <ArrowRight size={18} strokeWidth={3} />
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
