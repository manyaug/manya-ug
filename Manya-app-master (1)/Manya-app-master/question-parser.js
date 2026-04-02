// question-parser.js
class QuestionParser {
    static parseId(qId) {
        const match = qId.match(/^(.+)-V(\d+)$/);
        if (match) {
            return {
                baseId: match[1],
                variant: 'V' + match[2],
                variantNum: parseInt(match[2])
            };
        }
        return {
            baseId: qId,
            variant: 'V1',
            variantNum: 1
        };
    }

    static extractTopic(qId) {
        const parts = qId.split('-');
        return parts[0] + '-' + parts[1];
    }

    static areSameConcept(qId1, qId2) {
        const parsed1 = this.parseId(qId1);
        const parsed2 = this.parseId(qId2);
        return parsed1.baseId === parsed2.baseId;
    }

    static getVariantsForBase(baseId, maxVariant = 3) {
        return Array.from({ length: maxVariant }, (_, i) => 
            `${baseId}-V${i + 1}`
        );
    }

    static isVariantSpacingRespected(lastQuestionId, newQuestionId, minQuestionsBetween = 5) {
        if (!lastQuestionId) return true;
        const sameConcept = this.areSameConcept(lastQuestionId, newQuestionId);
        if (!sameConcept) return true;
        return false;
    }

    static getNextVariant(currentVariant, masteryLevel) {
        const variantNum = parseInt(currentVariant.substring(1));
        switch(masteryLevel) {
            case 'struggling':
                return currentVariant;
            case 'learning':
                return variantNum < 3 ? `V${variantNum + 1}` : currentVariant;
            case 'mastered':
                return `V${Math.min(3, variantNum + 1)}`;
            default:
                return 'V1';
        }
    }
}

module.exports = QuestionParser;