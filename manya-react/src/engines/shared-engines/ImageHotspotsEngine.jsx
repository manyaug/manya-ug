import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { discoverArtifact } from '../../store/userSlice';
import { addToast } from '../../store/toastSlice';
import { audioService } from '../../infrastructure/audio/audioService.js';
import HotspotsRenderer from './ImageHotspots/HotspotsRenderer';
import { 
    validatePinChoice, 
    calculateHotspotsScore, 
    formatEngineResult 
} from './ImageHotspots/HotspotsLogic';

/**
 * ImageHotspotsEngine - Atomic Edition
 * DECOUPLED: Logic (HotspotsLogic), Renderer (HotspotsRenderer), Controller (Engine)
 */
export function ImageHotspotsEngine({ data, onComplete, onResult, onAttempt, skipDiscovery = false }) {
    const dispatch = useDispatch();
    const [selectedPinId, setSelectedPinId] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [correctPinIds, setCorrectPinIds] = useState(new Set());
    const [imageLoaded, setImageLoaded] = useState(false);
    const [feedbackState, setFeedbackState] = useState(null); // { type: 'error'|'success', id: string }
    const [showCompletion, setShowCompletion] = useState(false);
    const [totalMistakes, setTotalMistakes] = useState(0);

    const globalStartTimeRef = useRef(Date.now());
    const startTimeRef = useRef(Date.now());

    const hotspots = data?.hotspots || [];
    const isQuizMode = data?.mode === 'quiz' || data?.mode === 'labeling' || !!data?.wordBank;
    const wordBank = data?.wordBank || hotspots.map(h => h.label);

    // --- 📊 SYNCING RESULTS ---
    useEffect(() => {
        if (showCompletion) {
            const { score, total } = calculateHotspotsScore(correctPinIds, hotspots, isQuizMode);
            const duration = Date.now() - globalStartTimeRef.current;
            const result = formatEngineResult(score, total, totalMistakes, duration, isQuizMode);

            if (onResult) {
                onResult(result);
            } else if (window.QuestRunner?.handleEngineResult) {
                window.QuestRunner.handleEngineResult(result);
            }
        }
    }, [showCompletion, isQuizMode, correctPinIds.size, hotspots.length, onResult, totalMistakes]);

    // --- 🏁 COMPLETION CHECK ---
    useEffect(() => {
        if (correctPinIds.size === hotspots.length && hotspots.length > 0) {
            const timer = setTimeout(() => setShowCompletion(true), 800);
            audioService.finish?.();
            return () => clearTimeout(timer);
        }
    }, [correctPinIds.size, hotspots.length]);

    // --- 🎮 ACTIONS ---
    const handlePinClick = (pinId) => {
        audioService.click?.();
        setSelectedPinId(pinId);
        startTimeRef.current = Date.now();
        if (!isQuizMode) {
            setCorrectPinIds(prev => new Set([...prev, pinId]));
            setIsExpanded(true);
        }
    };

    const handleWordSelection = (word) => {
        if (!selectedPinId) {
            if (window.addToast) window.addToast({ message: "Tap a pulsing pin first!", type: "info" });
            return;
        }

        const isCorrect = validatePinChoice(selectedPinId, hotspots, word);
        const duration = Date.now() - startTimeRef.current;

        onAttempt?.({
            isCorrect,
            label: `Image Hotspot: ${word}`,
            duration,
            mistakes: isCorrect ? 0 : 1
        });

        if (isCorrect) {
            if (window.addToast) window.addToast({ message: "Correct! Great job Hero.", type: "success" });
            audioService.success?.();
            setCorrectPinIds(prev => new Set([...prev, selectedPinId]));
            setFeedbackState({ type: 'success', id: word });
            setTimeout(() => {
                setFeedbackState(null);
                setSelectedPinId(null);
            }, 800);
            startTimeRef.current = Date.now();
        } else {
            if (window.addToast) window.addToast({ message: "Not quite. Try again!", type: "error" });
            audioService.whoosh?.();
            setTotalMistakes(prev => prev + 1);
            setFeedbackState({ type: 'error', id: word });
            setTimeout(() => setFeedbackState(null), 600);
        }
    };

    const handleFinish = () => {
        const { score, total } = calculateHotspotsScore(correctPinIds, hotspots, isQuizMode);
        const duration = Date.now() - globalStartTimeRef.current;
        
        // DISCOVER Artifact for Vault (ONLY if not a quiz/exercise)
        if (!isQuizMode && !skipDiscovery) {
            dispatch(discoverArtifact({
                id: data.id || `map_${Date.now()}`,
                type: 'map',
                title: data.title || 'Discovery Map',
                subject: data.subject || 'SST',
                data: data 
            }));

            // ARCHIVE Notification
            dispatch(addToast({
                message: "Discovery Map Archived to Vault! 🏺✨",
                type: "success"
            }));
        }

        onComplete?.(formatEngineResult(score, total, totalMistakes, duration, isQuizMode));
    };

    const selectedHS = hotspots.find(h => h.id === selectedPinId);

    if (!data) return <div className="p-8 text-center opacity-50">No data available.</div>;

    return (
        <HotspotsRenderer 
            data={data}
            hotspots={hotspots}
            isQuizMode={isQuizMode}
            wordBank={wordBank}
            selectedPinId={selectedPinId}
            correctPinIds={correctPinIds}
            imageLoaded={imageLoaded}
            feedbackState={feedbackState}
            showCompletion={showCompletion}
            totalMistakes={totalMistakes}
            onImageLoad={() => setImageLoaded(true)}
            onPinClick={handlePinClick}
            onWordSelection={handleWordSelection}
            onFinish={handleFinish}
            onCloseDrawer={() => setIsExpanded(false)}
            isExpanded={isExpanded}
            selectedHS={selectedHS}
        />
    );
}

ImageHotspotsEngine.hideGlobalFooter = true;
export default ImageHotspotsEngine;
