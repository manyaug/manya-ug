import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import VennProbRenderer from './VennProbRenderer';
import { detectRegion, validateVennSetup, validateVennCalc } from './VennProbLogic';

/**
 * VENN PROBABILITY ENGINE v4.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates data-driven prob logic from Premium SVG visuals.
 */
export default function VennProbEngine({ data, onComplete, onResult, onAttempt }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [phase, setPhase] = useState('setup'); // 'setup' | 'calc'
    
    const [chips, setChips] = useState([]);
    const [numInput, setNumInput] = useState('');
    const [denInput, setDenInput] = useState('');
    const [regionInputs, setRegionInputs] = useState({ left: '', right: '', center: '', outside: '' });
    const [errorMsg, setErrorMsg] = useState('');
    const [isResolved, setIsResolved] = useState(false);
    const [mistakes, setMistakes] = useState(0);
    
    const startTimeRef = useRef(Date.now());
    const containerRef = useRef(null);

    const question = data?.questions?.[currentStep];
    const totalLevels = data?.questions?.length || 1;

    // Reset loop & Phase detection
    useEffect(() => {
        if (question) {
            const interactionType = question.interaction || question.type || "";
            if (interactionType === 'DIAGRAM_FILL') {
                setPhase('fill');
            } else {
                setPhase('setup');
            }

            const { aOnly, bOnly, intersection, outside } = question.setup || {};
            const total = (aOnly || 0) + (bOnly || 0) + (intersection || 0) + (outside || 0);
            setChips(Array.from({ length: total }, (_, i) => ({ id: i, region: 'storage' })));
            setNumInput(''); setDenInput(''); 
            setRegionInputs({ left: '', right: '', center: '', outside: '' });
            setIsResolved(false); setErrorMsg('');
        }
    }, [currentStep, question]);

    useEffect(() => {
        onResult?.({
            score: currentStep,
            total: totalLevels,
            type: 'pulse'
        });
    }, [currentStep, totalLevels, onResult]);

    // Handle dropping a chip
    const handleDragEnd = (event, info, chipId) => {
        if (phase !== 'setup') return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = info.point.x - rect.left;
        const y = info.point.y - rect.top;

        const newRegion = detectRegion(x, y, rect.width, rect.height);
        setChips(prev => {
            const next = [...prev];
            const idx = next.findIndex(c => c.id === chipId);
            if (idx > -1 && next[idx].region !== newRegion) {
                audioService.tap?.();
                next[idx] = { ...next[idx], region: newRegion };
                return next;
            }
            return prev;
        });
    };

    const handleCheckSetup = () => {
        const isCorrect = validateVennSetup(chips, question.setup);
        const duration = Date.now() - startTimeRef.current;

        onAttempt?.({ isCorrect, label: `Venn Setup [${currentStep + 1}]`, duration });

        if (isCorrect) {
            audioService.success?.();
            setPhase('calc'); setErrorMsg(''); startTimeRef.current = Date.now();
        } else {
            audioService.error?.(); setMistakes(m => m+1); setErrorMsg("Setup doesn't match.");
            setTimeout(() => setErrorMsg(''), 2000);
        }
    };

    const handleCheckFill = () => {
        const { validateVennFill } = require('./VennProbLogic');
        const isCorrect = validateVennFill(regionInputs, question.setup);
        const duration = Date.now() - startTimeRef.current;

        onAttempt?.({ isCorrect, label: `Venn Fill [${currentStep + 1}]`, duration });

        if (isCorrect) {
            audioService.success?.();
            setPhase('calc'); setErrorMsg(''); startTimeRef.current = Date.now();
        } else {
            audioService.error?.(); setMistakes(m => m+1); setErrorMsg("Diagram counts are incorrect.");
            setTimeout(() => setErrorMsg(''), 2000);
        }
    };

    const handleCheckProb = () => {
        const isCorrect = validateVennCalc(numInput, denInput, question.expectedNumerator, question.expectedDenominator);
        const duration = Date.now() - startTimeRef.current;

        onAttempt?.({ isCorrect, label: `Venn Prob [${currentStep + 1}]`, duration });

        if (isCorrect) {
            audioService.success?.();
            setIsResolved(true); setErrorMsg('');
            setTimeout(() => {
                if (currentStep < totalLevels - 1) {
                    setCurrentStep(s => s + 1); setPhase('setup'); startTimeRef.current = Date.now();
                } else {
                    onResult?.({ isCorrect: true, score: totalLevels, total: totalLevels, mistakes, type: 'simulation' });
                    onComplete?.();
                }
            }, 1500);
        } else {
            audioService.error?.(); setMistakes(m => m+1); setErrorMsg(question.hint || "Incorrect probability.");
            setTimeout(() => setErrorMsg(''), 3000);
        }
    };

    return (
        <VennProbRenderer 
            question={question} phase={phase} chips={chips}
            numInput={numInput} setNumInput={setNumInput}
            denInput={denInput} setDenInput={setDenInput}
            regionInputs={regionInputs} setRegionInputs={setRegionInputs}
            errorMsg={errorMsg} isResolved={isResolved}
            currentStep={currentStep} totalLevels={totalLevels}
            containerRef={containerRef} handleDragEnd={handleDragEnd}
            handleCheckSetup={handleCheckSetup} 
            handleCheckFill={handleCheckFill}
            handleCheckProb={handleCheckProb}
        />
    );
}
