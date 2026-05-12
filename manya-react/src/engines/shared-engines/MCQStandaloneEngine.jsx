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

    // --- ⚡ SPEEDRUN ACTIVATION ---
    useEffect(() => {
        if (data.mode === 'speedrun' || data.isSpeedrun) {
            dynamicModeService.startSpeedrun(15, () => {
                audioService.error();
                setPhase('wrong');
                onResult?.({ isCorrect: false, score: 0, type: 'mcq' });
            });
        }
        return () => dynamicModeService.stopSpeedrun();
    }, [data.mode, data.isSpeedrun, onResult]);

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
            audioService.success?.();
            setPhase('correct');
            
            // 🎈 Trigger Global Celebration FX
            window.dispatchEvent(new CustomEvent('manya-fx-correct'));
            
            onResult?.({ 
                isCorrect: true, 
                score: data.points || 1, 
                type: 'mcq',
                hintUsed: hintUsed
            });
            // Auto-continue is handled by QuestRunner event listener
        } else {
            audioService.error?.();
            setTimeout(() => setPhase('wrong'), 100);
            setTimeout(() => setPhase('show-solution'), 950);
            onResult?.({ 
                isCorrect: false, 
                score: 0, 
                type: 'mcq',
                hintUsed: hintUsed
            });
        }
    }, [phase, selected, correctId, options, data.points, onResult, hintUsed]);

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
