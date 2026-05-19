import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { discoverArtifact } from '../../store/userSlice';
import { addToast } from '../../store/toastSlice';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { feedbackService } from '../../application/feedbackService';
import ThreeDRenderer from './ThreeD/ThreeDRenderer';
import { 
    calculateOrbit, 
    getThreeDAccent, 
    formatThreeDResult 
} from './ThreeD/ThreeDLogic';

/**
 * THREE D STUDY ENGINE v2.0 (Atomic)
 * ───────────────────────────────────────────────────
 * - DECOUPLED: Logic (ThreeDLogic), Renderer (ThreeDRenderer), Controller (Engine)
 */
export function ThreeDStudyEngine({ data, onComplete, onResult, onAttempt, onSimSuccess, onSimWrong, skipDiscovery = false }) {
    const dispatch = useDispatch();
    const [selectedPinId, setSelectedPinId] = useState(null);
    const [correctPinIds, setCorrectPinIds] = useState(new Set());
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [feedbackState, setFeedbackState] = useState(null); // { type: 'success' | 'error', id: string }
    const [isFinished, setIsFinished] = useState(false);
    const [showScrollHint, setShowScrollHint] = useState(false);
    const [totalMistakes, setTotalMistakes] = useState(0);
    
    const globalStartTimeRef = useRef(Date.now());
    const startTimeRef = useRef(Date.now());
    const viewerRef = useRef(null);

    const hotspots = useMemo(() => data?.hotspots || [], [data]);
    const wordBank = useMemo(() => data?.wordBank || hotspots.map(h => h.label), [data, hotspots]);
    const isQuiz = data?.mode === 'quiz' || !!data?.wordBank;
    const accent = useMemo(() => getThreeDAccent(data?.subject), [data?.subject]);

    const handlePinClick = (hs) => {
        if (viewerRef.current) {
            // Explicitly set target and orbit for smooth transition
            const targetPos = String(hs.pos);
            const targetOrbit = calculateOrbit(hs.norm);
            
            viewerRef.current.cameraTarget = targetPos;
            viewerRef.current.cameraOrbit = targetOrbit;
        }
        setSelectedPinId(hs.id);
        if (!isQuiz) setIsDrawerOpen(true);
        audioService.playSFX?.('tap');
        startTimeRef.current = Date.now();
    };
    
    const handleResetCamera = () => {
        if (viewerRef.current) {
            viewerRef.current.cameraTarget = "auto auto auto";
            viewerRef.current.cameraOrbit = "0deg 75deg 105%";
        }
        setIsDrawerOpen(false);
        setSelectedPinId(null);
        audioService.playSFX?.('tap');
    };

    const handleWordSelection = (word) => {
        if (!selectedPinId) return;

        const hs = hotspots.find(h => h.id === selectedPinId);
        const isCorrect = hs && hs.label.toLowerCase() === word.toLowerCase();
        const duration = Date.now() - startTimeRef.current;

        onAttempt?.({
            isCorrect,
            label: `3D Label: ${word}`,
            duration,
            mistakes: isCorrect ? 0 : 1
        });

        if (isCorrect) {
            feedbackService.triggerCorrect(data?.subject || 'science', { type: 'simulation' });
            onSimSuccess?.(); // Cinematic Dim + Badge
            
            // 🚀 Coin Flight Burst
            window.dispatchEvent(new CustomEvent('manya-fx-flight', {
                detail: {
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2,
                    type: 'coin',
                    amount: 5
                }
            }));

            setCorrectPinIds(prev => new Set([...prev, selectedPinId]));
            setFeedbackState({ type: 'success', id: selectedPinId });
            setTimeout(() => {
                setFeedbackState(null);
                setSelectedPinId(null);
                if (viewerRef.current) viewerRef.current.cameraTarget = "auto auto auto";
            }, 1200);
            startTimeRef.current = Date.now();
        } else {
            feedbackService.triggerWrong(data?.subject || 'science');
            onSimWrong?.(); // Snappy "Try Again" Overlay
            setTotalMistakes(prev => prev + 1);
            setFeedbackState({ type: 'error', id: selectedPinId });
            setTimeout(() => setFeedbackState(null), 800);
        }
    };

    const lastReportedScore = useRef(0);

    // REPORT PARTIAL PROGRESS
    useEffect(() => {
        if (onResult && isQuiz && hotspots.length > 0 && correctPinIds.size !== lastReportedScore.current) {
            lastReportedScore.current = correctPinIds.size;
            onResult({
                isCorrect: correctPinIds.size === hotspots.length,
                score: correctPinIds.size,
                total: hotspots.length,
                type: '3d_partial'
            });
        }
    }, [correctPinIds.size, hotspots.length, onResult, isQuiz]);

    // CHECK COMPLETION
    useEffect(() => {
        if (isFinished) {
            const score = isQuiz ? correctPinIds.size : 1;
            const total = isQuiz ? hotspots.length : 1;
            const duration = Date.now() - globalStartTimeRef.current;
            const results = formatThreeDResult(score, total, totalMistakes, duration, isQuiz);
            
            // DISCOVER Artifact for Vault (ONLY if not a quiz/exercise)
            if (!isQuiz && !skipDiscovery) {
                dispatch(discoverArtifact({
                    id: data.id || `3d_${Date.now()}`,
                    type: '3d',
                    title: data.title || '3D Specimen',
                    subject: data.subject || 'Science',
                    data: data 
                }));

                // ARCHIVE Notification
                dispatch(addToast({
                    message: "3D Relic Archived to Vault! 🏺✨",
                    type: "success"
                }));
            }

            if (window.QuestRunner?.handleEngineResult) {
                window.QuestRunner.handleEngineResult(results);
            }

            onComplete?.(results);
        }
    }, [isFinished, isQuiz, skipDiscovery, correctPinIds.size, hotspots.length, onComplete, totalMistakes, dispatch, data]);

    useEffect(() => {
        if (isQuiz && correctPinIds.size === hotspots.length && hotspots.length > 0) {
            setTimeout(() => setIsFinished(true), 1000);
        }
    }, [correctPinIds, hotspots.length, isQuiz]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const atBottom = scrollHeight - scrollTop - clientHeight < 50;
        setShowScrollHint(!atBottom && scrollHeight > clientHeight);
    };

    const selectedHS = useMemo(() => hotspots.find(h => h.id === selectedPinId), [hotspots, selectedPinId]);

    return (
        <ThreeDRenderer 
            refViewer={viewerRef}
            data={data}
            hotspots={hotspots}
            wordBank={wordBank}
            isQuiz={isQuiz}
            accent={accent}
            selectedPinId={selectedPinId}
            correctPinIds={correctPinIds}
            feedbackState={feedbackState}
            isFinished={isFinished}
            showScrollHint={showScrollHint}
            isDrawerOpen={isDrawerOpen}
            onPinClick={handlePinClick}
            onResetCamera={handleResetCamera}
            onMastered={() => setIsFinished(true)}
            onWordSelection={handleWordSelection}
            onCloseDrawer={() => setIsDrawerOpen(false)}
            onScrollDrawer={handleScroll}
            selectedHS={selectedHS}
        />
    );
}

export default ThreeDStudyEngine;
