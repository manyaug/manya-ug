/**
 * MANYA QUEST LOADER - v2.0 (Database-First)
 * =========================================
 * Now powered by the Manya Vault (Supabase).
 * Fetches curriculum by QID and normalises it into a uniform steps[] array.
 * Fallback to local /content/ folders if the database record is missing.
 */
import { supabase } from '../infrastructure/remote/supabaseClient.js';

import QuickLRU from 'quick-lru';
const JSON_CACHE = new QuickLRU({ maxSize: 50 });

import { CDN_BASE, ASSET_VERSION } from '../config/constants';
import { validateAndNormalizeStep } from '../domain/schemas/validation';
import { resolveRef } from './questHelpers.js';

const CDN_URL = `${CDN_BASE}content/`;
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
    const topic = (unitId || 'GENERAL').toUpperCase().replace(/-/g, '_');
    const subtopic = (questFolder || 'QUEST').toUpperCase().replace(/-/g, '_');
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
        console.log(`[QuestLoader] Fetching Vault Row: ${qid} (Sub: ${subject})`);
        
        // 2. Query Supabase Vault
        // Note: Using case-insensitive ilike for subject to catch "English" / "english" / "ENGLISH"
        let query = supabase
            .from('manya_vault')
            .select('cdn_url, topic, subtopic, item_type, qid')
            .eq('qid', qid)
            .ilike('subject', subject);

        if (targetType) {
            query = query.eq('item_type', targetType);
        }

        const { data: vaultRows, error } = await query;

        if (error || !vaultRows || vaultRows.length === 0) {
            console.log(`📡 [QuestLoader] ${qid} not found in Vault. Falling back to CDN...`);
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
                // Remove repeated "content/" parts and inject ASSET_VERSION
                cleanCdnUrl = row.cdn_url.replace(/(\/content\/[^\/]+\/)\/content\/[^\/]+\//g, '$1');
                cleanCdnUrl = cleanCdnUrl.replace('@main/', `@${ASSET_VERSION}/`);
            } else {
                // Reconstruct from topics if missing 
                const topicDir = row.topic ? row.topic.toLowerCase().replace(/\s+/g, '_') : unitId;
                const subtopicDir = row.subtopic ? row.subtopic.toLowerCase().replace(/\s+/g, '_') : questFolder;
                cleanCdnUrl = `${BASE_CONTENT_URL}${subject.toLowerCase()}/${topicDir}/${subtopicDir}/${qid}.json`;
            }

            if (cleanCdnUrl) {
                try {
                    const remoteRes = await fetch(cleanCdnUrl);
                    if (remoteRes.ok) {
                        json = await remoteRes.json();
                        json._originUrl = cleanCdnUrl; 
                    } else {
                        throw new Error(`Status ${remoteRes.status}`);
                    }
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

        // Save to cache
        JSON_CACHE.set(cacheKey, finalResult);
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
        // Relax content-type check for raw githubusercontent which often serves JSON as text/plain
        if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
            return { steps: [], meta: { status: 'not_json', url, contentType } };
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


