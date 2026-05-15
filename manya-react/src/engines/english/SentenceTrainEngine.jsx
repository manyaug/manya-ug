import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Decoupled Resources
import { prepareSentencePool, validateTrainOrder, calculateTrainScoring } from './SentenceTrain/TrainLogic';
import TrainRenderer from './SentenceTrain/TrainRenderer';

/**
 * MANYA ENGLISH: SENTENCE TRAIN ENGINE v4.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates locomotive state and coupling logic from the 2D visual track.
 */

const SentenceTrainEngine = ({ data, onComplete }) => {
    const questions = useMemo(() => {
        // v9.9: Hardened Data Extraction - Look for single sentence or questions array
        const payload = data?.data || data;
        const raw = payload?.questions || payload?.queries || payload?.items || payload?.steps;
        
        if (Array.isArray(raw) && raw.length > 0) return raw;
        if (payload?.sentence) return [payload]; // Single sentence mode
        
        return [{ sentence: "The quick brown fox jumps over the lazy dog." }];
    }, [data]);

    const [qIdx, setQIdx] = useState(0);
    const [pool, setPool] = useState([]);
    const [train, setTrain] = useState([]);
    const [phase, setPhase] = useState('play'); // 'play' | 'wrong' | 'depart'
    const [score, setScore] = useState(0);
    
    const trackRef = useRef(null);
    const startTimeRef = useRef(Date.now());
    const mistakesRef = useRef(0);
    const q = questions[qIdx] || { sentence: "" };

    // 1. Initialize Level
    const initLevel = useCallback((idx) => {
        const target = questions[idx];
        if (!target) return;
        setPool(prepareSentencePool(target.sentence || "", idx));
        setTrain([]);
        setPhase('play');
    }, [questions]);

    useEffect(() => { initLevel(qIdx); }, [qIdx, initLevel]);

    // Track Auto-Scroll
    useEffect(() => {
        if (trackRef.current) trackRef.current.scrollLeft = trackRef.current.scrollWidth;
    }, [train.length]);

    const couple = (w) => {
        if (phase !== 'play') return;
        setPool(p => p.filter(x => x.id !== w.id));
        setTrain(t => [...t, w]);
        audioService.success?.();
    };

    const uncouple = (w) => {
        if (phase !== 'play') return;
        setTrain(t => t.filter(x => x.id !== w.id));
        setPool(p => [...p, w]);
    };

    // 2. Victory Check
    useEffect(() => {
        if (pool.length > 0 || train.length === 0 || phase !== 'play') return;

        const isCorrect = validateTrainOrder(train, q.sentence);
        if (isCorrect) {
            setPhase('depart');
            setScore(s => s + 100);
            audioService.success?.();
            
            setTimeout(() => {
                if (qIdx + 1 < questions.length) {
                    setQIdx(i => i + 1);
                } else {
                    handleFinish();
                }
            }, 2500);
        } else {
            setPhase('wrong');
            mistakesRef.current += 1;
            audioService.error?.();
        }
    }, [pool, train, phase, q, qIdx, questions.length]);

    const handleFinish = () => {
        const result = calculateTrainScoring(true, mistakesRef.current, questions.length, startTimeRef.current);
        if (onComplete) onComplete(result);
    };

    const handleReset = () => {
        initLevel(qIdx);
    };

    return (
        <TrainRenderer 
            qIdx={qIdx} totalQuestions={questions.length} score={score} 
            pool={pool} train={train} phase={phase} q={q} 
            trackRef={trackRef} couple={couple} uncouple={uncouple} 
            handleReset={handleReset} 
        />
    );
};

SentenceTrainEngine.hideGlobalFooter = true;
export default SentenceTrainEngine;
