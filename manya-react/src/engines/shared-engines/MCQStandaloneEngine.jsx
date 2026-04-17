import React, { useState, useCallback, useMemo } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import MCQRenderer from './MCQ/MCQRenderer';
import { 
    parseSolution, 
    normalizeOptions, 
    getThemeForSubject, 
    validateMCQAnswer 
} from './MCQ/MCQLogic';
import '../../styles/mcq-engine.css';

/**
 * MCQ STANDALONE ENGINE v4.0 (Atomic)
 * ────────────────────────────────────────────────────
 * - DECOUPLED: Logic (MCQLogic), Renderer (MCQRenderer), Controller (Engine)
 */
const MCQStandaloneEngine = ({ data, onComplete, onResult, subject }) => {
    const [selected, setSelected] = useState(null);
    const [phase, setPhase] = useState('idle'); // idle | checking | correct | wrong | show-solution

    // --- 🧠 LOGIC PREP ---
    const options = useMemo(() => normalizeOptions(data.options), [data.options]);
    const theme = useMemo(() => getThemeForSubject(subject || data.subject), [subject, data.subject]);
    const correctId = data.correct || data.answer;
    
    const correctOpt = options.find(o => o.id === correctId);
    const correctText = correctOpt?.text || correctId || '';
    const solution = useMemo(() => parseSolution(data.explanation), [data.explanation]);

    // --- 🎮 ACTIONS ---
    const handlePick = useCallback((opt) => {
        if (phase !== 'idle') return;
        setSelected(opt.id);
        setPhase('checking');

        const isCorrect = validateMCQAnswer(opt.id, correctId, options);

        if (isCorrect) {
            audioService.success?.();
            setPhase('correct');
            onResult?.({ isCorrect: true, score: data.points || 1, total: data.points || 1, type: 'mcq' });
        } else {
            audioService.error?.();
            // Brief wrong flash, then open solution panel
            setTimeout(() => setPhase('wrong'), 100);
            setTimeout(() => setPhase('show-solution'), 950);
            onResult?.({ isCorrect: false, score: 0, total: data.points || 1, type: 'mcq' });
        }
    }, [phase, correctId, options, data.points, onResult]);

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
        />
    );
};

export default MCQStandaloneEngine;
