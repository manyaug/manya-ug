/**
 * DynamicModeService
 * ==================
 * Centralized logic for Premium MCQ modes (Speedrun, Reverse, Streak, Earthquake).
 * This service calculates the next mode based on performance and triggers 
 * global events for the UI overlay to react.
 */

import { audioService } from '../../infrastructure/audio/audioService';

class DynamicModeService {
    constructor() {
        this.metrics = {
            consecutiveCorrect: 0,
            wrongStreak: 0,
            mastery: 0,
            totalAnswered: 0
        };
        
        this.currentMode = 'normal';
        this.timer = null;
        this.onTimeout = null;
    }

    /**
     * Update metrics and check for triggers
     */
    update(isCorrect, mastery, totalSteps, currentStepIdx) {
        this.metrics.totalAnswered++;
        this.metrics.mastery = mastery;
        
        if (isCorrect) {
            this.metrics.consecutiveCorrect++;
            this.metrics.wrongStreak = 0;
            
            // Trigger Streak Power at 4 correct in a row
            if (this.metrics.consecutiveCorrect === 4) {
                this.triggerStreakPower();
            }
        } else {
            this.metrics.consecutiveCorrect = 0;
            this.metrics.wrongStreak++;
        }

        // Trigger Earthquake if near completion (80%+ mastery and 2 or fewer steps left)
        const remaining = totalSteps - (currentStepIdx + 1);
        if (mastery >= 80 && remaining <= 2 && remaining >= 0) {
            this.triggerEarthquake();
        }
    }

    triggerEarthquake() {
        window.dispatchEvent(new CustomEvent('manya-fx-earthquake'));
        audioService.playSFX('rumble');
    }

    /**
     * Generate a Reverse Question from a normal MCQ.
     * Logic replicated from manya_logic/dynamicModeSelector.js
     * 
     * In reverse mode:
     * - The original CORRECT ANSWER text becomes the new question prompt.
     * - The original QUESTION text becomes the CORRECT option.
     * - Texts from other questions in the pool become the WRONG options (distractors).
     */
    generateReverseQuestion(normalQuestion, distractorPool) {
        if (!normalQuestion || !normalQuestion.options) return null;
        
        // 1. Get the correct answer text from the original question
        const options = normalQuestion.options;
        const correctIdx = this.resolveCorrectIndex(normalQuestion.answer || normalQuestion.correctAnswer, options);
        if (correctIdx === -1) return null;
        
        const correctAnswerText = options[correctIdx];
        const originalQuestionText = normalQuestion.question || normalQuestion.text;
        
        if (!correctAnswerText || !originalQuestionText) {
            console.warn("[DynamicMode] Reverse generation failed: Missing text", { correctAnswerText, originalQuestionText });
            return null;
        }

        // 2. The reversed prompt: "Which question matches this answer?"
        const reverseQuestionText = `🔁 Which question has this answer?\n\n"${correctAnswerText}"`;

        // 3. Get distractors from other questions' texts in the pool
        const otherQuestions = (distractorPool || [])
            .filter(q => q.id !== normalQuestion.id && (q.question || q.text) !== originalQuestionText)
            .map(q => q.question || q.text)
            .filter(txt => !!txt && txt.length > 5);
        
        // Unique distractors
        const uniqueDistractors = [...new Set(otherQuestions)]
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

        // If we don't have enough variety, we can't make a good reverse question
        if (uniqueDistractors.length < 3) {
            console.warn("[DynamicMode] Not enough distractors for Reverse mode");
            return null;
        }

        // 4. Create options array with the original question text as the correct one
        const finalOptions = [originalQuestionText, ...uniqueDistractors]
            .sort(() => 0.5 - Math.random());

        const newCorrectIdx = finalOptions.indexOf(originalQuestionText);
        const letters = ['A', 'B', 'C', 'D'];

        console.log(`[DynamicMode] Reverse Generated: Prompt="${correctAnswerText}", CorrectIdx=${newCorrectIdx}`);

        return {
            ...normalQuestion,
            id: `reverse-${normalQuestion.id}`,
            question: reverseQuestionText,
            text: reverseQuestionText,
            options: finalOptions,
            answer: `Option_${letters[newCorrectIdx]}`,
            correctAnswer: `Option_${letters[newCorrectIdx]}`,
            isReverse: true,
            isReversed: true,
            hint: `🔁 Think back: What was the question that gave "${correctAnswerText}" as the answer?`
        };
    }

    /**
     * Resolve the correct answer index from various answer formats.
     * Supports: "Option_A", "A", direct text match, numeric index
     */
    resolveCorrectIndex(answer, options) {
        if (answer == null || !options) return -1;
        const a = String(answer).trim();

        // 1. "Option_A" or "Option A" → 0, 1, 2, 3
        const optMatch = a.match(/^option[ _]([a-d])$/i);
        if (optMatch) return optMatch[1].toUpperCase().charCodeAt(0) - 65;

        // 2. Single letter "A" → 0
        if (a.length === 1 && /^[a-d]$/i.test(a)) return a.toUpperCase().charCodeAt(0) - 65;

        // 3. Direct text match (most reliable if it's the full answer text)
        const directIdx = options.findIndex(o => 
            String(o).trim().toLowerCase() === a.toLowerCase()
        );
        if (directIdx !== -1) return directIdx;

        // 4. Numeric index (0, 1, 2, 3)
        const num = parseInt(a, 10);
        if (!isNaN(num) && num >= 0 && num < options.length) return num;

        return -1;
    }

    /**
     * Determine the next mode based on performance
     * @param {string|null} forceMode - Manually requested mode
     * @param {string} nodeType - WARMUP, EXPLORE, PRACTICE, REINFORCE, MASTERY
     */
    getNextMode(forceMode = null, nodeType = 'PRACTICE') {
        const type = String(nodeType).toUpperCase();
        
        // 1. Force override (if any)
        if (forceMode && forceMode !== 'random') return forceMode;

        // 2. Study Protection: Never trigger challenges in study nodes
        if (type === 'WARMUP' || type === 'EXPLORE' || type === 'LESSON') {
            return 'normal';
        }

        const rand = Math.random();
        
        // 3. Performance-based injection (Only in Practice/Mastery)
        if (this.metrics.wrongStreak === 0 && this.metrics.totalAnswered >= 1) {
            if (rand < 0.30) {
                console.log("⚡ [DynamicMode] Injecting SPEEDRUN");
                return 'speedrun'; 
            }
            if (rand < 0.60) {
                console.log("🔁 [DynamicMode] Injecting REVERSE");
                return 'reverse'; 
            }
        }

        return 'normal';
    }

    triggerStreakPower() {
        window.dispatchEvent(new CustomEvent('manya-fx-streak', { detail: { count: 4 } }));
        audioService.playSFX('magic_positive'); // Ensure this exists in audioService
    }

    startSpeedrun(timeLimit = 18, onTimeout) {
        if (this.timer) clearInterval(this.timer);
        this.currentMode = 'speedrun';
        this.onTimeout = onTimeout;
        this.timeLeft = timeLimit;
        
        window.dispatchEvent(new CustomEvent('manya-fx-speedrun-start', { 
            detail: { duration: timeLimit } 
        }));

        this.timer = setInterval(() => {
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.stopSpeedrun();
                if (this.onTimeout) this.onTimeout();
            }
        }, 1000);
    }

    stopSpeedrun() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.currentMode = 'normal';
        window.dispatchEvent(new CustomEvent('manya-fx-speedrun-stop'));
    }

    reset() {
        this.metrics = {
            consecutiveCorrect: 0,
            wrongStreak: 0,
            mastery: 0,
            totalAnswered: 0
        };
        this.currentMode = 'normal';
    }
}

export const dynamicModeService = new DynamicModeService();
