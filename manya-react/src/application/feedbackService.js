/**
 * MANYA FEEDBACK SERVICE v1.2 (Universal & Intelligent)
 * --------------------------------------------------
 * Centralizes all motivational feedback logic.
 */

import { audioService } from '../infrastructure/audio/audioService';

const CHEERS = [
    "AMAZING!", "AWESOME!", "BRILLIANT!", "WOW!", "EXCELLENT!", 
    "CHAMPION!", "SUPERB!", "MAGNIFICENT!", "SPOT ON!", "ROYAL WIN!"
];

const MASCOT_PRAISE = [
    "You're doing great!", "Spot on!", "Fantastic job!", 
    "Keep it up!", "Brilliant work!", "You've got this!", 
    "Excellent choice!", "Perfect!", "Wow!", "Amazing!",
    "On fire! 🔥", "You're a star! ⭐", "Unstoppable!", "Incredible!",
    "So smart! 🧠", "Love that energy!", "Keep shining!", "Genius move!"
];

const GROWTH_MINDSET = [
    "🌱 We grow from this!",
    "🧠 Mistakes build knowledge!",
    "💪 Every try counts!",
    "✨ Learning is a journey!",
    "🎯 Closer every time!",
    "🌟 Great effort! Let's see why.",
    "🚀 Keep going, you've got this!"
];

let globalStreak = 0;

export const feedbackService = {
    /**
     * Triggers a unified feedback sequence for a correct answer or completed step.
     */
    triggerCorrect: (subject = 'math', result = {}) => {
        const isStudy = result.type === 'study' || result.isStudyStep;
        
        if (isStudy) {
            // Calm, focused feedback for study steps
            window.dispatchEvent(new CustomEvent('manya-mascot-speak', { 
                detail: { text: "Insight gained! Let's keep learning.", subject } 
            }));
            audioService.playSFX('pop'); // Subtle 'ding' for study
            return;
        }

        globalStreak++;
        
        // 1. Determine the motivating word (Flash) by picking a voiceover file name
        const voiceFiles = [
            'Amazing', 'Awesome', 'Bam', 'Bravo', 'Champion',
            'Correct', 'Epic', 'Great', 'Super', 'Well Done',
            'Wow', 'You are Sharp'
        ];
        const selectedVoice = voiceFiles[Math.floor(Math.random() * voiceFiles.length)];
        const word = selectedVoice.toUpperCase() + '!';
        
        // 2. Determine Mascot Message
        let mascotMsg = MASCOT_PRAISE[Math.floor(Math.random() * MASCOT_PRAISE.length)];
        
        // Override with Streak messages
        if (globalStreak === 3) mascotMsg = "3 in a row! You're on fire! 🔥";
        else if (globalStreak === 5) mascotMsg = "5 correct! Unstoppable! 🚀";
        else if (globalStreak === 10) mascotMsg = "10 in a row?! Absolute genius! 🧠";
        else if (globalStreak > 5 && globalStreak % 3 === 0) {
            mascotMsg = `${globalStreak} in a row! Incredible momentum!`;
        }

        // 3. Dispatch Unified Events
        window.dispatchEvent(new CustomEvent('manya-feedback-flash', { 
            detail: { type: 'correct', word } 
        }));

        window.dispatchEvent(new CustomEvent('manya-mascot-speak', { 
            detail: { text: mascotMsg, subject } 
        }));

        // 4. Play Audio (Managed centrally)
        audioService.playSFX('correct'); 
        
        // play voice booster instantly alongside the visual flash to avoid audio-visual lag
        audioService.playCorrectVoice(selectedVoice);
    },

    triggerWrong: (subject = 'math') => {
        const wasStreak = globalStreak >= 3;
        globalStreak = 0;

        const growthMsg = GROWTH_MINDSET[Math.floor(Math.random() * GROWTH_MINDSET.length)];

        window.dispatchEvent(new CustomEvent('manya-feedback-flash', { 
            detail: { type: 'wrong', word: null, message: growthMsg } 
        }));

        if (wasStreak) {
            window.dispatchEvent(new CustomEvent('manya-mascot-speak', { 
                detail: { text: "Aww, streak broken! But you're learning fast! 💪", subject } 
            }));
        } else {
            window.dispatchEvent(new CustomEvent('manya-mascot-speak', { 
                detail: { text: "Let's try again! You can do it!", subject } 
            }));
        }

        audioService.playSFX('mistake');
    },

    resetStreak: () => {
        globalStreak = 0;
    }
};
