import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Decoupled Resources
import { normalizeComposerPool, validateComposition, calculateComposerScoring } from './FunctionalComposer/ComposerLogic';
import ComposerRenderer from './FunctionalComposer/ComposerRenderer';

/**
 * MANYA ENGLISH: FUNCTIONAL COMPOSER ENGINE v2.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates spatial composition logic from the Studio Desk visual surface.
 */

const FunctionalComposerEngine = ({ data, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [placedItems, setPlacedItems] = useState({}); // { slotId: itemId }
    const [selectedItem, setSelectedItem] = useState(null);
    const [feedback, setFeedback] = useState(null); 
    const [isResolved, setIsResolved] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [showFinish, setShowFinish] = useState(false);

    const startTimeRef = useRef(Date.now());
    const questions = useMemo(() => {
        const payload = data?.data || data;
        return payload?.questions || payload?.queries || payload?.items || [];
    }, [data]);
    const currentQ = questions[currentStep];

    const availableItems = useMemo(() => {
        return normalizeComposerPool(currentQ?.items, placedItems);
    }, [currentQ, placedItems]);

    // --- 🪄 THEME SYNC ---
    useLayoutEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        checkTheme();
        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    const handleSlotClick = (slotId) => {
        if (isResolved || !selectedItem) return;

        setPlacedItems(prev => ({ ...prev, [slotId]: selectedItem.id }));
        setSelectedItem(null);
        setFeedback(null);
    };

    const handleItemSelect = (item) => {
        if (isResolved || item.isPlaced) return;
        setSelectedItem(item);
    };

    const validate = () => {
        const isCorrect = validateComposition(currentQ.slots, placedItems);

        if (isCorrect) {
            setIsResolved(true);
            setFeedback({ type: 'success', msg: 'Composition Complete! ✍️' });
            audioService.success?.();
        } else {
            setFeedback({ type: 'error', msg: 'Some components are misplaced.' });
            audioService.error?.();
        }
    };

    const nextStep = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(s => s + 1);
            setPlacedItems({});
            setSelectedItem(null);
            setIsResolved(false);
            setFeedback(null);
        } else {
            setShowFinish(true);
        }
    };
    nextStep.isFinal = currentStep === questions.length - 1;

    const handleFinishResult = () => {
        const result = calculateComposerScoring(true, questions.length, startTimeRef.current);
        if (onComplete) onComplete(result);
    };

    return (
        <ComposerRenderer 
            isDark={isDark} currentQ={currentQ} placedItems={placedItems} 
            availableItems={availableItems} selectedItem={selectedItem} 
            feedback={feedback} isResolved={isResolved} showFinish={showFinish} 
            handleSlotClick={handleSlotClick} handleItemSelect={handleItemSelect} 
            validate={validate} nextStep={nextStep} onComplete={handleFinishResult} 
        />
    );
};

FunctionalComposerEngine.hideGlobalFooter = true;
export default FunctionalComposerEngine;
