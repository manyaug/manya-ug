import { storageFacade } from '../infrastructure/storage/storageFacade.js';
import { ManyaDB } from '../infrastructure/db/manyaDB.js';
import { parseSolutionToSteps } from '../utils/solutionVisualizer';
import { hydrateStepData, getEngineType } from '../engines/shared-engines/UniversalLogic';
import { ASSET_VERSION } from '../config/constants';
import { findQuestData } from './curriculumService';
import { assetUrl } from '../config/assetUrls';

const BANK_CACHE = {};
export const clearMathCache = () => {
    Object.keys(BANK_CACHE).forEach(key => delete BANK_CACHE[key]);
    console.log("🧹 [MathDB] Local bank cache cleared.");
};

const SUBTOPIC_MAP = {
    'quest_01_finite_infinite_sets': 'finite_vs_infinite_sets',
    'quest_02_set_notation_regions': 'set_notation_regions',
    'quest_03_calculating_subsets': 'calculating_subsets',
    'quest_04_calculating_proper_subsets': 'calculating_proper_subsets',
    'quest_05_working_backwards': 'working_backwards',
    'quest_06_placing_info_on_venn_diagrams': 'placing info on venn diagrams',
    'quest_07_solving_for_unknowns': 'solving_for_unknowns',
    'quest_08_application_of_sets': 'application_of_sets',
    'quest_09_difference_of_sets_complements': 'difference of sets complements',
    'quest_10_probability_using_venn_diagrams': 'probability_venn_diagrams',
};

/**
 * Fetches and transforms MATH questions from the unified Manya Vault.
 */
export const fetchMathQuestions = async (topicId) => {
    try {
        const subtopic = SUBTOPIC_MAP[topicId] || topicId;
        const spaceSub = subtopic.replace(/_/g, ' ');
        console.log(`🗄️ [MathDB] Fetching bank for: ${subtopic}`);
        
        if (BANK_CACHE[subtopic]) return BANK_CACHE[subtopic];

        let data = null;
        try {
            console.log(`📡 [MathDB] Querying Supabase for fresh records...`);
            data = await storageFacade.get(`db:/manya_vault?subject=ilike:%math%&or=subtopic.ilike.%${subtopic}%,subtopic.ilike.%${spaceSub}%,subtopic.ilike.%${topicId}%`);
        } catch (dbErr) {
            console.warn(`⚠️ [MathDB] Supabase query failed, falling back to local IndexedDB cache:`, dbErr);
            const allCached = await ManyaDB.getCachedQuestions('math');
            const cached = allCached.filter(q => q.subtopic === subtopic);
            if (cached && cached.length > 0) {
                console.log(`💾 [MathDB] Successfully loaded ${cached.length} questions from local IndexedDB.`);
                BANK_CACHE[subtopic] = cached;
                return cached;
            }
            data = [];
        }

        if (!data || data.length === 0) {
            const cleanSub = subtopic.replace(/^quest_\d+_/, '').replace(/_/g, ' ');
            const keywords = cleanSub.split(' ').filter(k => k.length > 2); 
            
            if (keywords.length > 0) {
                console.log(`🔍 [Math Vault] No exact match for "${cleanSub}". Trying keywords:`, keywords);
                const keywordFilter = keywords.map(k => `subtopic.ilike.%${k}%,topic.ilike.%${k}%`).join(',');
                const keywordData = await storageFacade.get(`db:/manya_vault?subject=ilike:%math%&or=${keywordFilter}`);
                if (keywordData?.length > 0) {
                    console.log(`✨ [Math Vault] Discovered ${keywordData.length} related questions via keywords.`);
                    data = keywordData;
                }
            }
        }

        if (!data) data = [];

        // --- INJECT MISSING CURRICULUM RESOURCES ---
        try {
            const curriculumQuest = findQuestData('math', null, topicId) || findQuestData('math', null, subtopic);
            if (curriculumQuest && curriculumQuest.resources) {
                curriculumQuest.resources.forEach(res => {
                    const isNoteOrRecap = res.file.includes('recap') || res.file.includes('note') || res.file.includes('study');
                    const exists = data.some(d => d.qid === res.file || d.id === res.file);
                    
                    if (isNoteOrRecap && !exists) {
                        console.log(`[MathDB] Auto-injecting missing curriculum resource: ${res.file}`);
                        data.push({
                            id: res.file,
                            qid: res.file,
                            subject: 'math',
                            topic: topicId,
                            subtopic: subtopic,
                            item_type: res.file.includes('recap') ? 'RECAP' : 'NOTE',
                            engine_type: 'NOTE_EXPLORER',
                            cdn_url: assetUrl(`content/math/${curriculumQuest.folder}/${res.file}.json`)
                        });
                    }
                });
            }
        } catch (e) {
            console.warn("[MathDB] Failed to auto-inject curriculum resources:", e);
        }

        if (data.length === 0) return [];

        // v11.1: Async Parallel Transformation (Scale-Ready)
        const transformed = await Promise.all(data.map(async (q) => {
            const finalQuestion = q.question_text || q.prompt || q.text || q.question || q.content || q.description || `Let's explore ${q.subtopic || q.topic || 'this concept'}!`;
            
            const rawOptions = q.options || [q.option_a, q.option_b, q.option_c, q.option_d];
            const cleanOptions = (Array.isArray(rawOptions) ? rawOptions : Object.values(rawOptions || {}))
                .filter(opt => opt && opt !== 'null' && opt !== '');
            const finalOptions = cleanOptions.length > 0 ? cleanOptions : ["I'm ready!", "Let's go!", "Start Learning"];

            // 🌐 [CDN HYDRATION]: If it's a simulation with a URL, grab the JSON
            let interactivePayload = hydrateStepData(q) || {};
            
            const isMcqQid = String(q.qid || q.id || '').toLowerCase().includes('quiz') || 
                             String(q.qid || q.id || '').toLowerCase().includes('mcq') || 
                             String(q.qid || q.id || '').toLowerCase().includes('question') ||
                             String(q.qid || q.id || '').toLowerCase().includes('practice');

            const engineUpper = (q.engine_type || "").toUpperCase();
            const hasSpecializedEngine = engineUpper && engineUpper !== 'NULL' && engineUpper !== 'MCQ' && engineUpper !== 'NONE' && engineUpper !== 'MCQ_STANDALONE';

            const isInteractive = (
                q.item_type?.toUpperCase().includes('INTERACTIVE') || 
                q.item_type?.toUpperCase() === 'SIMULATION' || 
                q.item_type?.toUpperCase() === 'RECAP' || 
                hasSpecializedEngine
            ) && !isMcqQid;

            if (isInteractive && q.cdn_url) {
                try {
                    let cleanCdnUrl = q.cdn_url.replace('.net.net', '.net');
                    cleanCdnUrl = cleanCdnUrl.replace(/(\/content\/[^\/]+\/)\/content\/[^\/]+\//g, '$1');
                    cleanCdnUrl = cleanCdnUrl.replace('@main/', `@${ASSET_VERSION}/`);
                    
                    console.debug(`[MathDB] Fetching CDN Payload for ${q.qid}: ${cleanCdnUrl}`);
                    const fetchedData = await storageFacade.get(`file:${cleanCdnUrl}`);
                    if (fetchedData) {
                        interactivePayload = { ...interactivePayload, ...fetchedData };
                        console.log(`%c ✅ [MathDB] Hydrated Simulation: ${q.qid}`, 'color: #10b981; font-weight: bold;');
                    }
                } catch (e) {
                    console.warn(`[MathDB] CDN Fetch failed for ${q.qid}:`, e.message);
                }
            }

            return {
                id: q.qid || q.id,
                qid: q.qid || q.id,
                subject: q.subject || 'math',
                topic: q.topic || topicId,
                subtopic: q.subtopic,
                difficulty: q.difficulty || 'E',
                question: finalQuestion,
                options: finalOptions,
                answer: q.correct_answer || q.answer || finalOptions[0],
                explanation: parseSolutionToSteps(q.explanation),
                raw_explanation: q.explanation,
                hint: q.hint,
                image_url: q.image_location === 'null' ? null : (q.image_url || q.image_location),
                variant: q.variant || (q.qid?.includes('-V') ? q.qid.split('-V')[1] : 'V1'),
                type: q.item_type || 'MCQ',
                data: interactivePayload, 
            };
        }));

        BANK_CACHE[subtopic] = transformed;
        await ManyaDB.cacheQuestions(transformed);
        return transformed;

    } catch (error) {
        console.error("[Math Vault Service] Fetch Error:", error.message);
        return [];
    }
};
