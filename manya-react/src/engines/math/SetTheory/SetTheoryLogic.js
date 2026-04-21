import { Parser } from 'expr-eval';

/**
 * MANYA SET THEORY DOMAIN LOGIC
 * Reusable mathematical utilities for Set Theory simulations.
 */

export const REGION_MAP = {
    'intersection': ['center'],
    'union': ['left', 'center', 'right'],
    'left_total': ['left', 'center'],
    'right_total': ['right', 'center'],
    'complement_left': ['right', 'outside'],
    'complement_right': ['left', 'outside'],
    'outside': ['outside'],
    'left': ['left'],
    'right': ['right'],
    'center': ['center'],
    'symmetric_difference': ['left', 'right'],
    'universal_only': ['outside'],
    'left_only': ['left'],
    'right_only': ['right'],
    'universal_total': ['left', 'center', 'right', 'outside'],
    // Alias support for flexible curriculum tagging
    'set_a': ['left', 'center'],
    'set_b': ['right', 'center'],
    'a_only': ['left'],
    'b_only': ['right'],
    'f_only': ['left'],
    'v_only': ['right'],
    'both': ['center'],
    'a_complement': ['right', 'outside'],
    'b_complement': ['left', 'outside'],
    'not_a': ['right', 'outside'],
    'not_b': ['left', 'outside'],
    'complement_a': ['right', 'outside'],
    'complement_b': ['left', 'outside']
};

/**
 * Normalizes input strings for mathematical comparison (lowercase, trimmed, comma-sorted)
 */
export const normalize = (t) => {
    return String(t || "").toLowerCase().trim().replace(/[\{\}\s]/g, '').split(',').filter(x => x !== "").sort().join(',');
};

/**
 * Evaluates mathematical expressions using a secure sandbox.
 * Only evaluates strings that look like actual math formulas (contain operators, digits+letters, etc.).
 * Plain text labels like "M", "Sat", "Apple" are returned as-is.
 */
export const evaluateExpr = (expr, val) => {
    if (!expr || typeof expr !== 'string') return expr;
    const cleanVal = String(val || "").trim();
    if (!cleanVal || isNaN(cleanVal)) return expr;
    
    // Only evaluate if the expression looks like a math formula or a common variable:
    // Must contain math operators, digits alongside letters, or just be a single variable (x, y, z).
    const isSingleVar = /^[xyz]$/i.test(expr);
    const hasMathOp = /[+\-*/^]/.test(expr);
    const hasDigitAndLetter = /\d/.test(expr) && /[a-zA-Z]/.test(expr);
    
    if (!isSingleVar && !hasMathOp && !hasDigitAndLetter) return expr;
    
    try {
        const num = parseFloat(cleanVal);
        const parser = new Parser();
        return parser.evaluate(expr.toLowerCase().replace(/[a-z]/g, 'x'), { x: num });
    } catch (err) { 
        return expr; 
    }
};

/**
 * Resolves a high-level target region (e.g. 'union', 'left_only') into 
 * its constituent base zones (left, center, right, outside).
 */
export const resolveZones = (target) => {
    if (!target) return [];
    return REGION_MAP[target] || [target];
};

/**
 * Primary Validator for Set Theory Interactions
 */
export const validateInteraction = (params) => {
    const { currentStep, userAnswers, chips, activeSets, l, data, isTwoSet, selectedRegions } = params;
    let isCorrect = false;
    let corrected = "";

    // Helper: Safely count members across one or more target regions
    const getTargetMemberCount = (target) => {
        const zones = resolveZones(target);
        return zones.reduce((acc, z) => {
            const key = z === 'intersection' ? 'center' : z;
            const members = data.zones?.[key] || [];
            
            // Logic: In "Survey" style questions, a single numeric string (e.g. "8") 
            // represents the total pupils in that region. In "Theory" style, 
            // multiple elements or characters (e.g. "a", "b") represent individual members.
            if (members.length === 1 && !isNaN(members[0]) && parseInt(members[0]) > 2) {
                return acc + parseInt(members[0]);
            }
            return acc + members.length;
        }, 0);
    };

    if (currentStep.interaction === 'DRAG_SETS') {
        const d = Math.hypot(activeSets.a.x - activeSets.b.x, activeSets.a.y - activeSets.b.y);
        const rA = activeSets.a.r, rB = activeSets.b.r;
        const target = String(currentStep.items.find(it => it.target)?.target || "").toLowerCase();
        
        if (target.includes('inside') || target.includes('subset')) {
            isCorrect = (d + Math.min(rA, rB)) < (Math.max(rA, rB) + 25);
        } else if (target.includes('disjoint')) {
            isCorrect = d > (rA + rB) - 15;
        } else if (target.includes('overlap') || target.includes('intersection')) {
            isCorrect = d < (rA + rB) - 15 && d > Math.abs(rA - rB) + 15;
        }
    } else if (currentStep.interaction === 'DRAG_SORT') {
        isCorrect = chips.every(c => {
            let actual = "outside";
            const lcy = l?.cy || 300, lc1x = l?.c1?.x || 200, lc2x = l?.c2?.x || 400, lr = l?.r || 100;
            const d1 = Math.hypot(c.x - lc1x, c.y - lcy), d2 = Math.hypot(c.x - lc2x, c.y - lcy);
            if (!l?.isDisjoint && isTwoSet && d1 < lr && d2 < lr) actual = "center";
            else if (d1 < lr) actual = "left"; else if (d2 < lr && isTwoSet) actual = "right";
            return actual === c.target;
        });
    } else if (currentStep.interaction === 'CLICK_SUM' || currentStep.interaction === 'SHADE_REGION') {
        const expectedZones = resolveZones(currentStep.targetRegion);
        const selectedArr = Array.from(selectedRegions);
        isCorrect = selectedArr.length === expectedZones.length && expectedZones.every(z => selectedArr.includes(z));
        corrected = expectedZones.join(', ');
    } else if (currentStep.interaction === 'CHOICE' || currentStep.interaction === 'BINARY') {
        const userVal = Object.values(userAnswers).find(v => v !== '') || '';
        isCorrect = normalize(userVal) === normalize(currentStep.expected);
        corrected = String(currentStep.expected);
    } else if (currentStep.interaction === 'DIAGRAM_FILL') {
        isCorrect = (currentStep.inputs || []).every(inp => {
             return normalize(userAnswers[inp.region] || '') === normalize(inp.expected);
        });
        corrected = (currentStep.inputs || []).map(inp => `${inp.region}:${inp.expected}`).join(' | ');
    } else if (['ALGEBRA_SOLVE', 'ALGEBRA_SUBSTITUTE', 'ALGEBRA_EVAL', 'COUNT_SUM', 'COUNT', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT', 'REVERSE_SUBSET', 'REVERSE_PROPER_SUBSET', 'PROBABILITY', 'PROB', 'FRACTION'].includes(currentStep.type) || ['ALGEBRA_SOLVE', 'COUNT_SUM', 'COUNT', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT'].includes(currentStep.engineType)) {
        const userVal = String(Object.values(userAnswers).find(v => v !== '') || '').trim();
        let target = currentStep.expected || currentStep.answer || currentStep.expected_x || currentStep.expression;
        const xVal = currentStep.x_val || 0;

        // 1. Resolve Dynamic Metadata (Counting)
        if (currentStep.targetRegion && (!target || ['COUNT', 'COUNT_SUM', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT'].includes(currentStep.type))) {
            const n = getTargetMemberCount(currentStep.targetRegion);
            
            if (['SUBSET_COUNT', 'PROPER_SUBSET_COUNT'].includes(currentStep.type)) {
                target = (currentStep.type === 'SUBSET_COUNT') ? Math.pow(2, n) : Math.pow(2, n) - 1;
            } else if (!target || ['COUNT', 'COUNT_SUM'].includes(currentStep.type)) {
                target = n;
            }
        }

        // 2. Validate
        if (['SUBSET_COUNT', 'PROPER_SUBSET_COUNT', 'REVERSE_SUBSET', 'REVERSE_PROPER_SUBSET', 'COUNT', 'COUNT_SUM'].includes(currentStep.type) && !currentStep.expression) {
            // Numeric literal check
            if (['REVERSE_SUBSET', 'REVERSE_PROPER_SUBSET'].includes(currentStep.type)) {
                const val = parseInt(target);
                target = (currentStep.type === 'REVERSE_SUBSET') ? Math.log2(val) : Math.log2(val + 1);
            }
            
            // Standardize comparison: Use numbers for numeric types, normalization for others
            const parsedUser = parseInt(userVal);
            const parsedTarget = parseInt(target);
            
            if (!isNaN(parsedUser) && !isNaN(parsedTarget)) {
                isCorrect = parsedUser === parsedTarget;
            } else {
                isCorrect = normalize(userVal) === normalize(target);
            }
            corrected = String(target);
        } else {
            // Algebraic / Expression check
            const evaluatedTarget = evaluateExpr(String(target), xVal);
            
            // If the evaluated target is a plain number but user entered same number, it's correct.
            // Normalize handles cases like "24-6" matching "18" if we wanted, but usually we match literal or result.
            const userNormalized = normalize(userVal);
            const targetNormalized = normalize(String(evaluatedTarget));
            const userNumeric = parseInt(userNormalized);
            const targetNumeric = parseInt(targetNormalized);

            if (!isNaN(userNumeric) && !isNaN(targetNumeric)) {
                isCorrect = userNumeric === targetNumeric;
            } else {
                isCorrect = userNormalized === targetNormalized;
            }
            corrected = String(evaluatedTarget);
        }
    }

    return { isCorrect, corrected };
};
