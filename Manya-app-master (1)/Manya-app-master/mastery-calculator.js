// mastery-calculator.js
const QuestionParser = require('./question-parser');

class MasteryCalculator {
    static calculateConceptMastery(variants) {
        if (!variants || variants.length === 0) return 'new';
        
        const v1 = variants.find(v => v.Q_ID.endsWith('-V1'));
        const v2 = variants.find(v => v.Q_ID.endsWith('-V2'));
        const v3 = variants.find(v => v.Q_ID.endsWith('-V3'));
        
        if (!v1?.attempts && !v2?.attempts && !v3?.attempts) return 'new';
        
        const v1Acc = v1?.attempts ? v1.correct / v1.attempts : 0;
        const v2Acc = v2?.attempts ? v2.correct / v2.attempts : 0;
        const v3Acc = v3?.attempts ? v3.correct / v3.attempts : 0;
        
        if (v3?.attempts >= 3 && v3Acc >= 0.8) return 'mastered';
        if (v2?.attempts >= 3 && v2Acc >= 0.8) return 'ready_for_v3';
        if (v1?.attempts >= 3 && v1Acc >= 0.8) return 'ready_for_v2';
        
        if (v1?.attempts >= 2 && v1Acc < 0.6) return 'struggling_v1';
        if (v2?.attempts >= 2 && v2Acc < 0.6) return 'struggling_v2';
        if (v3?.attempts >= 2 && v3Acc < 0.6) return 'struggling_v3';
        
        if (v1?.attempts > 0 || v2?.attempts > 0 || v3?.attempts > 0) return 'learning';
        
        return 'new';
    }

    static getNextVariant(conceptVariants, mastery, sessionHistory = []) {
        const v1 = conceptVariants.find(v => v.Q_ID.endsWith('-V1'));
        const v2 = conceptVariants.find(v => v.Q_ID.endsWith('-V2'));
        const v3 = conceptVariants.find(v => v.Q_ID.endsWith('-V3'));
        
        const recentVariants = sessionHistory
            .filter(q => QuestionParser.areSameConcept(q, conceptVariants[0]?.Q_ID))
            .map(q => QuestionParser.parseId(q).variant);
        
        switch(mastery) {
            case 'new':
                return { variant: 'V1', reason: 'New concept - start with basics' };
            case 'struggling_v1':
                if (recentVariants.includes('V1')) {
                    return { variant: 'V1', reason: 'Still struggling - try different V1', different: true };
                }
                return { variant: 'V1', reason: 'More V1 practice needed' };
            case 'struggling_v2':
                if (recentVariants.includes('V1')) {
                    return { variant: 'V2', reason: 'Continue V2 practice' };
                }
                return { variant: 'V1', reason: 'Review V1 before continuing V2' };
            case 'struggling_v3':
                if (recentVariants.includes('V2')) {
                    return { variant: 'V3', reason: 'Try V3 again' };
                }
                return { variant: 'V2', reason: 'Strengthen V2 before V3' };
            case 'ready_for_v2':
                if (recentVariants.includes('V2')) {
                    return { variant: 'V2', reason: 'More V2 practice' };
                }
                return { variant: 'V2', reason: 'Ready for V2 - application level' };
            case 'ready_for_v3':
                if (recentVariants.includes('V3')) {
                    return { variant: 'V3', reason: 'Deepen V3 understanding' };
                }
                return { variant: 'V3', reason: 'Ready for V3 - mastery level' };
            case 'mastered':
                const oldestVariant = [v1, v2, v3]
                    .filter(v => v?.attempts > 0)
                    .sort((a, b) => (a.daysSinceLast || 999) - (b.daysSinceLast || 999))[0];
                if (oldestVariant && (oldestVariant.daysSinceLast || 0) > 7) {
                    const variant = oldestVariant.Q_ID.slice(-2);
                    return { variant, reason: `Mastered - weekly review of ${variant}` };
                }
                return { variant: 'V3', reason: 'Mastered - seeking challenge' };
            default:
                return { variant: 'V1', reason: 'Continue learning path' };
        }
    }

    static calculateCurrentTopic(userStats, topicsInOrder) {
        if (!userStats || userStats.length === 0) return topicsInOrder[0];
        
        const topicMastery = {};
        
        userStats.forEach(stat => {
            if (!stat || !stat.Q_ID) return;
            const parsed = QuestionParser.parseId(stat.Q_ID);
            const topicPrefix = parsed.baseId.split('-').slice(0, 2).join('-');
            
            if (!topicMastery[topicPrefix]) {
                topicMastery[topicPrefix] = { total: 0, mastered: 0 };
            }
            
            if (stat.attempts >= 3 && stat.correct / stat.attempts >= 0.8) {
                topicMastery[topicPrefix].mastered++;
            }
            topicMastery[topicPrefix].total++;
        });
        
        for (const topic of topicsInOrder) {
            const mastery = topicMastery[topic];
            if (!mastery || mastery.mastered < mastery.total * 0.7) {
                return topic;
            }
        }
        
        return topicsInOrder[topicsInOrder.length - 1];
    }

    static needsWarmup(userStats, sessionCount) {
        if (!userStats || userStats.length === 0) return true;
        
        const lastSession = userStats
            .filter(s => s.lastSeen)
            .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))[0];
        
        if (lastSession && lastSession.lastSeen) {
            const hoursSinceLast = (Date.now() - new Date(lastSession.lastSeen)) / (1000 * 60 * 60);
            if (hoursSinceLast > 12) return true;
        }
        
        return sessionCount % 5 === 0;
    }
}

module.exports = MasteryCalculator;