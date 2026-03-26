/**
 * MANYA QUEST LOADER - v1.0
 * ===========================
 * Fetches and normalises any content JSON into a uniform steps[] array
 * that QuestRunner.jsx can iterate over step-by-step.
 *
 * Content path pattern:
 *   /content/{subject}/{unitId}/{questFolder}/{file}.json
 *
 * Each step has at least:
 *   { engineType, data, topic, mode }
 */

// Global in-memory cache for quest JSONs
const JSON_CACHE = {};

/**
 * Build the fetch URL for a content file.
 */
export function contentUrl(subject, unitId, questFolder, file) {
    if (!file) return '';
    const cleanFile = file.replace(/\.json$/, '');
    return `/content/${subject}/${unitId}/${questFolder}/${cleanFile}.json`;
}

/**
 * Resolve a referencePath (which may be relative or Windows-style) to a
 * fetch-able URL.  The engine stores them as absolute Windows paths like
 * "D:\manya_app\content\math\set_theory\..." — we extract the part from
 * "content" onwards.
 */
function resolveRef(referencePath, baseDir) {
    if (!referencePath) return null;
    // Already a clean web path
    if (referencePath.startsWith('/')) return referencePath;
    // Windows absolute path — extract from "content" onwards
    const lc = referencePath.toLowerCase().replace(/\\/g, '/');
    const idx = lc.indexOf('content/');
    if (idx !== -1) return '/' + referencePath.substring(idx).replace(/\\/g, '/');
    // Relative path — resolve against the base directory
    if (baseDir) return `/${baseDir}/${referencePath}`.replace(/\/+/g, '/');
    return null;
}

/**
 * Fetch a single content JSON and return a normalised steps[].
 *
 * @param {string} subject    e.g. 'math'
 * @param {string} unitId     e.g. 'set_theory'
 * @param {string} questFolder e.g. 'quest_01_finite_infinite_sets'
 * @param {string} file       e.g. 'study_finite_infinite' or '01-001'
 * @returns {Promise<{steps: Array, meta: object}>}
 */
export async function loadQuestSteps(subject, unitId, questFolder, file) {
    const url = contentUrl(subject, unitId, questFolder, file);
    
    // Return from cache if available
    if (JSON_CACHE[url]) {
        console.log(`⚡ [QuestLoader] Serving from cache: ${url}`);
        return JSON_CACHE[url];
    }

    console.log(`[QuestLoader] Fetching: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Content not found: ${url}`);

    const json = await res.json();
    let result;

    // ── CASE 1: Already a steps[] array (multi-step quest) ──────────────────
    if (Array.isArray(json.steps)) {
        const baseDir = `content/${subject}/${unitId}/${questFolder}`;
        const resolvedSteps = await Promise.all(
            json.steps.map(async (step) => {
                if (step.referencePath) {
                    const refUrl = resolveRef(step.referencePath, baseDir);
                    if (refUrl) {
                        try {
                            const refRes = await fetch(refUrl);
                            if (refRes.ok) step.data = await refRes.json();
                        } catch (_) { /* ignore fetch errors */ }
                    }
                }
                return normaliseStep(step);
            })
        );
        result = {
            steps: resolvedSteps,
            meta: { topic: json.topic || file, variantTitle: json.variantTitle }
        };
    } else {
        // ── CASE 2: Single step JSON ─────────────────────────────────────────────
        const step = normaliseStep(json);
        result = {
            steps: [step],
            meta: { topic: json.topic || file, variantTitle: json.variantTitle }
        };
    }

    // Save to cache
    JSON_CACHE[url] = result;
    return result;
}

/**
 * Normalise a raw step object so QuestRunner always gets the same shape:
 *   { engineType, data, topic, mode }
 */
function normaliseStep(raw) {
    return {
        engineType: raw.engineType || raw.engine || 'UNKNOWN',
        mode: raw.mode || 'quiz',
        topic: raw.topic || raw.variantTitle || '',
        // Pass the whole JSON as `data` — engines know what to use
        data: raw.data || raw,
    };
}
