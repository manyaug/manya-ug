/**
 * MANYA HEADLESS QUEST ENGINE
 * ============================
 * Ported from D:\manya_garage\manya_logic\manya-app\server\engines\questEngine.js
 * Pure Javascript, completely decoupled from Postgres and React contexts for MAUI hybrid compatibility.
 */

export const QuestEngineCore = {
    // Spec configuration parameters
    params: {
        masteryUnlock: 75,
        frustrationThreshold: 70,
        confidenceThreshold: 75,
        hintUsageThreshold: 45,
        consecutiveErrorThreshold: 2,
        baseLength: 10,
        maxLength: 20,
        quickFireThreshold: 65,
        timedThreshold: 70
    },

    /**
     * Calculates dynamic quest length (8-20 questions based on struggle/frustration).
     * @param {Object} userState 
     * @param {number} questId 
     * @returns {number} The expected length of the quest.
     */
    calculateQuestLength: (userState, questId) => {
        const baseLengths = {
            1: 6,  // Quest 1: 6 questions (warm-up)
            2: 8,  // Quest 2: 8 questions
            3: 10, // Quest 3: 10 questions
            4: 10, // Quest 4: 10 questions
            5: 12  // Quest 5: 12 questions (mastery)
        };
        
        let length = baseLengths[questId] || 8;
        
        // Only apply elongation for Quests 3-5 (forcing repetition if struggling)
        if (questId >= 3) {
            if (userState.overallAccuracy < 60 || 
                userState.hintUsage > QuestEngineCore.params.hintUsageThreshold || 
                userState.frustration > QuestEngineCore.params.frustrationThreshold) {
                // Add 2 to 5 extra questions
                length += Math.floor(Math.random() * 4) + 2;
            }
        }
        
        const caps = { 1: 8, 2: 10, 3: 15, 4: 15, 5: 20 };
        return Math.min(length, caps[questId] || 15);
    },

    /**
     * Determine variant distribution percentages per quest.
     * @param {number} questId 
     */
    getVariantDistribution: (questId) => {
        const distributions = {
            1: { V1: 0.8, V2: 0.2, V3: 0.0 },
            2: { V1: 0.5, V2: 0.4, V3: 0.1 },
            3: { V1: 0.3, V2: 0.45, V3: 0.25 },
            4: { V1: 0.2, V2: 0.5, V3: 0.3 },
            5: { V1: 0.1, V2: 0.15, V3: 0.75 }
        };
        return distributions[questId] || distributions[1];
    },

    /**
     * Modifies the game mode dynamically depending on frustration and competence.
     * @param {Object} userState 
     * @param {number} questId 
     * @returns {'none' | 'quickfire' | 'timed' | 'marathon'}
     */
    selectGameMode: (userState, questId) => {
        // Priority 1: Frustration guardrail suppresses all intense modes
        if (userState.frustration > QuestEngineCore.params.frustrationThreshold) {
            return 'none';
        }
        
        // Priority 2: QuickFire (High confidence + high accuracy + fast)
        if (userState.confidence >= QuestEngineCore.params.confidenceThreshold &&
            userState.overallAccuracy >= QuestEngineCore.params.quickFireThreshold &&
            userState.avgResponseTime < 15) {
            return 'quickfire';
        }
        
        // Priority 3: Timed (Quest 5 Boss Only)
        if (questId === 5 && 
            userState.confidence >= QuestEngineCore.params.confidenceThreshold &&
            userState.overallTopicAccuracy >= QuestEngineCore.params.timedThreshold) {
            return 'timed';
        }
        
        // Priority 4: Marathon (Endurance penalty)
        if (questId === 4 && 
            (userState.consecutiveErrors >= 2 || userState.hintUsage > 45)) {
            return 'marathon';
        }
        
        return 'none';
    },

    /**
     * Determines whether a Simulation should be randomly injected into the path.
     * @param {number} questId 
     * @param {Object} userState 
     * @returns {number} Ratio 0.0 to 1.0
     */
    getSimulationRatio: (questId, userState) => {
        console.log("🚀 [QuestCore] getSimulationRatio CALLED with questId:", questId);
        // Boosted base ratios: more sims as we go deeper
        const baseRatios = { 
            1: 0.15, // Quest 1: 15%
            2: 0.25, // Quest 2: 25%
            3: 0.40, // Quest 3: 40%
            4: 0.45, // Quest 4: 45%
            5: 0.50  // Quest 5: 50%
        };
        
        let ratio = baseRatios[questId] || 0.25;
        
        // Boost if confidence high but accuracy low (indicates student is ready for challenge but needs better intuition)
        if (userState.confidence >= 75 && userState.overallTopicAccuracy < 60) {
            ratio += 0.10;
        }
        
        // Boost if highly frustrated (interactive content helps break the cycle)
        if (userState.frustration > 60) {
            ratio += 0.15;
        }
        
        return Math.min(0.60, ratio); // Cap at 60% for maximum engagement
    },

    getQuestMetadata: (questId, challengeName) => {
        const names = ['Warm-up', 'Exploration', 'Practice', 'Reinforcement', 'Mastery'];
        const descriptions = [
            `Get started with the basics of ${(challengeName || '').toLowerCase()}`,
            `Explore deeper concepts in ${(challengeName || '').toLowerCase()}`,
            `Practice applying your knowledge of ${(challengeName || '').toLowerCase()}`,
            `Reinforce what you've learned about ${(challengeName || '').toLowerCase()}`,
            `Master ${(challengeName || '').toLowerCase()} with challenging questions`
        ];
        const icons = ['🟢', '🟡', '🟠', '🔴', '⚡'];

        return {
            name: `Quest ${questId}: ${names[questId - 1] || 'Bonus'}`,
            description: descriptions[questId - 1] || '',
            icon: icons[questId - 1] || '✨'
        };
    }
};
