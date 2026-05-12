/**
 * MANYA QUEST LOADER - v2.0 (Database-First)
 * =========================================
 * Now powered by the Manya Vault (Supabase).
 * Fetches curriculum by QID and normalises it into a uniform steps[] array.
 * Fallback to local /content/ folders if the database record is missing.
 */
import { storageFacade } from '../infrastructure/storage/storageFacade.js';

import QuickLRU from 'quick-lru';
const JSON_CACHE = new QuickLRU({ maxSize: 50 });

import { CDN_BASE, ASSET_VERSION } from '../config/constants';
import { validateAndNormalizeStep } from '../domain/schemas/validation';
import { resolveRef } from './questHelpers.js';

/**
 * 🛠️ [UTF-16 RESILIENCE]: Safely parses JSON even if the CDN serves UTF-16 files as UTF-8.
 * Detects the BOM (Byte Order Mark) and decodes accordingly.
 */
async function safeFetchJson(data) {
    if (typeof data === 'object') return data;
    
    // If it's a string, it might be raw text that needs parsing
    try {
        return JSON.parse(data);
    } catch (e) {
        // Handle BOM and other issues if data is a string
        let decodedText = data;
        if (decodedText.charCodeAt(0) === 0xFEFF) {
            decodedText = decodedText.slice(1);
        }
        return JSON.parse(decodedText);
    }
}

const CDN_URL = `${CDN_BASE}content/`;
const BASE_CONTENT_URL = CDN_URL;

/**
 * Resolves the parameters into a standardized QID for Database lookup
 */
function resolveQid(subject, unitId, questFolder, file) {
    if (!file) return null;
    
    // 🛡️ Safety: Ensure file is a string
    const fileStr = typeof file === 'string' ? file : (file?.file || String(file));
    const filename = fileStr.replace(/\.json$/, '');
    
    // Direct ID mapping (Handles ENG-quest-p7-001 or pq-02-001 etc) - Case Insensitive
    const upperFilename = filename.toUpperCase();
    if (upperFilename.startsWith('ENG-') || upperFilename.startsWith('PQ-')) {
        return filename;
    }

    // Pattern: 04-015 (Standard Quest ID)
    if (/^\d+-\d+/.test(filename)) {
        return filename;
    }
    
    // 🧠 ENGLISH IDENTITY RULE:
    // If it starts with a number (like 02_going_to_mastery), keep it raw.
    // This ensures we match the physical CDN filenames exactly.
    if (subject === 'english' && /^\d/.test(filename)) {
        return filename;
    }

    // Pattern: TOPIC_SUBTOPIC_FILENAME (Standard Simulation/Note ID)
    const topic = (unitId || 'GENERAL').toUpperCase().replace(/-/g, '_');
    const subtopic = (questFolder || 'QUEST').toUpperCase().replace(/-/g, '_');
    const cleanFile = filename.toUpperCase().replace(/-/g, '_');
    
    // If it's already a full complex QID, don't wrap it again
    if (cleanFile.includes(topic) || cleanFile.includes(subtopic)) {
        return filename;
    }

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
    
    // 🌍 PATH NORMALIZATION (v2.1)
    // Map internal English unit IDs to their physical CDN counterparts
    let unitDir = unitId;
    if (subject === 'english' && (unitId === 'english-master-path' || unitId === 'english_master_path')) {
        unitDir = 'holidays';
    }

    return `${BASE_CONTENT_URL}${subject}/${unitDir}/${questFolder}/${cleanFile}.json`;
}

/**
 * Fetch a single content JSON and return a normalised steps[].
 * Now powered by Manya Vault (Supabase).
 */
export async function loadQuestSteps(subject, unitId, questFolder, file, targetType = null) {
    const qid = resolveQid(subject, unitId, questFolder, file);
    const cacheKey = targetType ? `${qid}_${targetType}` : qid;
    
    // 1. Cache Check
    if (JSON_CACHE.has(cacheKey)) {
        console.log(`⚡ [QuestLoader] Serving from cache: ${cacheKey}`);
        return JSON_CACHE.get(cacheKey);
    }

    try {
        console.debug(`[QuestLoader] Fetching Vault Row: ${qid} (Sub: ${subject})`);
        
        // 2. Query Supabase Vault via Facade
        const queryParams = new URLSearchParams({
            qid,
            subject: `ilike:${subject}`
        });
        if (targetType) queryParams.append('item_type', targetType);

        const vaultRows = await storageFacade.get(`db:/manya_vault?${queryParams.toString()}`);

        if (!vaultRows || vaultRows.length === 0) {
            console.debug(`📡 [QuestLoader] ${qid} not in Vault. Using CDN.`);
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
            let json = null;
            let cleanCdnUrl = null;

            if (row.cdn_url) {
                // 🛡️ SANITIZATION (v2.2): Fix duplicate .net and repeated content folders
                cleanCdnUrl = row.cdn_url.replace('.net.net', '.net');
                cleanCdnUrl = cleanCdnUrl.replace(/(\/content\/[^\/]+\/)\/content\/[^\/]+\//g, '$1');
                cleanCdnUrl = cleanCdnUrl.replace('@main/', `@${ASSET_VERSION}/`);
            } else {
                // Reconstruct from topics if missing. 
                let topicDir = row.topic ? row.topic.toLowerCase().replace(/\s+/g, '_') : unitId;
                if (subject === 'english' && (topicDir.includes('primary_7') || topicDir.includes('master_path'))) {
                    topicDir = 'holidays';
                }
                const subtopicDir = row.subtopic ? row.subtopic.toLowerCase().replace(/\s+/g, '_') : questFolder;
                
                const fileRef = (subject === 'english' && typeof file === 'string') ? file.replace(/\.json$/, '') : qid;
                cleanCdnUrl = `${BASE_CONTENT_URL}${subject.toLowerCase()}/${topicDir}/${subtopicDir}/${fileRef}.json`;
            }

            if (cleanCdnUrl) {
                try {
                    // Use file scheme for external URLs too
                    json = await storageFacade.get(`file:${cleanCdnUrl}`);
                    json._originUrl = cleanCdnUrl; 
                    console.log(`%c 📜 [QuestLoader] Resource Loaded: ${qid}`, 'color: #10b981; font-weight: bold;', { url: cleanCdnUrl, type: row.item_type });
                } catch (e) { 
                    console.warn(`[QuestLoader] CDN redirect failed for row in ${qid}: ${cleanCdnUrl}`); 
                    continue; // Skip if we can't load the JSON
                }
            }
            
            if (json) {
                const result = await transformJsonToSteps(json, subject, unitId, questFolder, file);
                allSteps.push(...result.steps);
                if (result.meta) masterMeta = { ...masterMeta, ...result.meta };
            }
        }

        const finalResult = { steps: allSteps, meta: masterMeta };

        // 🛡️ [RECOVERY FALLBACK]: If vault rows were found but yielded NO usable steps, fall back to legacy.
        if (allSteps.length === 0) {
            console.warn(`[QuestLoader] Vault returned no steps for ${qid}. Trying legacy fallback.`);
            return await loadQuestStepsLegacy(subject, unitId, questFolder, file);
        }

        // Save to cache
        JSON_CACHE.set(cacheKey, finalResult);
        return finalResult;

    } catch (err) {
        const isMiss = err.message?.includes('404') || err.message?.includes('missing from Vault') || err.message?.includes('fetch_failed');
        
        if (isMiss) {
            console.debug(`[QuestLoader] Optional asset ${qid} not found. Resuming adaptive quest.`);
        } else {
            console.error(`❌ [QuestLoader] Data structure error in ${qid}:`, err);
        }
        
        return { steps: [], meta: { status: 'fallback', error: err.message } };
    }
}

async function loadQuestStepsLegacy(subject, unitId, questFolder, file) {
    let url = contentUrl(subject, unitId, questFolder, file);
    
    try {
        let json = null;
        try {
            json = await storageFacade.get(`file:${url}`);
        } catch (e) {
            // 🛡️ FALLBACK: If folder-specific path fails, try the parent unit folder
            const fallbackUrl = `${BASE_CONTENT_URL}${subject}/${unitId}/${file.replace(/\.json$/, '')}.json`;
            json = await storageFacade.get(`file:${fallbackUrl}`);
            url = fallbackUrl;
        }

        if (!json) return { steps: [], meta: { status: 'missing', url } };

        json._originUrl = url;
        console.log(`%c 📜 [QuestLoader] Legacy Resource Loaded: ${url}`, 'color: #f59e0b; font-weight: bold;');
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
        const origin = json._originUrl || contentUrl(subject, unitId, questFolder, file);
        const baseDir = origin.substring(0, origin.lastIndexOf('/') + 1);
        
        const resolvedSteps = await Promise.all(
            json.steps.map(async (step, idx) => {
                const ref = step.referencePath || step.file;
                if (ref) {
                    const fileName = String(ref).endsWith('.json') ? ref : `${ref}.json`;
                    const refUrl = resolveRef(fileName, baseDir);
                    
                    if (refUrl) {
                        try {
                            const refData = await storageFacade.get(`file:${refUrl}`);
                            step.data = refData;
                            console.log(`✅ [QuestLoader] Successfully hydrated step ${idx} from ${ref}`);
                        } catch (e) { 
                            console.error(`❌ [QuestLoader] Error fetching sub-resource ${ref}:`, e);
                        }
                    }
                }
                return validateAndNormalizeStep(step, json._originUrl);
            })
        );
        result = {
            steps: resolvedSteps,
            meta: { topic: json.topic || file, variantTitle: json.variantTitle }
        };
    } else {
        const step = validateAndNormalizeStep(json, json._originUrl);
        result = {
            steps: [step],
            meta: { topic: json.topic || file, variantTitle: json.variantTitle }
        };
    }
    return result;
}


