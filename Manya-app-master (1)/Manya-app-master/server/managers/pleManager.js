// PLE Ratio Manager

class PLERatioManager {
    constructor() {
        this.defaultRatio = 2;
        this.minRatio = 1;
        this.maxRatio = 3;
    }

    calculateOptimalRatio(userStats) {
        let ratio = this.defaultRatio;
        const factors = [];

        const totalAnswers = userStats.totalAnswered || 0;
        const totalCorrect = userStats.totalCorrect || 0;
        const accuracy = totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0;

        if (accuracy < 50) {
            ratio = Math.max(this.minRatio, ratio - 0.5);
            factors.push('low_accuracy');
        } else if (accuracy > 80) {
            ratio = Math.min(this.maxRatio, ratio + 0.5);
            factors.push('high_accuracy');
        }

        ratio = Math.max(this.minRatio, Math.min(this.maxRatio, ratio));

        return {
            ratio: Math.round(ratio * 2) / 2,
            factors,
            plePercentage: Math.round((ratio / (ratio + 1)) * 100),
            practicePercentage: Math.round((1 / (ratio + 1)) * 100)
        };
    }

    selectNextPool(history = [], targetRatio = 2) {
        if (history.length < 5) {
            return { pool: 'yes', reason: 'Building history' };
        }

        const recentPLE = history.filter(q => q.mark === 'yes').length;
        const recentPractice = history.filter(q => q.mark === 'no').length;
        const currentPLE = recentPLE / (recentPractice || 1);

        if (currentPLE < targetRatio) return { pool: 'yes', reason: 'Need more PLE' };
        if (currentPLE > targetRatio + 0.5) return { pool: 'no', reason: 'Balancing with practice' };
        return { pool: Math.random() < 0.7 ? 'yes' : 'no', reason: 'Maintaining balance' };
    }
}

module.exports = PLERatioManager;