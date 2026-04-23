/**
 * useGameMode — React Hook
 * ===========================
 * Manages the QuickFire / Timed countdown timer for a single question.
 * Returns the remaining time and whether the question has auto-expired.
 *
 * Usage:
 *   const { timeRemainingMs, timerPercent, isExpired, resetTimer } = useGameMode(gameMode, onExpire);
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { getTimeLimitMs, isQuickFire, isTimed } from '../domain/gamification/gameModeEngine.js';

/**
 * @param {string} gameMode - 'quickfire' | 'timed' | 'marathon' | 'none'
 * @param {function} onExpire - Called when timer hits 0 (treat as wrong answer)
 * @param {boolean} paused - Pause the timer when true (e.g., after answer submitted)
 */
export function useGameMode(gameMode, onExpire, paused = false) {
    const limitMs = getTimeLimitMs(gameMode);
    const isActive = limitMs !== null;

    const [timeRemainingMs, setTimeRemainingMs] = useState(limitMs || 0);
    const intervalRef = useRef(null);
    const hasExpiredRef = useRef(false);

    const resetTimer = useCallback(() => {
        hasExpiredRef.current = false;
        setTimeRemainingMs(limitMs || 0);
    }, [limitMs]);

    useEffect(() => {
        if (!isActive || paused) {
            clearInterval(intervalRef.current);
            return;
        }

        // Start ticking
        intervalRef.current = setInterval(() => {
            setTimeRemainingMs(prev => {
                const next = prev - 100;
                if (next <= 0 && !hasExpiredRef.current) {
                    hasExpiredRef.current = true;
                    clearInterval(intervalRef.current);
                    onExpire?.();
                    return 0;
                }
                return Math.max(0, next);
            });
        }, 100);

        return () => clearInterval(intervalRef.current);
    }, [isActive, paused, onExpire, limitMs]);

    // Reset whenever the question changes (paused flips from true→false)
    useEffect(() => {
        if (!paused) resetTimer();
    }, [paused]); // eslint-disable-line

    const timerPercent = limitMs ? (timeRemainingMs / limitMs) * 100 : 100;
    const isExpired = isActive && timeRemainingMs <= 0;
    const isWarning = timerPercent < 30;

    return { timeRemainingMs, timerPercent, isExpired, isWarning, isActive, resetTimer };
}
