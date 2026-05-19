import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import MCQRenderer from './MCQ/MCQRenderer';
import { 
    parseSolution, 
    normalizeOptions, 
    getThemeForSubject, 
    validateMCQAnswer 
} from './MCQ/MCQLogic';
import { dynamicModeService } from '../../domain/gamification/dynamicModeService';
import '../../styles/mcq-engine.css';

import { useQuestBus } from '../../ui/context/QuestBus';

/**
 * MCQ STANDALONE ENGINE v4.3 (Premium)
 * ────────────────────────────────────────────────────
 * - DECOUPLED: Logic (MCQLogic), Renderer (MCQRenderer), Controller (Engine)
 * - PREMIUM: Supports Speedrun, Reverse, and Dynamic Celebration FX.
 */
const MCQStandaloneEngine = ({ data, onComplete, onResult, subject }) => {
    const bus = useQuestBus();
    const [selected, setSelected] = useState(null);
    const [phase, setPhase] = useState('idle'); // idle | checking | correct | wrong | show-solution
    const [hintUsed, setHintUsed] = useState(false);

    // --- 🧠 LOGIC PREP ---
    const options = useMemo(() => normalizeOptions(data.options), [data.options]);
    const theme = useMemo(() => getThemeForSubject(subject || data.subject), [subject, data.subject]);
    const correctId = data.correct || data.answer;
    
    const correctOpt = options.find(o => o.id === correctId);
    const correctText = correctOpt?.text || correctId || '';
    const solution = useMemo(() => parseSolution(data.explanation), [data.explanation]);

    // --- ⚡ SPEEDRUN & TIMEOUT HANDLING ---
    useEffect(() => {
        const handleTimeout = () => {
            if (phase !== 'idle') return; // Already answered
            audioService.error?.();
            setPhase('wrong');
            // Transition to solution so the user can see what they missed and Continue
            setTimeout(() => setPhase('show-solution'), 1000);
            onResult?.({ isCorrect: false, score: 0, type: 'mcq' });
        };

        window.addEventListener('manya-engine-timeout', handleTimeout);
        return () => window.removeEventListener('manya-engine-timeout', handleTimeout);
    }, [phase, onResult]);

    // --- 🎮 ACTIONS ---
    const handlePick = useCallback((opt) => {
        if (phase !== 'idle') return;
        setSelected(opt.id);
    }, [phase]);

    const handleSubmit = useCallback(() => {
        if (phase !== 'idle' || !selected) return;
        setPhase('checking');

        const isCorrect = validateMCQAnswer(selected, correctId, options);

        if (isCorrect) {
            setPhase('correct');
            
            // 🎈 Trigger Global Celebration FX (Particles only)
            window.dispatchEvent(new CustomEvent('manya-fx-correct'));
            
            onResult?.({ 
                isCorrect: true, 
                score: data.points || 1, 
                type: 'mcq',
                hintUsed: hintUsed
            });

            // Automatically advance to the next question after a 1.5-second delay
            setTimeout(() => {
                onComplete?.();
            }, 1500);
        } else {
            setTimeout(() => setPhase('wrong'), 100);
            setTimeout(() => setPhase('show-solution'), 950);
            onResult?.({ 
                isCorrect: false, 
                score: 0, 
                type: 'mcq',
                hintUsed: hintUsed
            });
        }
    }, [phase, selected, correctId, options, data.points, onResult, hintUsed, onComplete]);

    return (
        <MCQRenderer 
            data={data}
            options={options}
            theme={theme}
            phase={phase}
            selected={selected}
            correctId={correctId}
            correctText={correctText}
            solution={solution}
            onPick={handlePick}
            onContinue={onComplete}
            onSubmit={handleSubmit}
            hintUsed={hintUsed}
            setHintUsed={setHintUsed}
        />
    );
};

export default MCQStandaloneEngine;
