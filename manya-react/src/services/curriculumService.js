/**
 * MANYA CURRICULUM SERVICE
 * =========================
 * Fetches and caches curriculum-master.json to prevent redundant network requests
 * and ensure stable quest keys across the app.
 */

import { assetUrl } from '../config/assetUrls';
import { supabase } from './supabaseClient';

let curriculumCache = null;
let fetchPromise = null;
let dynamicContentCache = {};

/**
 * Pre-loads the curriculum. Should be called at app start.
 */
export async function preloadCurriculum() {
    if (curriculumCache) return curriculumCache;
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
        try {
            console.log("☁️ [Curriculum] Fetching master curriculum from local / public...");
            const res = await fetch('/curriculum-master.json');
            
            if (!res.ok) {
                console.warn(`[Curriculum] Local fetch failed (${res.status}), trying bare...`);
            }
            
            const raw = await res.json();
            
            // Normalize keys to lowercase for resilient lookup
            const norm = {};
            Object.keys(raw).forEach(k => { norm[k.toLowerCase()] = raw[k]; });
            
            curriculumCache = norm;
            console.log("✅ [Curriculum] Master curriculum cached.");
            return norm;
        } catch (err) {
            console.error("❌ [Curriculum] Load failed:", err);
            return null;
        } finally {
            fetchPromise = null;
        }
    })();

    return fetchPromise;
}

/**
 * Sync helper to get cached curriculum.
 */
export function getCachedCurriculum() {
    return curriculumCache;
}

/**
 * NORMALISATION HELPER (Fuzzy Matching)
 * Strips prefixes like "quest_" and handles spaces/underscores/case.
 * e.g. "quest_1_world_stage" -> "1_world_stage"
 * e.g. "1 World Stage" -> "1_world_stage"
 */
function normalizeForMatch(str) {
    if (!str) return "";
    return str.toLowerCase()
        .replace(/^quest_/, '') // Strip "quest_" prefix
        .replace(/\s+/g, '_')   // Spaces to underscores
        .replace(/[^a-z0-9_]/g, '') // Remove special chars
        .replace(/^_+|_+$/g, ''); // Trim underscores
}

/**
 * Find quest data from the cached curriculum.
 */
export function findQuestData(subject, unitId, titleOrFolder) {
    const s = subject.toLowerCase();
    
    // 1. Try Dynamic Cache first (Level 1.0)
    const dynamic = dynamicContentCache[s];
    if (dynamic) {
        const found = searchInSubjData(dynamic, unitId, titleOrFolder);
        if (found) return found;
    }

    // 2. Try Static Cache fallback
    if (curriculumCache && curriculumCache[s]) {
        return searchInSubjData(curriculumCache[s], unitId, titleOrFolder);
    }

    return null;
}

function searchInSubjData(subjData, unitId, titleOrFolder) {
    const units = subjData.units || [];
    const targetUnit = normalizeForMatch(unitId);
    const targetQuest = normalizeForMatch(titleOrFolder);
    
    console.debug(`🔍 [Curriculum] Fuzzy search for Unit: ${targetUnit}, Quest: ${targetQuest}`);

    // 1. Exact Unit Match
    for (const unit of units) {
        if (normalizeForMatch(unit.id) === targetUnit) {
            const quest = unit.quests?.find(q => 
                normalizeForMatch(q.folder) === targetQuest || 
                normalizeForMatch(q.title) === targetQuest
            );
            if (quest) return { ...quest, unitId: unit.id };
        }
    }

    // 2. Global Fuzzy fallback (if unit was wrong in route)
    for (const unit of units) {
        for (const quest of (unit.quests || [])) {
            if (normalizeForMatch(quest.title) === targetQuest || normalizeForMatch(quest.folder) === targetQuest) {
                return { ...quest, unitId: unit.id };
            }
        }
    }
    return null;
}

/**
 * DYNAMIC CURRICULUM DISCOVERY (Level 1.0)
 * Fetches unique topics and subtopics from the Manya Vault DB.
 */
export async function fetchDynamicCurriculum(subject = 'english') {
    if (dynamicContentCache[subject]) return dynamicContentCache[subject];

    try {
        console.log(`🌐 [Curriculum] Discovering dynamic nodes for ${subject}...`);

        // 1. Fetch unique topics (Units) for this subject
        const { data: topics, error: tErr } = await supabase
            .from('manya_vault')
            .select('topic')
            .ilike('subject', subject);
        
        if (tErr) throw tErr;
        
        const uniqueTopics = [...new Set(topics.map(t => t.topic).filter(Boolean))];
        console.log(`✅ [Curriculum] Found ${uniqueTopics.length} topics in DB.`);

        const units = [];

        for (const topicName of uniqueTopics) {
            // 2. Fetch unique subtopics (Quests) for this topic
            const { data: subtopics, error: sErr } = await supabase
                .from('manya_vault')
                .select('subtopic')
                .eq('topic', topicName)
                .ilike('subject', subject);

            if (sErr) continue;

            const uniqueSubtopics = [...new Set(subtopics.map(s => s.subtopic).filter(Boolean))];
            
            // Map subtopics to quest objects
            const quests = uniqueSubtopics.map(subName => {
                // Determine folder name (subtopic is already the folder name per user)
                return {
                    folder: subName,
                    title: formatTitle(subName),
                    resources: [
                        { label: 'Story', file: deriveStoryFile(subName) }
                    ],
                    practiceCount: 0 
                };
            });

            units.push({
                id: topicToId(topicName),
                title: topicName,
                quests: quests.sort((a,b) => a.folder.localeCompare(b.folder))
            });
        }

        const result = { units: units.sort((a,b) => a.title.localeCompare(b.title)) };
        dynamicContentCache[subject] = result;
        return result;

    } catch (err) {
        console.error("❌ [Curriculum] Dynamic discovery failed:", err);
        return { units: [] };
    }
}

// Helper: quest_01_holiday_kickoff -> "Holiday Kickoff"
function formatTitle(subName) {
    if (!subName) return "New Quest";
    
    // quest_1_world_stage -> "1 World Stage"
    let clean = subName.replace(/^quest_/, '');
    
    // Replace underscores with spaces and capitalize
    return clean
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

// Helper: quest_01_holiday_kickoff -> "01_holiday_kickoff"
function deriveStoryFile(subName) {
    if (!subName) return null;
    return subName.replace(/^quest_/, '');
}

function topicToId(topic) {
    return topic.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}
