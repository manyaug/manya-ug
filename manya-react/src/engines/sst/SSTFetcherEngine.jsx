import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { useDispatch, useSelector } from 'react-redux';
import { 
    updateProfile, awardGems, addXP, resetSession, 
    updateSessionAfterAnswer 
} from '../../store/userSlice';

// Services & Utils
import { fetchSstQuestions } from '../../services/sstMockDB';
import { syncService } from '../../infrastructure/sync/syncService.js';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import { ManyaDB } from '../../infrastructure/db/manyaDB.js';
import { calculateFrustration } from '../../domain/psych/psychTracker.js';
import { achievementService } from '../../services/achievementService';
import { preloadCurriculum } from '../../services/curriculumService';
import { loadQuestSteps } from '../../utils/questLoader';
import { getLoadingConfig, getRandomFact } from '../../config/loadingData';
import { saveNodeCompletion, trackWrongAnswer, resolveRephrased, setJustFinished } from '../../domain/progress/questProgressService.js';

// Atomic Resources
import { 
    SUPPORTED_SIM_ENGINES, getEngineType, isOptionCorrect, 
    resolveCorrectText, findRephrased 
} from './SSTLogic';
import SimulatorBridge from './SimulatorBridge';
import SSTRenderer from './SSTRenderer';
import CelebrationView from '../../views/CelebrationView.jsx';
import '../../styles/mcq-engine.css';

/**
 * MANYA SST FETCHER ENGINE v4.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates adaptive quest logic, simulation routing, and MCQ visuals.
 */
export default function SSTFetcherEngine({ data, onComplete, onResult }) {
    const dispatch = useDispatch();
    const user = useSelector(state => state.user.data);
    const session = useSelector(state => state.user.session);
    
    // State
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
    const [gemsEarned, setGemsEarned] = useState(0);
    const [showGemToast, setShowGemToast] = useState(false);
    const [showCompletion, setShowCompletion] = useState(false);
    const [completionResult, setCompletionResult] = useState(null);
    const [isFinished, setIsFinished] = useState(false);
    
    // Rescue Recap state
    const [recapSteps, setRecapSteps] = useState([]);
    const consecutiveWrongRef = useRef(0);
    const recapUsedIndexRef = useRef(0);

    const lastSimAttemptRef = useRef({ time: 0, label: '' });
    const allBankRef = useRef([]);
    const questionStartTime = useRef(Date.now());
    const firstSelection = useRef(null);

    const topicId = data?.topic || 'default';
    const nodeType = data?.nodeType || 'PRACTICE';
    const subject = data?.subject || 'sst';
    const questKey = data?.questKey || `sst/${topicId}`;

    // --- 🪄 INITIALIZATION ---
    useEffect(() => {
        const loadQuestions = async () => {
            setIsLoading(true);
            dispatch(resetSession());
            preloadCurriculum();

            try {
                const simCandidates = [];
                if (data?.simResources) {
                    for (const simRes of data.simResources) {
                        try {
                            const fileName = simRes.file.endsWith('.json') ? simRes.file : `${simRes.file}.json`;
                            const targetType = nodeType === 'EXPLORE' ? 'NOTE' : 'SIMULATION';
                            const { steps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName, targetType);
                            steps.forEach((s, idx) => {
                                const eType = getEngineType(s);
                                s.isSimulation = SUPPORTED_SIM_ENGINES.includes(eType);
                                s.id = s.id || `sim_${simRes.file.replace('.json', '')}_${idx}`;
                            });
                            simCandidates.push(...steps);
                        } catch (e) { console.warn(`[SSTEngine] Sim Error: ${e.message}`); }
                    }
                }

                const recapCandidates = [];
                if (data?.recapResources) {
                    for (const recapRes of data.recapResources) {
                        try {
                            const fileName = recapRes.file.endsWith('.json') ? recapRes.file : `${recapRes.file}.json`;
                            const { steps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                            steps.forEach((s, idx) => {
                                const eType = getEngineType(s);
                                s.isSimulation = SUPPORTED_SIM_ENGINES.includes(eType);
                                s.isRecap = true;
                                s.id = s.id || `recap_${recapRes.file.replace('.json', '')}_${idx}`;
                            });
                            recapCandidates.push(...steps);
                        } catch (e) { console.warn(`[SSTEngine] Recap Error: ${e.message}`); }
                    }
                    setRecapSteps(recapCandidates);
                }

                let allQuestions = [];
                try {
                    const raw = await fetchSstQuestions(topicId);
                    allQuestions = raw.map(q => ({ ...q, id: String(q.id || q.qid) }));
                } catch (dbErr) { console.warn(`[SSTEngine] DB fetch failed: ${dbErr.message}`); }
                allBankRef.current = allQuestions;

                if (allQuestions.length === 0 && simCandidates.length === 0) {
                    setIsLoading(false); return;
                }

                const userHistory = await ManyaDB.getAnswerHistory(subject);
                let finalQuestions;
                if (allQuestions.length > 0) {
                    const quest = await generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, userHistory, simCandidates);
                    finalQuestions = quest.questions;
                } else {
                    finalQuestions = [...simCandidates].sort(() => 0.5 - Math.random());
                }
                
                setQuestions(finalQuestions);
                setTimeout(() => setIsLoading(false), 300);
            } catch (err) { setRenderError(err); setIsLoading(false); }
        };
        loadQuestions();
    }, [topicId, nodeType, questKey]);

    // --- 🧠 HANDLERS ---
    const handleSelect = (option) => {
        if (isAnswered) return;
        setHintUsed(false);
        if (selectedOption !== null && selectedOption !== option) {
            setAnswerChanged(true); setChangeCount(c => c + 1);
        }
        if (!firstSelection.current) firstSelection.current = option;
        setSelectedOption(option);
        audioService.pop?.();
    };

    const handleSubmit = () => {
        if (isAnswered || selectedOption === null) return;
        setIsAnswered(true);

        const q = questions[currentIdx];
        const isCorrect = isOptionCorrect(selectedOption, q.answer, q.options);
        const timeSpentMs = Date.now() - questionStartTime.current;

        if (isCorrect) {
            setScore(s => s + 1);
            audioService.success?.();
            if (q.isRephrased) resolveRephrased(subject, q.originalId);
            consecutiveWrongRef.current = 0;
        } else {
            audioService.error?.();
            trackWrongAnswer(subject, q.id);
            const rephrased = findRephrased(q, allBankRef.current, questions);
            if (rephrased) setQuestions(prev => [...prev, rephrased]);

            consecutiveWrongRef.current += 1;
            if (consecutiveWrongRef.current >= 3 && recapSteps.length > 0 && nodeType !== 'WARMUP') {
                const recapIdx = recapUsedIndexRef.current % recapSteps.length;
                const recapToInject = { ...recapSteps[recapIdx] };
                recapUsedIndexRef.current += 1; consecutiveWrongRef.current = 0;
                setQuestions(prev => {
                    const copy = [...prev]; copy.splice(currentIdx + 1, 0, recapToInject); return copy;
                });
            }
        }

        dispatch(updateSessionAfterAnswer({ isCorrect, hintUsed, answerChanged, timeSpentMs }));
        const frustration = calculateFrustration(session);
        const baseId = q.id?.replace(/-V\d+$/, '') || q.id;

        const log = { questionId: q.id, isCorrect, selectedAnswer: selectedOption, correctAnswer: q.answer, timeSpentMs, hintUsed, answerChanged, changeCount, pool: q.isPLE ? 'yes' : 'no', concept_id: baseId, variant: q.id?.includes('-V') ? 'V' + q.id.split('-V')[1] : 'V0', engine_type: 'MCQ', frustrationLevel: frustration?.score || 0 };
        ManyaDB.recordAnswer(subject, log);
        syncService.pushAnswer(subject, log);

        const streakMultiplier = (user.current_streak >= 7) ? 2.0 : (user.current_streak >= 5) ? 1.5 : (user.current_streak >= 3) ? 1.2 : 1.0;
        const totalGems = isCorrect ? Math.floor((hintUsed ? 1 : 4) * streakMultiplier) : 0;

        if (isCorrect) {
            dispatch(awardGems({ subject, amount: totalGems, xp: hintUsed ? 5 : 10 }));
            setGemsEarned(g => g + totalGems); setShowGemToast(true);
            setTimeout(() => setShowGemToast(false), 1500);
            setTimeout(() => nextQuestion(), 800);
        } else {
            setTimeout(() => setShowExplanation(true), 500);
        }
    };

    const nextQuestion = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(c => c + 1); setSelectedOption(null); setIsAnswered(false); setShowExplanation(false); setHintUsed(false); setAnswerChanged(false); setChangeCount(0); firstSelection.current = null; questionStartTime.current = Date.now();
        } else if (!isFinished) {
            setIsFinished(true);
            const mastery = Math.round((score / questions.length) * 100);
            const result = saveNodeCompletion(subject, questKey, nodeType, mastery);
            setJustFinished({ subject, questKey, nodeType, mastery, unlocked: result.unlocked, nextNode: result.nextNode });
            
            if (nodeType === 'MASTERY' && mastery >= 60) {
                const mapIndex = data?.questIndex ?? 0;
                if (mapIndex >= (user[`prog_${subject}`] || 0)) dispatch(updateProfile({ [`prog_${subject}`]: mapIndex + 1 }));
            }
            if (result.xpReward) dispatch(addXP(result.xpReward));

            const achieveCtx = { questsCompleted: (user[`prog_${subject}`] || 0) + 1, mastery, streak: user.current_streak || 0, questCompletedNoHints: session.hintCount === 0, accuracy: score / questions.length, nodeType };
            achievementService.checkAchievements(subject, achieveCtx);

            setCompletionResult({ mastery, score, total: questions.length });
            setShowCompletion(true);
        }
    };

    const handleFinish = () => {
        const mastery = completionResult?.mastery || 0;
        onResult?.({ isCorrect: mastery >= 60, score: completionResult?.score || score, total: completionResult?.total || questions.length, mastery, gemsEarned, type: 'adaptive_sst' });
        onComplete?.();
    };

    if (showCompletion && completionResult) {
        return (
            <CelebrationView subject="Social Studies" nodeType={nodeType} mastery={completionResult.mastery} score={completionResult.score} total={completionResult.total} gemsEarned={gemsEarned} onCollect={handleFinish} />
        );
    }

    const q = questions[currentIdx];
    const eType = q ? getEngineType(q) : 'MCQ';
    const isSim = SUPPORTED_SIM_ENGINES.includes(eType);

    return (
        <SSTRenderer 
            isLoading={isLoading} loadingConfig={getLoadingConfig('sst')} randomFact={getRandomFact('sst')}
            renderError={renderError} questions={questions} currentIdx={currentIdx}
            selectedOption={selectedOption} isAnswered={isAnswered} showExplanation={showExplanation}
            gemsEarned={gemsEarned} showGemToast={showGemToast} hintUsed={hintUsed} setHintUsed={setHintUsed}
            handleSelect={handleSelect} handleSubmit={handleSubmit} nextQuestion={nextQuestion} handleFinish={handleFinish}
            nodeType={nodeType} isOptionCorrect={isOptionCorrect} 
            correctText={q ? resolveCorrectText(q.answer, q.options) : ''}
            frustration={calculateFrustration(session)}
            isLast={currentIdx === questions.length - 1}
            SimulatorBridgeNode={isSim ? (
                <SimulatorBridge 
                    key={q.id || currentIdx} step={q} subject={subject}
                    onComplete={(results) => {
                        const usp = results?.usp;
                        const isSuccess = usp ? usp.isPassing : (results ? (results.score >= (results.total * 0.6) || results.isCorrect) : true);
                        const timeSpent = usp ? usp.timeSpentMs : (results?.duration || 30000);
                        dispatch(updateSessionAfterAnswer({ isCorrect: isSuccess, hintUsed: false, answerChanged: false, timeSpentMs: timeSpent }));
                        ManyaDB.recordAnswer(subject, { questionId: q.id, isCorrect: isSuccess, selectedAnswer: 'COMPLETED', correctAnswer: 'COMPLETED', timeSpentMs: timeSpent, pool: 'simulation', engine_type: q.type || 'SIMULATION' });
                        if (isSuccess) { setScore(p => p + 1); setGemsEarned(p => p + 5); }
                        nextQuestion();
                    }}
                    onAttempt={(attempt) => {
                        if (Date.now() - lastSimAttemptRef.current.time < 500) return;
                        lastSimAttemptRef.current = { time: Date.now(), label: attempt.label };
                        ManyaDB.recordAnswer(subject, { questionId: q.id, isCorrect: attempt.isCorrect, selectedAnswer: attempt.label || 'SIM_ATTEMPT', correctAnswer: 'STEP_COMPLETE', timeSpentMs: attempt.duration || 0, pool: 'simulation_step', engine_type: q.type || 'SIMULATION' });
                    }}
                />
            ) : null}
        />
    );
}
