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

    // Pattern 2: Rephrased suffixes (-R, -R1, -REP, -REP2, -REPHRASED)
    const rMatch = qId.match(/^(.+)-(R|REP|REPHRASED)\d*$/i);
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
/**
 * resolveSolutionJSON
 * -------------------
 * Highly robust recursive parser that handles deeply stringified or malformed JSON.
 * It will attempt to flatten double-stringified objects and return a standard
 * { logic, calculation, answer } object with at least one non-empty field.
 */
export function resolveSolutionJSON(raw) {
    if (!raw) return null;
    
    // If it's already an object with the expected fields, validate it.
    if (typeof raw === 'object' && raw !== null && (raw.logic || raw.calculation || raw.answer)) {
        return {
            logic: String(raw.logic || ''),
            calculation: String(raw.calculation || ''),
            answer: String(raw.answer || '')
        };
    }

    let parsed = null;
    try {
        let clean = String(raw).trim();
        
        // 1. Strip markdown wrappers
        clean = clean.replace(/```json/g, '').replace(/```/g, '').trim();

        // 2. Recursive Parsing (Flatten double-stringified JSON)
        let iterations = 0;
        while (iterations < 3 && typeof clean === 'string' && (clean.startsWith('{') || (clean.startsWith('"') && clean.includes('{')) )) {
            try {
                // If it's a quoted JSON string ("{...}"), we need one JSON.parse to get the JSON string
                if (clean.startsWith('"') && clean.endsWith('"')) {
                    clean = JSON.parse(clean);
                } else if (clean.startsWith('{')) {
                    parsed = JSON.parse(clean);
                    break; // Success
                } else { break; }
            } catch (e) { break; }
            iterations++;
        }

        // 3. Fallback: Check if it's already an object after parsing
        if (typeof clean === 'object' && clean !== null) parsed = clean;

    } catch (e) {
        parsed = null;
    }

    // Normalize result: Ensure it has at least one meaningful field
    if (parsed && (parsed.logic || parsed.calculation || parsed.answer)) {
        return {
            logic: String(parsed.logic || ''),
            calculation: String(parsed.calculation || ''),
            answer: String(parsed.answer || '')
        };
    }

    return null; // Triggers raw fallback in UI
}
