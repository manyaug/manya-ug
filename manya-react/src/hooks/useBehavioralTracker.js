import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * MANYA REVOLUTIONARY BEHAVIORAL TRACKER v1.0
 * -------------------------------------------
 * Captures high-fidelity student interaction data:
 * - Idle time (inactivity)
 * - Hesitation (pauses on hovers)
 * - Reaction Time (first click)
 * - Tab switching (focus loss)
 * - Option engagement (hover durations)
 */
export const useBehavioralTracker = (isActive = true) => {
    const [metrics, setMetrics] = useState({
        idleTimeMs: 0,
        hesitationCount: 0,
        timeToFirstClickMs: 0,
        tabSwitched: false,
        optionHoverTimes: {}, // { optionId: ms }
        answerHistory: [] // [ { val, timestamp } ]
    });

    const startTimeRef = useRef(Date.now());
    const lastActivityRef = useRef(Date.now());
    const hoverStartRef = useRef(null); // { id, timestamp }
    const firstClickRecordedRef = useRef(false);
    const idleIntervalRef = useRef(null);

    // Track First Click
    const recordFirstClick = useCallback(() => {
        if (!firstClickRecordedRef.current) {
            setMetrics(m => ({ ...m, timeToFirstClickMs: Date.now() - startTimeRef.current }));
            firstClickRecordedRef.current = true;
        }
        lastActivityRef.current = Date.now();
    }, []);

    // Track Answer History
    const recordAnswerSelection = useCallback((val) => {
        setMetrics(m => ({
            ...m,
            answerHistory: [...m.answerHistory, { val: String(val), timestamp: new Date().toISOString() }]
        }));
        recordFirstClick();
    }, [recordFirstClick]);

    // Track Option Hover (Hesitation Detection)
    const onOptionHoverStart = useCallback((id) => {
        hoverStartRef.current = { id, timestamp: Date.now() };
    }, []);

    const onOptionHoverEnd = useCallback((id) => {
        if (hoverStartRef.current && hoverStartRef.current.id === id) {
            const duration = Date.now() - hoverStartRef.current.timestamp;
            
            setMetrics(m => {
                const newHoverTimes = { ...m.optionHoverTimes };
                newHoverTimes[id] = (newHoverTimes[id] || 0) + duration;
                
                // If hover > 1.5s, it's a "hesitation"
                const newHesitationCount = duration > 1500 ? m.hesitationCount + 1 : m.hesitationCount;
                
                return { 
                    ...m, 
                    optionHoverTimes: newHoverTimes,
                    hesitationCount: newHesitationCount
                };
            });
        }
        hoverStartRef.current = null;
    }, []);

    useEffect(() => {
        if (!isActive) return;

        // 1. Tab Switching Detection
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setMetrics(m => ({ ...m, tabSwitched: true }));
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 2. Idle Time Accumulator
        idleIntervalRef.current = setInterval(() => {
            const now = Date.now();
            const inactiveDuration = now - lastActivityRef.current;
            
            // If inactive for more than 5 seconds, start counting as "idle"
            if (inactiveDuration > 5000) {
                setMetrics(m => ({ ...m, idleTimeMs: m.idleTimeMs + 1000 }));
            }
        }, 1000);

        // 3. Activity Resetters
        const resetActivity = () => { lastActivityRef.current = Date.now(); };
        window.addEventListener('mousemove', resetActivity);
        window.addEventListener('keydown', resetActivity);
        window.addEventListener('touchstart', resetActivity);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(idleIntervalRef.current);
            window.removeEventListener('mousemove', resetActivity);
            window.removeEventListener('keydown', resetActivity);
            window.removeEventListener('touchstart', resetActivity);
        };
    }, [isActive]);

    const resetMetrics = useCallback(() => {
        setMetrics({
            idleTimeMs: 0,
            hesitationCount: 0,
            timeToFirstClickMs: 0,
            tabSwitched: false,
            optionHoverTimes: {},
            answerHistory: []
        });
        startTimeRef.current = Date.now();
        lastActivityRef.current = Date.now();
        firstClickRecordedRef.current = false;
        hoverStartRef.current = null;
    }, []);

    return {
        metrics,
        recordFirstClick,
        recordAnswerSelection,
        onOptionHoverStart,
        onOptionHoverEnd,
        resetMetrics
    };
};
