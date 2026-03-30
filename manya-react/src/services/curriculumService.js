/**
 * MANYA CURRICULUM SERVICE
 * =========================
 * Fetches and caches curriculum-master.json to prevent redundant network requests
 * and ensure stable quest keys across the app.
 */

import { assetUrl } from '../config/assetUrls';

let curriculumCache = null;
let fetchPromise = null;

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
 * Find quest data from the cached curriculum.
 */
export function findQuestData(subject, unitId, titleOrFolder) {
    if (!curriculumCache) return null;
    const subjData = curriculumCache[subject.toLowerCase()];
    if (!subjData) return null;

    const units = subjData.units || [];
    
    // 1. Direct match by unitId and title/folder
    for (const unit of units) {
        if (unit.id === unitId) {
            const quest = unit.quests?.find(q => q.title === titleOrFolder || q.folder === titleOrFolder);
            if (quest) return { ...quest, unitId: unit.id };
        }
    }

    // 2. Fallback: Search across all units if unitId didn't match
    for (const unit of units) {
        for (const quest of (unit.quests || [])) {
            if (quest.title === titleOrFolder || quest.folder === titleOrFolder) {
                return { ...quest, unitId: unit.id };
            }
        }
    }

    return null;
}
