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
 * Can take a single value (x) or an object of variables.
 */
export const evaluateExpr = (expr, vars = 0) => {
    if (!expr || typeof expr !== 'string') return expr;
    
    // Normalize vars to an object
    const variables = typeof vars === 'object' ? { ...vars } : { x: vars };
    
    // Only evaluate if the expression looks like a math formula or a common variable:
    const isVar = /^[a-z]$/i.test(expr);
    const hasMathOp = /[+\-*/^()]/.test(expr);
    const hasDigitAndLetter = /\d/.test(expr) && /[a-zA-Z]/.test(expr);
    const hasMultipleVars = /[a-z].*[a-z]/i.test(expr);
    
    if (!isVar && !hasMathOp && !hasDigitAndLetter && !hasMultipleVars) return expr;
    
    try {
        const parser = new Parser();
        // Standardize all variables in expression to lowercase for parser
        const cleanExpr = expr.toLowerCase();
        
        // Prepare context: numeric conversion of all variables
        const context = {};
        Object.keys(variables).forEach(k => {
            const val = parseFloat(variables[k]);
            if (!isNaN(val)) {
                const lowerK = k.toLowerCase();
                context[lowerK] = val;
            }
        });

        const result = parser.evaluate(cleanExpr, context);
        console.log(`[MathLogic] evaluateExpr("${expr}") result:`, result);
        
        return isNaN(result) ? expr : result;
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

    // Helper: Safely count members across one or more target regions (supports Algebra)
    const getTargetMemberCount = (target, vars, type) => {
        const zones = resolveZones(target);
        return zones.reduce((acc, z) => {
            const key = z === 'intersection' ? 'center' : z;
            const members = data.zones?.[key] || [];
            
            let zoneSum = 0;
            members.forEach(m => {
                // v8.5: Evaluate each member (e.g. "2y+8")
                const val = evaluateExpr(String(m), vars);
                const num = parseFloat(val);
                if (type === 'COUNT_SUM') {
                    zoneSum += isNaN(num) ? 0 : num;
                } else {
                    zoneSum += 1; // Standard behavior is to count the items
                }
            });
            return acc + zoneSum;
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
        let target = currentStep.expected || currentStep.answer || currentStep.expected_x || currentStep.expression || currentStep.expected_val || currentStep.expectedVal;
        if (target === '?' || (typeof target === 'string' && target.trim() === '?')) target = null;
        
        // Combine explicit x_val with anything solved in previous steps
        const vars = { 
            x: currentStep.x_val,
            ...(params.successfulAnswers || {}) 
        };

        // 1. Resolve Dynamic Metadata (Counting)
        if (currentStep.targetRegion && (!target || ['COUNT', 'COUNT_SUM', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT'].includes(currentStep.type))) {
            const n = getTargetMemberCount(currentStep.targetRegion, vars, currentStep.type);
            
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
                // If expected_val or expectedVal is specified, it represents the final answer directly.
                // We only perform the log2 conversion if target represents the subsets count (i.e. expected_val is not defined).
                if (currentStep.expected_val === undefined && currentStep.expectedVal === undefined) {
                    const val = parseInt(target);
                    target = (currentStep.type === 'REVERSE_SUBSET') ? Math.log2(val) : Math.log2(val + 1);
                }
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
            const evaluatedTarget = evaluateExpr(String(target), vars);
            
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

/**
 * Determines the actual number of active sets in a diagram based on definitions.
 */
export const getEffectiveSetCount = (data) => {
    if (!data) return 0;
    const sets = data.sets || {};
    let count = 0;
    if (sets.a || sets.A || sets.set_a) count++;
    if (sets.b || sets.B || sets.set_b) count++;
    return count;
};
