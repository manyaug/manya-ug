import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { useDispatch, useSelector } from 'react-redux';
import { 
    updateSessionAfterAnswer, awardGems, resetSession 
} from '../../store/userSlice';
import { 
    fetchEnglishQuestions 
} from '../../services/englishMockDB';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import { ManyaDB } from '../../infrastructure/db/manyaDB.js';
import { loadQuestSteps } from '../../utils/questLoader';
import { preloadCurriculum } from '../../services/curriculumService';
import { saveNodeCompletion, trackWrongAnswer, setJustFinished } from '../../domain/progress/questProgressService.js';
import { calculateFrustration } from '../../domain/psych/psychTracker.js';
import { getLoadingConfig, getRandomFact } from '../../config/loadingData';

import EnglishRenderer from './EnglishRenderer';
import EnglishBridge from './EnglishBridge';
import CelebrationView from '../../views/CelebrationView.jsx';
import { verifyEnglishAnswer, resolveCorrectText, calculateEnglishMastery, checkRescueInjection } from './EnglishLogic';

/**
 * ENGLISH FETCHER ENGINE v6.0 (Atomic Controller)
 * --------------------------------------------------
 * - DECOUPLED: Separates adaptive logic, UI, and bridge.
 * - Optimized for production readiness with seamless transitions.
 */
export default function EnglishFetcherEngine({ data, onComplete, onResult }) {
    const dispatch = useDispatch();
    const session = useSelector(state => state.user.session);

    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [gemsEarned, setGemsEarned] = useState(0);
    const [showGemToast, setShowGemToast] = useState(false);
    const [showCompletion, setShowCompletion] = useState(false);
    const [completionResult, setCompletionResult] = useState(null);
    const [hintUsed, setHintUsed] = useState(false);

    const [recapSteps, setRecapSteps] = useState([]);
    const consecutiveWrongRef = useRef(0);
    const recapUsedIndexRef = useRef(0);

    const questionStartTime = useRef(Date.now());
    const fetchIterationRef = useRef(null);

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
                const userHistory = await ManyaDB.getAnswerHistory(subject);

                if (data?.recapResources?.length > 0) {
                    const candidates = [];
                    for (const recapRes of data.recapResources) {
                        const fileName = recapRes.file.endsWith('.json') ? recapRes.file : `${recapRes.file}.json`;
                        const { steps: rSteps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                        rSteps.forEach((s, idx) => { s.isSimulation = true; s.isRecap = true; s.id = s.id || `recap_${idx}`; });
                        candidates.push(...rSteps);
                    }
                    setRecapSteps(candidates);
                }

                const quest = await generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, userHistory);
                let finalQuestions = quest.questions;

                // Flatten Stories if Explore node
                if (nodeType === 'EXPLORE' && finalQuestions.length > 0) {
                    const storyAnchor = finalQuestions[0];
                    const loaded = await loadQuestSteps('english', null, null, storyAnchor.qid || storyAnchor.id);
                    if (loaded?.steps) finalQuestions = loaded.steps.map(s => ({ ...s, item_type: 'QUEST_STORY', isSimulation: true }));
                }

                setQuestions(finalQuestions);
                setTimeout(() => setIsLoading(false), 800);
            } catch (err) {
                setIsLoading(false);
            }
        };
        loadQuestions();
    }, [topicId, nodeType]);

    const handleSubmit = () => {
        if (isAnswered || selectedOption === null) return;
        setIsAnswered(true);

        const q = questions[currentIdx];
        const isCorrect = verifyEnglishAnswer(selectedOption, q.answer, q.options);
        const timeSpentMs = Date.now() - questionStartTime.current;

        if (isCorrect) {
            setScore(s => s + 1);
            audioService.success?.();
            consecutiveWrongRef.current = 0;
            
            const amount = q.isSimulation ? 8 : 4;
            dispatch(awardGems({ subject, amount, xp: q.isSimulation ? 20 : 10 }));
            setGemsEarned(g => g + amount);
            setShowGemToast(true);
            setTimeout(() => { setShowGemToast(false); nextQuestion(); }, 1500);
        } else {
            audioService.error?.();
            trackWrongAnswer(subject, q.qid || q.id);
            consecutiveWrongRef.current += 1;

            if (checkRescueInjection(consecutiveWrongRef.current, recapSteps, nodeType)) {
                const recapIdx = recapUsedIndexRef.current % recapSteps.length;
                setQuestions(prev => {
                    const copy = [...prev];
                    copy.splice(currentIdx + 1, 0, { ...recapSteps[recapIdx] });
                    return copy;
                });
                recapUsedIndexRef.current += 1;
                consecutiveWrongRef.current = 0;
            }
            setTimeout(() => setShowExplanation(true), 600);
        }
        dispatch(updateSessionAfterAnswer({ isCorrect, timeSpentMs }));
    };

    const nextQuestion = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
            setSelectedOption(null); setIsAnswered(false); setShowExplanation(false); setHintUsed(false);
            questionStartTime.current = Date.now();
        } else {
            const mastery = calculateEnglishMastery(score, questions.length);
            const result = saveNodeCompletion(subject, questKey, nodeType, mastery);
            setJustFinished({ subject, questKey, nodeType, mastery, unlocked: result.unlocked });
            setCompletionResult({ mastery, score, total: questions.length });
            setShowCompletion(true);
            if (mastery >= 60) audioService.victory?.();
        }
    };

    if (isLoading) {
        const cfg = getLoadingConfig('english');
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6" />
                <p className="text-indigo-600 font-black uppercase tracking-[0.2em]">{cfg.title}</p>
                <div className="mt-4 p-4 bg-white rounded-2xl border border-indigo-100 max-w-xs text-center text-xs text-slate-500 font-bold">{getRandomFact('english')}</div>
            </div>
        );
    }

    if (showCompletion) {
        return (
            <CelebrationView 
                subject="English" nodeType={nodeType} mastery={completionResult.mastery} 
                score={completionResult.score} total={completionResult.total} 
                gemsEarned={gemsEarned} onCollect={() => onComplete?.()} 
            />
        );
    }

    const q = questions[currentIdx];
    if (!q) return null;

    if (q.isSimulation || q.item_type === 'QUEST_STORY') {
        return <EnglishBridge step={q} onComplete={nextQuestion} nodeType={nodeType} />;
    }

    return (
        <EnglishRenderer 
            currentQ={q} currentIdx={currentIdx} totalQuestions={questions.length}
            nodeType={nodeType} selectedOption={selectedOption} isAnswered={isAnswered}
            hintUsed={hintUsed} setHintUsed={setHintUsed} 
            setSelectedOption={setSelectedOption} handleSubmit={handleSubmit}
            correctText={resolveCorrectText(q.answer, q.options)} 
            userWasCorrect={verifyEnglishAnswer(selectedOption, q.answer, q.options)}
            frustration={calculateFrustration(session)} questMeta={null}
            gemsEarned={gemsEarned} showGemToast={showGemToast}
        />
    );
}
