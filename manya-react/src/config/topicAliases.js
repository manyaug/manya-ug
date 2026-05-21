/**
 * MANYA TOPIC ALIASES (Dynamic & Scalable)
 * ========================================
 * Dynamically resolves long technical curriculum topic names to their playful,
 * child-friendly "sexy aliases" defined natively in curriculum-master.json.
 */

import { getCachedCurriculum } from '../services/curriculumService';

// Kept as empty export for backward compatibility if any legacy code imports it
export const TOPIC_ALIASES = {};

/**
 * Returns the short, sexy alias for a curriculum topic name.
 * 
 * @param {string} subject - The subject biome (e.g., 'science', 'math')
 * @param {string} title - The raw topic title
 * @returns {string} The aliased or cleaned-up topic name
 */
export function getTopicAlias(subject, title) {
    if (!title) return "";
    
    const s = subject?.toLowerCase();
    const cleanTitle = title.trim();

    // 1. Direct or fuzzy match from curriculum-master.json aliases
    const curriculum = getCachedCurriculum();
    if (curriculum && curriculum[s]) {
        const units = curriculum[s].units || curriculum[s].chapters || [];
        for (const unit of units) {
            if (unit.aliases) {
                // Direct match in the unit/chapter aliases
                if (unit.aliases[cleanTitle]) {
                    return unit.aliases[cleanTitle];
                }
                
                // Fuzzy match: if cleanTitle contains or is contained in an alias key
                for (const [rawKey, alias] of Object.entries(unit.aliases)) {
                    if (cleanTitle.toLowerCase().includes(rawKey.toLowerCase()) || 
                        rawKey.toLowerCase().includes(cleanTitle.toLowerCase())) {
                        return alias;
                    }
                }
            }
        }
    }

    // 2. Fallback: Automatically clean up common technical prefixes
    // e.g. "14 Bone Diseases" -> Strip leading numbers to make it cleaner
    let fallback = cleanTitle;
    
    // Strip leading "Node X" prefixes or numbers if present
    fallback = fallback.replace(/^\d+\s+/, ''); // "14 Bone Diseases" -> "Bone Diseases"
    
    // Truncate sub-titles if they have colons or dashes
    if (fallback.includes(':')) {
        fallback = fallback.split(':')[0];
    } else if (fallback.includes(' - ')) {
        fallback = fallback.split(' - ')[0];
    }

    return fallback;
}
