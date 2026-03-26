/**
 * MANYA QUESTION PARSER
 * ---------------------
 * Utility for parsing question IDs that follow the pattern: baseId-V1, baseId-V2, baseId-V3
 * Ported from: QUESTION FETCHER ENGINE/question-parser.js
 */

export function parseQuestionId(qId) {
    if (!qId) return { baseId: 'unknown', variant: 'V1', variantNum: 1 };
    
    // Pattern 1: Standard -V1, -V2
    const vMatch = qId.match(/^(.+)-V(\d+)$/i);
    if (vMatch) {
        return {
            baseId: vMatch[1],
            variant: 'V' + vMatch[2],
            variantNum: parseInt(vMatch[2])
        };
    }

    // Pattern 2: Rephrased suffixes (-R, -REP, -REPHRASED)
    const rMatch = qId.match(/^(.+)-(R|REP|REPHRASED)$/i);
    if (rMatch) {
        return {
            baseId: rMatch[1],
            variant: 'REPHRASED',
            variantNum: 1
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
