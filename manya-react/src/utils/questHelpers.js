/**
 * MANYA QUEST UTILS
 * Miscellaneous utilities for formatting quest titles, paths, and IDs.
 */

// Helper: quest_01_holiday_kickoff -> "01_holiday_kickoff"
export function deriveStoryFile(subName) {
    if (!subName) return null;
    return subName.replace(/^quest_/, '');
}

// Helper: quest_01_holiday_kickoff -> "Holiday Kickoff" 
export function formatQuestTitle(subName) {
    if (!subName) return "New Quest";
    let clean = subName.replace(/^quest_/, '');
    return clean
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

/**
 * Resolves a potentially relative path against a base directory
 */
export function resolveRef(referencePath, baseDir) {
    if (!referencePath) return null;
    if (referencePath.startsWith('http')) return referencePath;
    
    // Simplistic join - assuming baseDir ends with / or referencePath starts with it
    const cleanBase = baseDir.endsWith('/') ? baseDir : `${baseDir}/`;
    const cleanRef = referencePath.startsWith('/') ? referencePath.slice(1) : referencePath;
    
    return `${cleanBase}${cleanRef}`;
}
