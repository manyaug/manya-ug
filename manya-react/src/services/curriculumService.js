/**
 * MANYA CURRICULUM SERVICE
 * =========================
 * Fetches and caches curriculum-master.json to prevent redundant network requests
 * and ensure stable quest keys across the app.
 */

import { assetUrl } from '../config/assetUrls';
import { storageFacade } from '../infrastructure/storage/storageFacade.js';
import { deriveStoryFile, formatQuestTitle } from '../utils/questHelpers.js';

let curriculumCache = null;
let fetchPromise = null;
let dynamicContentCache = {};
let dynamicFetchPromise = {}; // SINGLE-FETCH LOCK for level 1.0 subjects

export async function preloadCurriculum() {
    // 1. Instant Cache Return
    if (curriculumCache) return curriculumCache;
    
    // 2. Return existing promise if already fetching
    if (fetchPromise) return fetchPromise;

    // 3. Start Atomic Fetch
    fetchPromise = (async () => {
        const CDN_URL = assetUrl('content/curriculum-master.json');

        try {
            console.log("☁️ [Curriculum] Fetching remote master curriculum...");
            
            // Fail-safe: If the storageFacade hangs, we don't want to block the app forever
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Curriculum fetch timeout')), 8000)
            );

            const fetchOp = (async () => {
                let raw;
                try {
                    console.log(`🌐 [Curriculum] Loading local deployment curriculum fallback first...`);
                    raw = await storageFacade.get('file:/curriculum-master.json');
                } catch (e) {
                    console.warn(`[Curriculum] Local deployment fetch failed. Falling back to remote CDN...`);
                    raw = await storageFacade.get(`file:${CDN_URL}`);
                }
                return raw;
            })();

            const raw = await Promise.race([fetchOp, timeoutPromise]);

            if (!raw) {
                throw new Error(`Master curriculum not found`);
            }
            
            const norm = {};
            Object.keys(raw).forEach(k => { norm[k.toLowerCase()] = raw[k]; });
            
            curriculumCache = norm;
            console.log("✅ [Curriculum] Master curriculum cached.");
            return norm;
        } catch (err) {
            console.error("❌ [Curriculum] Load failed:", err);
            // Fallback to empty object so findQuestData doesn't crash but at least returns
            curriculumCache = {}; 
            return {};
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
 * FUZZY FOLDER MAPPING (Level 1.0 English Fix)
 */
function mapTopicToFolder(topic, subject) {
    const t = topic.toLowerCase();
    const s = subject.toLowerCase();

    if (s === 'english') {
        if (t.includes('holiday')) return 'holidays';
        if (t.includes('revision')) return 'final_revision';
        if (t.includes('primary_7') || t.includes('p7')) return 'holidays'; 
    }
    
    return topicToId(topic);
}

export async function fetchDynamicCurriculum(subject = 'english') {
    const sKey = subject.toLowerCase();
    if (dynamicContentCache[sKey]) return dynamicContentCache[sKey];
    if (dynamicFetchPromise[sKey]) return dynamicFetchPromise[sKey];

    dynamicFetchPromise[sKey] = (async () => {
        try {
            console.log(`🌐 [Curriculum] Discovering dynamic nodes for ${subject}...`);

            // 1. Fetch unique topics (Units) for this subject via Facade
            const topics = await storageFacade.get(`db:/manya_vault?subject=ilike:${subject}`);
            
            if (!topics) throw new Error('No topics found in vault');
            
            // Normalize topic names to handle variations in case/spacing
            const normalizedTopicMap = new Map();
            topics.forEach(t => {
                if (!t.topic) return;
                const key = t.topic.trim().toLowerCase();
                if (!normalizedTopicMap.has(key)) {
                    normalizedTopicMap.set(key, t.topic.trim()); // Store original-ish name
                }
            });

            const uniqueTopics = Array.from(normalizedTopicMap.values());
            console.log(`✅ [Curriculum] Found ${uniqueTopics.length} normalized topics in DB.`);

            // Step 2: Discover all quests and their parent topics
            const allDiscoverableQuests = [];
            
            for (const topicName of uniqueTopics) {
                const subtopics = await storageFacade.get(`db:/manya_vault?topic=${topicName}&subject=ilike:${subject}`);

                if (!subtopics) continue;

                const rawSubtopics = [...new Set(subtopics.map(s => s.subtopic).filter(Boolean))];
                for (const subName of rawSubtopics) {
                    const indexMatch = subName.match(/\d+/);
                    const sortIndex = indexMatch ? parseInt(indexMatch[0]) : 999;

                    allDiscoverableQuests.push({
                        folder: subName,
                        sortIndex,
                        topicName, // Store for grouping
                        title: formatQuestTitle(subName),
                        resources: [ { label: 'Story', file: deriveStoryFile(subName) } ],
                        practiceCount: 0 
                    });
                }
            }

            // Step 3: Natural Sort and Deduplication
            const sorted = allDiscoverableQuests.sort((a,b) => a.sortIndex - b.sortIndex);
            const uniqueQuests = [];
            const seenFolders = new Set();
            for (const q of sorted) {
                if (seenFolders.has(q.folder)) continue;
                seenFolders.add(q.folder);
                uniqueQuests.push(q);
            }

            // Step 4: Unit Assembly
            const units = [];
            
            if (sKey === 'english') {
                units.push({
                    id: 'english_master_path',
                    title: 'Primary 7 English',
                    quests: uniqueQuests
                });
            } else {
                const topicGroups = {};
                for (const q of uniqueQuests) {
                    const tName = q.topicName || 'General';
                    if (!topicGroups[tName]) topicGroups[tName] = [];
                    topicGroups[tName].push(q);
                }

                Object.entries(topicGroups).forEach(([tName, quests]) => {
                    units.push({
                        id: topicToId(tName),
                        title: tName,
                        quests: quests.sort((a,b) => a.sortIndex - b.sortIndex)
                    });
                });
            }

            const result = { units };
            dynamicContentCache[sKey] = result;
            return result;

        } catch (err) {
            console.error("❌ [Curriculum] Dynamic discovery failed:", err);
            return { units: [] };
        } finally {
            delete dynamicFetchPromise[sKey];
        }
    })();

    return dynamicFetchPromise[sKey];
}

function topicToId(topic) {
    return topic.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}
