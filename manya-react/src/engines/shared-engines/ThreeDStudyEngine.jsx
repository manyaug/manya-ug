import React, { useState, useEffect, useRef, useMemo } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
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
export function ThreeDStudyEngine({ data, onComplete, onAttempt }) {
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
            viewerRef.current.cameraTarget = hs.pos;
            viewerRef.current.cameraOrbit = calculateOrbit(hs.norm);
        }
        setSelectedPinId(hs.id);
        if (!isQuiz) setIsDrawerOpen(true);
        audioService.click?.();
        startTimeRef.current = Date.now();
    };

    const handleResetCamera = () => {
        if (viewerRef.current) {
            viewerRef.current.cameraTarget = "auto auto auto";
            viewerRef.current.cameraOrbit = "0deg 75deg 105%";
        }
        setIsDrawerOpen(false);
        setSelectedPinId(null);
        audioService.click?.();
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
            audioService.success?.();
            setCorrectPinIds(prev => new Set([...prev, selectedPinId]));
            setFeedbackState({ type: 'success', id: selectedPinId });
            setTimeout(() => {
                setFeedbackState(null);
                setSelectedPinId(null);
                if (viewerRef.current) viewerRef.current.cameraTarget = "auto auto auto";
            }, 1200);
            startTimeRef.current = Date.now();
        } else {
            audioService.whoosh?.();
            setTotalMistakes(prev => prev + 1);
            setFeedbackState({ type: 'error', id: selectedPinId });
            setTimeout(() => setFeedbackState(null), 800);
        }
    };

    // CHECK COMPLETION
    useEffect(() => {
        if (isFinished) {
            const score = isQuiz ? correctPinIds.size : 1;
            const total = isQuiz ? hotspots.length : 1;
            const duration = Date.now() - globalStartTimeRef.current;
            const results = formatThreeDResult(score, total, totalMistakes, duration, isQuiz);
            
            if (window.QuestRunner?.handleEngineResult) {
                window.QuestRunner.handleEngineResult(results);
            }

            onComplete?.(results);
        }
    }, [isFinished, isQuiz, correctPinIds.size, hotspots.length, onComplete, totalMistakes]);

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
