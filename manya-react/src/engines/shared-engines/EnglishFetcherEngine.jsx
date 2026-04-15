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
import { getLoadingConfig, getRandomFact } from '../../config/loadingData';
import CelebrationView from './CelebrationView';
import { ENGINE_REGISTRY } from '../../utils/engineRouter';
import { calculateUSP } from '../../utils/scoringUtility';
import '../../styles/mcq-engine.css';

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

    // PRESERVE ROW METADATA: Use 'step' directly for engine mapping because 'simData'
    // (the interaction_config) often lacks row-level metadata like engine_type.
    let engineType = (step.engine_type || step.engineType || simData.engine_type || simData.engineType || simData.type || 'CHAT').toUpperCase();
    const itemType = (step.item_type || simData.item_type || "").toUpperCase();
    
    // GHOST HUNTER LOGGING
    console.warn(`[Ghost Hunter] Bridge received step. id: ${step.id || step.qid}, itemType: ${itemType}, rawEngineType: ${step.engine_type}, simData.type: ${simData.type}, derivedEngine: ${engineType}`);

    if (engineType === 'CHAT' && nodeType !== 'EXPLORE' && !simData.text) {
        console.error(`[Ghost Hunter] Blocked Ghost Chat! It has no text and is outside Explore. Skipping automatically.`);
        // Force an auto-skip using a zero timeout to avoid state mutation during render
        setTimeout(() => onComplete({ isCorrect: true, score: 100, accuracy: 1 }), 100);
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-rose-500 font-bold bg-white">
                <AlertCircle size={40} className="mb-4" />
                Blocking a Ghost Story (Auto-skipping...)
            </div>
        );
    }
    
    // PEDAGOGICAL ROUTING: Ensure Grammar/Notes use the RuleMaster
    if (engineType.includes('RULE_MASTER') || itemType === 'GRAMMAR' || itemType === 'NOTE') {
        engineType = 'ENGLISH_RULE_MASTER';
    }
    if (engineType.includes('WORDGRID')) engineType = 'WORDGRID_ENGINE';
    if (engineType.includes('HARVEST')) engineType = 'HARVEST_GAME';
    if (engineType === 'SENTENCE_BLOCKS' || engineType === 'SYNTAX_ARCHITECT') engineType = 'SENTENCE_BLOCKS';
    if (engineType === 'GARDEN_GUARD' || engineType === 'GRAMMAR_GUARD') engineType = 'GARDEN_GUARD';
    if (engineType === 'PUNCTUATION_STICKERS') engineType = 'PUNCTUATION_STICKERS';
    if (engineType === 'TENSE_TREEHOUSE') engineType = 'TENSE_TREEHOUSE';

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

    // CUSTOM THEME: Stories (Explore/Quest) get an immersive "Dark Narrative" feel
    const isNarrative = engineType === 'CHAT' || nodeType === 'EXPLORE' || itemType === 'QUEST' || itemType === 'QUEST_STORY';

    return (
        <div className={`flex-1 flex flex-col h-full min-h-[85vh] ${isNarrative ? 'bg-slate-950 text-white' : 'bg-white'}`}>
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
                        onComplete({ 
                            success: res?.isCorrect ?? true, 
                            score: res?.score ?? 100, 
                            accuracy: res?.accuracy ?? 1,
                            simResults: res 
                        });
                    }}
                    onResult={(res) => console.debug(`📊 [Bridge] ${engineType} update:`, res)}
                    onAttempt={onAttempt}
                />
            </Suspense>
        </div>
    );
};

/**
 * MANYA ENGLISH FETCHER ENGINE v5.1 (ADAPTIVE REWARD EDITION)
 */
export default function EnglishFetcherEngine({ data, onComplete, onResult }) {
    const dispatch = useDispatch();
    const user = useSelector(state => state.user.data);
    const session = useSelector(state => state.user.session);
    const globalTheme = useSelector(state => state.audio);

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
    
    const [hintUsed, setHintUsed] = useState(false);
    const [answerChanged, setAnswerChanged] = useState(false);
    const [changeCount, setChangeCount] = useState(0);
    const firstSelection = useRef(null);

    const questionStartTime = useRef(Date.now());
    const fetchIterationRef = useRef(null);
    const allBankRef = useRef([]);

    // ─── RESCUE RECAP STATE (v5.0) ───
    const [recapSteps, setRecapSteps] = useState([]);    // Loaded recap sim steps (held, not in queue)
    const consecutiveWrongRef = useRef(0);                // Local tracker for real-time recap trigger
    const recapUsedIndexRef = useRef(0);                  // Tracks which recap we've used

    const topicId = data?.topic || 'default';
    const nodeType = data?.nodeType || 'PRACTICE';
    const subject = 'english';
    const questKey = data?.questKey || `english/${topicId}`;

    // ── LEVEL 1.0 HUD METADATA ──
    const NODE_METADATA = {
        WARMUP: { label: 'Warmup', icon: <Zap size={14} />, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
        EXPLORE: { label: 'Story', icon: <BookOpen size={14} />, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' },
        PRACTICE: { label: 'Practice', icon: <Layers size={14} />, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        REINFORCE: { label: 'Reinforce', icon: <Sparkles size={14} />, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
        MASTERY: { label: 'Mastery', icon: <Trophy size={14} />, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' }
    };
    const nodeMeta = NODE_METADATA[nodeType] || NODE_METADATA.PRACTICE;
    const questTitle = topicId.replace(/^quest_\d+_/, '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const isNight = globalTheme?.isNightMode;
    const currentQ = questions[currentIdx];
    const engineType = (currentQ?.engine_type || currentQ?.engineType || currentQ?.type || "").toUpperCase();
    const isNarrative = nodeType === 'EXPLORE' || engineType === 'CHAT' || engineType.includes('STORY') || isNight;

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
                
                const userHistory = await ManyaDB.getAnswerHistory(subject);

                // ── 3b. Pre-load Recap Resources (held separately for 3-consecutive-wrong rescue) ──
                const recapCandidates = [];
                if (data?.recapResources && data.recapResources.length > 0) {
                    console.log(`📖 [EnglishEngine] Pre-loading ${data.recapResources.length} recap resources for rescue...`);
                    for (const recapRes of data.recapResources) {
                        try {
                            const fileName = recapRes.file.endsWith('.json') ? recapRes.file : `${recapRes.file}.json`;
                            const { steps: rSteps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                            rSteps.forEach((s, idx) => {
                                s.isSimulation = true;
                                s.isRecap = true;
                                s.id = s.id || `recap_${recapRes.file.replace('.json', '')}_${idx}`;
                            });
                            recapCandidates.push(...rSteps);
                        } catch (e) {
                            console.warn("[EnglishEngine] Failed to load recap:", recapRes.file);
                        }
                    }
                    setRecapSteps(recapCandidates);
                    console.log(`✅ [EnglishEngine] ${recapCandidates.length} recap steps ready for rescue.`);
                }

                const quest = await generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, userHistory);
                
                // 🚀 PRE-FLATTEN STORIES: If the quest is a STORY unit, expand its steps immediately
                let finalQuestions = quest.questions;
                console.log("🕵️ [Tracer] Explore Node questions[0]:", finalQuestions[0]);

                if (nodeType === 'EXPLORE' && finalQuestions.length > 0) {
                    const storyAnchor = finalQuestions[0];
                    const stepsToFlatten = storyAnchor.steps || storyAnchor.data?.steps;
                    const cdnUrl = storyAnchor.cdn_url || storyAnchor.data?.cdn_url;

                    console.log("🕵️ [Tracer] Flatten Check:", { hasSteps: !!stepsToFlatten, hasCdn: !!cdnUrl });

                    if (stepsToFlatten && stepsToFlatten.length > 0) {
                         finalQuestions = stepsToFlatten.map(s => ({ ...s, item_type: 'QUEST_STORY' }));
                    } else {
                        try {
                            const qid = storyAnchor.qid || storyAnchor.id;
                            console.log(`📡 [EnglishEngine] Fetching Story Steps for ${qid}...`);
                            const loaded = await loadQuestSteps('english', null, null, qid);
                            
                            if (loaded && loaded.steps) {
                                console.log(`✅ [EnglishEngine] Flattened ${loaded.steps.length} steps from CDN.`);
                                finalQuestions = loaded.steps.map(s => ({ 
                                    ...s, 
                                    item_type: 'QUEST_STORY',
                                    isSimulation: true // Force routing to Bridge
                                }));
                            } else {
                                console.warn(`⚠️ [EnglishEngine] CDN Quest loaded but no steps found.`, loaded);
                            }
                        } catch (loadErr) {
                            console.error("[EnglishEngine] Failed to flatten story steps:", loadErr);
                        }
                    }
                }

                setQuestions(finalQuestions);
                setQuestMeta({ ...quest.metadata, questLength: finalQuestions.length });
                
                setTimeout(() => setIsLoading(false), 800);
            } catch (err) {
                console.error("🔥 [EnglishEngine] Load Crash:", err);
                setRenderError(err);
                setIsLoading(false);
            }
        };

        loadQuestions();
    }, [topicId, nodeType]);

    // ── ROBUST ANSWER VERIFICATION ──
    const verifyAnswer = (selected, correct, options) => {
        if (selected === undefined || selected === null || correct === undefined || correct === null) return false;
        
        const clean = str => String(str || "").trim().toLowerCase().replace(/\u00A0/g, ' ');
        const sel = clean(selected);
        
        // 🔍 OPTION_X STRIPPER: Handle "Option_B", "Option B", "option_b"
        const ans = clean(correct).replace(/^option[ _]?/i, ''); 

        // 1. Direct Text/Key Match (e.g. 'Southern Hemisphere' === 'Southern Hemisphere' or 'B' === 'B')
        if (sel === ans) return true;

        // 2. Index/Letter Mapping
        const letters = ['a', 'b', 'c', 'd'];
        if (!isNaN(ans) && letters[parseInt(ans)] === sel) return true;
        
        // 3. Cross-Reference (DB says 'Option_B', User picked 'Southern Hemisphere')
        if (options) {
            // Find what the "Correct" text should be
            const correctKey = ans.toUpperCase(); 
            const correctIdx = letters.indexOf(ans);
            const correctValue = options[correctKey] || (Array.isArray(options) ? options[correctIdx] : options[ans]);
            
            if (correctValue && clean(correctValue) === sel) return true;
            
            // Check if User picked the Key but DB has the Text
            const userValue = options[selected] || (Array.isArray(options) ? options[letters.indexOf(sel)] : null);
            if (userValue && clean(userValue) === ans) return true;
        }

        return false;
    };

    const handleSubmit = () => {
        if (isAnswered || selectedOption === null) return;
        setIsAnswered(true);

        const q = questions[currentIdx];
        const isCorrect = verifyAnswer(selectedOption, q.answer, q.options);

        const timeSpentMs = Date.now() - questionStartTime.current;

        if (isCorrect) {
            setScore(s => s + 1);
            window.ManyaAudio?.success?.();
            
            // Reset consecutive wrong counter on correct answer
            consecutiveWrongRef.current = 0;
        } else {
            window.ManyaAudio?.error?.();
            trackWrongAnswer(subject, q.qid || q.id);

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

        dispatch(updateSessionAfterAnswer({ isCorrect, timeSpentMs, hintUsed, answerChanged }));
        const frustration = calculateFrustration(session);
        
        ManyaDB.recordAnswer(subject, { 
            questionId: q.qid || q.id, 
            isCorrect, 
            timeSpentMs, 
            engine_type: 'MCQ', 
            frustrationLevel: frustration?.score || 0 
        });

        if (isCorrect) {
            // REWARD LOGIC: 2x Gems/XP for Simulations and Rescue Items
            const isSim = q.isSimulation || q.item_type === 'SIMULATION';
            const amount = isSim ? 8 : 4;
            const xp = isSim ? 20 : 10;
            
            dispatch(awardGems({ subject, amount, xp }));
            setGemsEarned(g => g + amount);
            setShowGemToast(true);
            setTimeout(() => setShowGemToast(false), 1500);
            setTimeout(() => nextQuestion(), 1000);
        } else {
            setTimeout(() => setShowExplanation(true), 600);
        }
    };

    const nextQuestion = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
            setShowExplanation(false);
            setHintUsed(false);
            setAnswerChanged(false);
            setChangeCount(0);
            firstSelection.current = null;
            questionStartTime.current = Date.now();
        } else if (!isFinished) {
            setIsFinished(true);
            const pureMcqs = questions.filter(q => !q.isSimulation);
            const mcqScore = (score / Math.max(1, pureMcqs.length)) * 100;
            const mastery = Math.round(mcqScore);

            const result = saveNodeCompletion(subject, questKey, nodeType, mastery);
            setJustFinished({ subject, questKey, nodeType, mastery, unlocked: result.unlocked });
            setCompletionResult({ mastery, ...result, score, total: questions.length });
            setShowCompletion(true);
            if (mastery >= 60) window.ManyaAudio?.victory?.();
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
            type: 'adaptive_english',
        });
        onComplete?.();
    };

    if (isLoading) {
        const cfg = getLoadingConfig('english');
        const randomFact = getRandomFact('english');
        
        return (
            <div className="quest-loading-overlay" style={{ '--loader-color': cfg.color, '--loader-dark': cfg.colorDark, '--loader-bg': cfg.bgLight }}>
                {/* Ambient Glow Blobs */}
                <div className="loader-blob loader-blob-1" style={{ background: cfg.color }} />
                <div className="loader-blob loader-blob-2" style={{ background: cfg.color }} />

                <div className="loader-content-card">
                    {/* Mascot Hero */}
                    <div className="loader-mascot-ring" style={{ borderColor: cfg.color }}>
                        <img src={cfg.mascot} alt="Polly" className="loader-mascot-img" />
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

    // ── COMPLETION SCREEN ──
    if (showCompletion && completionResult) {
        return (
            <CelebrationView
                subject="English"
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
    const q = questions[currentIdx];
    if (!q) return null;
    
    const frustration = calculateFrustration(session);

        if (q.isSimulation || q.item_type === 'QUEST_STORY') {
            return (
                <div className={`flex-1 min-h-0 flex flex-col relative h-full ${isNarrative ? 'bg-[#0B0E14]' : 'bg-slate-50'}`}>
                    {q.message && (
                        <div className="absolute top-20 left-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-1000">
                            <div className="bg-indigo-600 text-white px-6 py-4 rounded-3xl shadow-2xl font-black text-sm text-center border-2 border-indigo-400">
                                {q.message}
                            </div>
                        </div>
                    )}
                    <SimulatorBridge step={q} onComplete={nextQuestion} nodeType={nodeType} />
                </div>
            );
        }

        // ─── RENDER-SCOPE SMART MATCHING (v5.2) ───
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
            if (optMatch) { const idx = optMatch[1].toUpperCase().charCodeAt(0) - 65; return normalize(options[idx]) === o; }
            if (t.length === 1 && /^[a-d]$/i.test(t)) { const idx = t.toUpperCase().charCodeAt(0) - 65; return normalize(options[idx]) === o; }
            return false;
        };
        const correctText = resolveCorrectText(q.answer, q.options);
        const userWasCorrect = isOptionCorrect(selectedOption, q.answer, q.options);

        return (
            <div className="flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden relative" style={{ maxHeight: '100%' }}>
                {/* ── GEM TOAST ── */}
                {showGemToast && (
                    <div className="absolute top-4 right-4 bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-black animate-bounce z-20 flex items-center gap-1 pointer-events-none shadow-xl">
                        <Trophy size={12} /> +{gemsEarned} gems
                    </div>
                )}

                {/* ── QUESTION CARD ── */}
                <div className="flex-1 flex flex-col px-4 pt-4 overflow-hidden">

                    {/* Progress dots */}
                    <div className="flex gap-1.5 justify-center mb-5 overflow-x-auto no-scrollbar flex-shrink-0">
                        {questions.map((_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 shrink-0 ${i === currentIdx ? 'bg-indigo-600 w-5' : (i < currentIdx ? 'bg-indigo-600 opacity-35 w-1.5' : 'bg-slate-200 w-1.5')}`} />
                        ))}
                    </div>

                    {/* Rephrased / frustration nudge */}
                    {q.isRephrased && (
                        <div className="text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2 font-bold mb-3 text-center flex-shrink-0">
                            🔄 Let's try this rule again with different words
                        </div>
                    )}
                    {frustration?.level === 'high' && (
                        <div className="text-xs text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2 font-bold mb-3 text-center flex-shrink-0">
                            💡 Remember to check the subject and verb agreement!
                        </div>
                    )}

                    {/* ── QUESTION TEXT (Themed) ── */}
                    <div 
                        className="bg-[var(--bg-card)] rounded-[2rem] border-[4.5px] border-[var(--sub-theme-bg)] px-6 py-6 mb-4 shadow-xl flex-shrink-0 relative"
                        style={{ '--sub-theme-bg': '#f472b6', '--sub-theme-border': '#db2777' }}
                    >
                        <div className="toy-card-gloss" />
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                                    <Compass size={12} className="text-indigo-600" />
                                </div>
                                <span className="text-indigo-600 font-black text-[9px] tracking-widest uppercase opacity-80">
                                    {nodeType === 'WARMUP' ? '🌅 Warm-up' : nodeType === 'MASTERY' ? '⚡ Mastery' : 'English Practice'} · {currentIdx + 1}/{questions.length}
                                </span>
                            </div>

                            {questMeta?.gameMode === 'quickfire' && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                                    <Zap size={10} /> QUICKFIRE
                                </div>
                            )}
                            
                            {/* 💡 TOP-RIGHT LIGHTBULB HINT TOGGLE (Floating v2.0) */}
                            {!isAnswered && q.hint && (
                                <div className="relative">
                                    <button 
                                        key="hint-btn" 
                                        onClick={() => setHintUsed(!hintUsed)} 
                                        className={`p-2 rounded-xl transition-all relative z-10 ${hintUsed ? 'bg-[var(--sub-theme-bg)] text-white shadow-lg shadow-pink-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                    >
                                        <Lightbulb size={18} />
                                    </button>

                                    {hintUsed && (
                                        <div className="mcq-hint-bubble">
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
                            {q.question || q.question_text}
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
                                    onClick={() => {
                                        setSelectedOption(opt);
                                        setHintUsed(false); // Auto-close on select (User Request Phase 2)
                                    }}
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



                    {/* ── CHECK ANSWER / CONTINUE ── */}
                    <div className="mt-auto pt-6 pb-6 w-full flex-shrink-0">
                        {!isAnswered ? (
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedOption}
                                className={`w-full h-14 rounded-full font-black text-[13px] tracking-[0.1em] uppercase transition-all flex items-center justify-center gap-2 relative overflow-hidden ${selectedOption ? 'bg-[#58cc02] hover:bg-[#46a302] text-white border-b-[4px] border-[#46a302] active:border-b-0 active:translate-y-1 shadow-[inset_0_2px_0_rgba(255,255,255,0.3)]' : 'bg-[#e5e5e5] text-[#a0a0a0] border-b-[4px] border-[#d4d4d4] cursor-not-allowed dark:bg-slate-700 dark:border-slate-800 dark:text-slate-500'}`}
                            >
                                <span className="relative z-10 flex items-center gap-2 drop-shadow-sm">SUBMIT ANSWER <Zap size={14} fill="currentColor" /></span>
                            </button>
                        ) : (
                            <div className={`w-full h-14 rounded-full border-2 flex items-center justify-center gap-2 font-black text-[11px] tracking-widest uppercase transition-all ${userWasCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                                {userWasCorrect ? (
                                    <>Brilliant! Moving on... <Check size={16} /></>
                                ) : (
                                    <>Reviewing explanation... <AlertCircle size={16} /></>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            {/* ── WRONG: EXPLANATION POPUP ── */}
            {isAnswered && selectedOption !== q.answer && showExplanation && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="bg-indigo-50 dark:bg-white/5 text-indigo-600 dark:text-indigo-400 w-16 h-16 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                            <Lightbulb size={32} />
                        </div>
                        <h4 className="text-[var(--text-main)] font-black mb-2 text-center text-xl">Let's Learn Why</h4>
                        <div className="bg-emerald-50 text-emerald-700 p-5 rounded-[2rem] font-black mb-6 border-2 border-emerald-100 text-center text-lg italic animate-in fade-in slide-in-from-bottom-2 duration-700">
                            "{correctText}"
                        </div>
                        <p className="text-[var(--text-sub)] text-base font-bold mb-8 text-center leading-relaxed">
                            {q.explanation || "Take a look at this grammar pattern. You'll get another chance to try a similar concept later in this quest!"}
                        </p>
                        <button 
                            onClick={nextQuestion} 
                            className="w-full h-16 bg-indigo-600 text-white rounded-[2rem] font-black text-xs tracking-[0.2em] uppercase shadow-xl shadow-indigo-500/40 active:scale-95 transition-all"
                        >
                            CONTINUE QUEST
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
