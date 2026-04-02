/**
 * MANYA SOLUTION VISUALIZER - v3.7 (Pure JS)
 * -----------------------------------------
 * A robust "Healing Parser" that extracts Logic, Working, and Answers 
 * from math solution JSON. This file is PURE JS to avoid SyntaxErrors 
 * in non-JSX environments.
 */

/**
 * parseSolutionToSteps
 * --------------------
 * High-resiliency parser that turns any raw input into a structured array of steps.
 */
export function parseSolutionToSteps(raw) {
    if (!raw) return [];

    let data = null;

    // 1. TRY: Standard JSON Parse (Recursive)
    try {
        let clean = typeof raw === 'string' ? raw.trim() : JSON.stringify(raw);
        clean = clean.replace(/```json/g, '').replace(/```/g, '').trim();

        let iterations = 0;
        let temp = clean;
        while (iterations < 3) {
            try {
                const parsed = JSON.parse(temp);
                if (typeof parsed === 'object' && parsed !== null) {
                    data = parsed;
                    break;
                }
                if (typeof parsed === 'string') temp = parsed;
                else break;
            } catch (e) { break; }
            iterations++;
        }
    } catch (e) { /* silent */ }

    // 2. HEALING: Regex-based extraction if JSON parse failed or result is invalid
    if (!data || (!data.logic && !data.calculation && !data.answer)) {
        data = {
            logic:       extractField(raw, 'logic'),
            calculation: extractField(raw, 'calculation'),
            answer:      extractField(raw, 'answer')
        };
    }

    // 3. MAP TO VISUAL STEPS
    const steps = [];
    
    if (data.logic && data.logic.length > 2) {
        steps.push({
            id: 'step-logic',
            type: 'LOGIC',
            label: 'Concept Logic',
            iconName: 'Lightbulb',
            color: 'var(--manya-purple)',
            bg: 'rgba(124, 58, 237, 0.1)',
            text: cleanMathText(data.logic)
        });
    }

    if (data.calculation && data.calculation.length > 2) {
        steps.push({
            id: 'step-working',
            type: 'WORKING',
            label: 'Step-by-Step Working',
            iconName: 'Zap',
            color: 'var(--manya-gold)',
            bg: 'rgba(245, 158, 11, 0.1)',
            text: cleanMathText(data.calculation)
        });
    }

    if (data.answer && data.answer.length > 0) {
        steps.push({
            id: 'step-answer',
            type: 'RESULT',
            label: 'Final Result',
            iconName: 'Trophy',
            color: 'var(--manya-green)',
            bg: 'rgba(16, 185, 129, 0.1)',
            text: cleanMathText(data.answer)
        });
    }

    // FINAL FALLBACK: If nothing was extracted, return the raw text as a general explanation step
    if (steps.length === 0 && typeof raw === 'string' && raw.length > 5) {
        steps.push({
            id: 'step-fallback',
            type: 'EXPLANATION',
            label: 'Detailed Explanation',
            iconName: 'HelpCircle',
            color: 'var(--manya-purple)',
            bg: 'rgba(124, 58, 237, 0.1)',
            text: cleanMathText(raw)
        });
    }

    return steps;
}

/**
 * extractField
 * ------------
 * Uses regex to "carve out" values from malformed JSON-like strings.
 */
function extractField(str, fieldName) {
    if (typeof str !== 'string') return '';
    
    // Look for patterns like "logic": "value" or "logic":"value"
    // Handles greedy vs non-greedy matching to avoid capturing the whole string
    const regex = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i');
    const match = str.match(regex);
    
    if (match && match[1]) {
        // Unescape internal quotes or escaped chars
        return match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim();
    }
    
    return '';
}

/**
 * cleanMathText
 * -------------
 * Basic cleanup for math-heavy strings.
 */
function cleanMathText(text) {
    if (!text) return '';
    return text
        .replace(/\\n/g, '\n') // Force newlines
        .replace(/\^/g, '<sup>^</sup>') // Simple superscript hint
        .trim();
}
