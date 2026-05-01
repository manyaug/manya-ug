import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useBehavioralTracker
 * =====================
 * A non-intrusive React hook that monitors student behavior during a question/activity.
 * Captures "invisible" metrics like hesitation, idle time, and focus loss.
 */
export const useBehavioralTracker = () => {
    const [behavioralData, setBehavioralData] = useState({
        idleTimeMs: 0,
        hesitationCount: 0,
        timeToFirstClickMs: 0,
        tabSwitched: false,
        optionHoverTimes: {}, // optionIndex -> totalTimeMs
    });

    const startTime = useRef(Date.now());
    const lastActivityTime = useRef(Date.now());
    const hasClicked = useRef(false);
    const idleTimer = useRef(null);
    const currentHover = useRef({ id: null, start: null });

    // Track Tab Switching (Focus Loss)
    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) {
                setBehavioralData(prev => ({ ...prev, tabSwitched: true }));
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    // Track Idle Time
    useEffect(() => {
        const trackIdle = () => {
            const now = Date.now();
            const diff = now - lastActivityTime.current;
            
            // If more than 3 seconds since last activity, accumulate as idle time
            if (diff > 3000) {
                setBehavioralData(prev => ({
                    ...prev,
                    idleTimeMs: prev.idleTimeMs + (now - lastActivityTime.current)
                }));
            }
            lastActivityTime.current = now;
        };

        const activityEvents = ['mousemove', 'keydown', 'touchstart', 'scroll'];
        activityEvents.forEach(e => window.addEventListener(e, trackIdle));

        return () => {
            activityEvents.forEach(e => window.removeEventListener(e, trackIdle));
        };
    }, []);

    /**
     * Call this when the student clicks/interacts with any answer option.
     */
    const recordInteraction = useCallback(() => {
        if (!hasClicked.current) {
            const now = Date.now();
            setBehavioralData(prev => ({
                ...prev,
                timeToFirstClickMs: now - startTime.current
            }));
            hasClicked.current = true;
        }
    }, []);

    /**
     * Call this when the student hovers over an option.
     * Helps detect hesitation/wavering.
     */
    const recordHoverStart = useCallback((optionId) => {
        currentHover.current = { id: optionId, start: Date.now() };
    }, []);

    const recordHoverEnd = useCallback((optionId) => {
        if (currentHover.current.id === optionId) {
            const duration = Date.now() - currentHover.current.start;
            setBehavioralData(prev => ({
                ...prev,
                hesitationCount: prev.hesitationCount + 1,
                optionHoverTimes: {
                    ...prev.optionHoverTimes,
                    [optionId]: (prev.optionHoverTimes[optionId] || 0) + duration
                }
            }));
            currentHover.current = { id: null, start: null };
        }
    }, []);

    /**
     * Resets the tracker for a new question.
     */
    const resetTracker = useCallback(() => {
        startTime.current = Date.now();
        lastActivityTime.current = Date.now();
        hasClicked.current = false;
        setBehavioralData({
            idleTimeMs: 0,
            hesitationCount: 0,
            timeToFirstClickMs: 0,
            tabSwitched: false,
            optionHoverTimes: {},
        });
    }, []);

    /**
     * Returns the final data bundle for submission.
     */
    const getFinalPayload = useCallback(() => {
        return {
            ...behavioralData,
            timeSpentMs: Date.now() - startTime.current,
        };
    }, [behavioralData]);

    return {
        behavioralData,
        recordInteraction,
        recordHoverStart,
        recordHoverEnd,
        resetTracker,
        getFinalPayload
    };
};
