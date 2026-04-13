/**
 * MANYA QUEST LOADER - v2.0 (Database-First)
 * =========================================
 * Now powered by the Manya Vault (Supabase).
 * Fetches curriculum by QID and normalises it into a uniform steps[] array.
 * Fallback to local /content/ folders if the database record is missing.
 */
import { supabase } from '../services/supabaseClient';

const JSON_CACHE = {};

// PRODUCTION CDN (Using raw.githubusercontent to bypass jsDelivr's 24-hour cache during rapid iteration)
const CDN_URL = 'https://raw.githubusercontent.com/manyaug/manya-react-assets/main/content/';
const BASE_CONTENT_URL = CDN_URL;

/**
 * Resolves the parameters into a standardized QID for Database lookup
 */
function resolveQid(subject, unitId, questFolder, file) {
    if (!file) return null;
    const filename = file.replace(/\.json$/, '');
    
    // Direct ID mapping (Handles ENG-quest-p7-001 etc)
    if (filename.startsWith('ENG-') || filename.startsWith('PQ-')) {
        return filename;
    }

    // Pattern: 04-015 (Standard Quest ID)
    if (/^\d+-\d+/.test(filename)) {
        return filename;
    }
    
    // Pattern: TOPIC_SUBTOPIC_FILENAME (Standard Simulation/Note ID)
    const topic = (unitId || 'GENERAL').toUpperCase();
    const subtopic = (questFolder || 'QUEST').toUpperCase();
    const cleanFile = filename.toUpperCase().replace(/-/g, '_');
    
    // 🧠 ADVANCED DEDUPLICATION:
    // If Topic is "LOCATING_AFRICA" and Subtopic is "QUEST_1_WORLD_STAGE"
    // and cleanFile is "QUEST_1_WORLD_STAGE" -> Merge them.
    let parts = [topic, subtopic, cleanFile];
    let uniqueParts = [];
    parts.forEach(p => {
        if (!uniqueParts.some(up => up.includes(p) || p.includes(up))) {
            uniqueParts.push(p);
        }
    });

    return uniqueParts.join('_');
}

/**
 * Build the fetch URL for a content file (Legacy/Fallback mode)
 */
export function contentUrl(subject, unitId, questFolder, file) {
    if (!file) return '';
    const cleanFile = file.replace(/\.json$/, '');
    return `${BASE_CONTENT_URL}${subject}/${unitId}/${questFolder}/${cleanFile}.json`;
}

/**
 * Resolve a referencePath (which may be relative or Windows-style) to a fetch-able URL.
 */
function resolveRef(referencePath, baseDir) {
    if (!referencePath) return null;
    
    if (referencePath.startsWith('http')) return referencePath;

    if (referencePath.startsWith('/content/')) {
        return `${BASE_CONTENT_URL}${referencePath.replace(/^\/content\//, '')}`;
    }

    const lc = referencePath.toLowerCase().replace(/\\/g, '/');
    const idx = lc.indexOf('content/');
    if (idx !== -1) {
        return `${BASE_CONTENT_URL}${referencePath.substring(idx + 8).replace(/\\/g, '/')}`;
    }

    if (baseDir) {
        // If we have an originUrl (CDN), join against it for the most robust result
        if (baseDir.startsWith('http')) {
            try { return new URL(referencePath, baseDir).href; } catch (e) { }
        }

        const fullRel = `${baseDir}/${referencePath}`.replace(/\/+/g, '/').replace(/^content\//, '');
        return `${BASE_CONTENT_URL}${fullRel}`;
    }
    
    return null;
}

/**
 * Fetch a single content JSON and return a normalised steps[].
 * Now powered by Manya Vault (Supabase).
 */
export async function loadQuestSteps(subject, unitId, questFolder, file, targetType = null) {
    const qid = resolveQid(subject, unitId, questFolder, file);
    const cacheKey = targetType ? `${qid}_${targetType}` : qid;
    
    // 1. Cache Check
    if (JSON_CACHE[cacheKey]) {
        console.log(`⚡ [QuestLoader] Serving from cache: ${cacheKey}`);
        return JSON_CACHE[cacheKey];
    }

    try {
        console.log(`[QuestLoader] Fetching Vault Row: ${qid} (Sub: ${subject})`);
        
        // 2. Query Supabase Vault
        // Note: Using case-insensitive ilike for subject to catch "English" / "english" / "ENGLISH"
        let query = supabase
            .from('manya_vault')
            .select('interaction_config, topic, qid, item_type')
            .eq('qid', qid)
            .ilike('subject', subject);

        if (targetType) {
            query = query.eq('item_type', targetType);
        }

        const { data: vaultRows, error } = await query;

        if (error || !vaultRows || vaultRows.length === 0) {
            console.warn(`[QuestLoader] Vault miss for ${qid} (Type: ${targetType}). Checking Legacy...`);
            // 🛡️ Safety Guard: Only fallback if we have valid folder paths
            if (!unitId || !questFolder) {
                throw new Error(`Quest ${qid} missing from Vault and no local path provided.`);
            }
            return await loadQuestStepsLegacy(subject, unitId, questFolder, file);
        }

        // 3. Process All Rows from Vault (Merge steps)
        let allSteps = [];
        let masterMeta = { qid, topic: vaultRows[0].topic };

        for (const row of vaultRows) {
            let json = row.interaction_config;
            if (typeof json === 'string') {
                try { json = JSON.parse(json); } catch (e) { continue; }
            }

            // 🚀 REMOTE CDN REDIRECT: If the entry points to a CDN URL, fetch it now
            if (json && json.cdn_url) {
                const cleanCdnUrl = json.cdn_url.replace(/(\/content\/[^\/]+\/)\/content\/[^\/]+\//g, '$1');
                try {
                    const remoteRes = await fetch(cleanCdnUrl);
                    if (remoteRes.ok) {
                        json = await remoteRes.json();
                        json._originUrl = cleanCdnUrl; 
                    }
                } catch (e) { console.warn(`[QuestLoader] CDN redirect failed for row in ${qid}`); }
            }

            const result = await transformJsonToSteps(json, subject, unitId, questFolder, file);
            allSteps.push(...result.steps);
            if (result.meta) masterMeta = { ...masterMeta, ...result.meta };
        }

        const finalResult = { steps: allSteps, meta: masterMeta };

        // Save to cache
        JSON_CACHE[cacheKey] = finalResult;
        return finalResult;

    } catch (err) {
        // 🤫 SILENT RESILIENCE: 
        // If it's just a missing legacy file, don't scream "Major Error"
        const isMiss = err.message?.includes('found after fallback') || err.message?.includes('Expected JSON');
        if (isMiss) {
            console.info(`[QuestLoader] Note: No optional story JSON at ${qid}. (Using Adaptive MCQs)`);
            return { steps: [], meta: { status: 'adaptive_only' } };
        }
        
        console.error(`❌ [QuestLoader] Major error loading ${qid}:`, err);
        return { steps: [], meta: { status: 'error', error: err.message } };
    }
}

async function loadQuestStepsLegacy(subject, unitId, questFolder, file) {
    let url = contentUrl(subject, unitId, questFolder, file);
    
    try {
        let res = await fetch(url);
        
        // 🛡️ FALLBACK: If folder-specific path fails (404), try the parent unit folder
        if (!res.ok) {
            const fallbackUrl = `${BASE_CONTENT_URL}${subject}/${unitId}/${file.replace(/\.json$/, '')}.json`;
            res = await fetch(fallbackUrl);
            
            if (!res.ok) {
                // Return empty instead of throwing to prevent console red-out
                return { steps: [], meta: { status: 'missing', url } };
            }
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            return { steps: [], meta: { status: 'not_json', url } };
        }

        const json = await res.json();
        return await transformJsonToSteps(json, subject, unitId, questFolder, file);
    } catch (e) {
        return { steps: [], meta: { status: 'fetch_failed', error: e.message } };
    }
}

/**
 * Universal Step Transformer (JSON -> Standard Step Shape)
 */
async function transformJsonToSteps(json, subject, unitId, questFolder, file) {
    let result;

    if (Array.isArray(json.steps)) {
        // If we have a CDN origin, that becomes our base context
        const baseDir = json._originUrl || `content/${subject}/${unitId}/${questFolder}`;
        
        const resolvedSteps = await Promise.all(
            json.steps.map(async (step) => {
                if (step.referencePath) {
                    const refUrl = resolveRef(step.referencePath, baseDir);
                    if (refUrl) {
                        try {
                            const refRes = await fetch(refUrl);
                            const contentType = refRes.headers.get('content-type') || '';
                            if (refRes.ok && contentType.includes('application/json')) {
                                step.data = await refRes.json();
                            } else {
                                console.warn(`[QuestLoader] Skipping minor resource ${step.referencePath}: ${refRes.status}`);
                            }
                        } catch (_) { }
                    }
                }
                return normaliseStep(step, json._originUrl);
            })
        );
        result = {
            steps: resolvedSteps,
            meta: { topic: json.topic || file, variantTitle: json.variantTitle }
        };
    } else {
        const step = normaliseStep(json, json._originUrl);
        result = {
            steps: [step],
            meta: { topic: json.topic || file, variantTitle: json.variantTitle }
        };
    }
    return result;
}

/**
 * Normalise a raw step object
 */
function normaliseStep(raw, originUrl = null) {
    let engineType = raw.engineType || raw.engine;

    if (!engineType) {
        if (raw.mode === 'note_explorer' || raw.study_notes) {
            engineType = 'NOTE_EXPLORER';
        } else if (raw.mode === 'recap' || raw.recap_facts || raw.sections) {
            engineType = 'READER_STUDY';
        } else if (raw.cases) {
            engineType = 'GLOBE_TIME_ENGINE';
        } else {
            engineType = 'UNKNOWN';
        }
    }

    return {
        ...raw,
        engineType: engineType.toUpperCase(),
        data: {
            ...(raw.data || raw),
            _originUrl: originUrl // Propagate origin for relative asset resolution
        }
    };
}
