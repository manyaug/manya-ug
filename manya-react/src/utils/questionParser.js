/**
 * MANYA QUESTION PARSER
 * ---------------------
 * Utility for parsing question IDs that follow the pattern: baseId-V1, baseId-V2, baseId-V3
 * Ported from: QUESTION FETCHER ENGINE/question-parser.js
 */

export function parseQuestionId(qId) {
    if (!qId) return { baseId: 'unknown', variant: 'V1', variantNum: 1 };
    const match = qId.match(/^(.+)-V(\d+)$/);
    if (match) {
        return {
            baseId: match[1],
            variant: 'V' + match[2],
            variantNum: parseInt(match[2])
        };
    }
    return { baseId: qId, variant: 'V1', variantNum: 1 };
}

export function extractTopic(qId) {
    const parts = (qId || '').split('-');
    return parts.length >= 2 ? parts[0] + '-' + parts[1] : qId;
}

export function areSameConcept(qId1, qId2) {
    return parseQuestionId(qId1).baseId === parseQuestionId(qId2).baseId;
}

export function getVariantsForBase(baseId, maxVariant = 3) {
    return Array.from({ length: maxVariant }, (_, i) => `${baseId}-V${i + 1}`);
}
