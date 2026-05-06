import { storageFacade } from '../infrastructure/storage/storageFacade.js';
import { ManyaDB } from '../infrastructure/db/manyaDB.js';
import { parseSolutionToSteps } from '../utils/solutionVisualizer';

const BANK_CACHE = {};
let CACHE_CLEARED = false;

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
        
        if (!CACHE_CLEARED) {
            await ManyaDB.clearQuestionCache();
            CACHE_CLEARED = true;
        }
        
        if (BANK_CACHE[subtopic]) return BANK_CACHE[subtopic];

        const allCached = await ManyaDB.getCachedQuestions('math');
        const cached = allCached.filter(q => q.subtopic === subtopic);
        if (cached && cached.length > 0) {
            BANK_CACHE[subtopic] = cached;
            return cached;
        }

        // --- RESILIENT VAULT QUERY (v4.5 - Keyword Fallback) ---
        let data = await storageFacade.get(`db:/manya_vault?subject=ilike:math&or=(subtopic.ilike.%${subtopic}%,subtopic.ilike.%${topicId}%)`);

        // FALLBACK: Aggressive Keyword Splitting (v4.5)
        if (!data || data.length === 0) {
            const cleanSub = subtopic.replace(/^quest_\d+_/, '').replace(/_/g, ' ');
            const keywords = cleanSub.split(' ').filter(k => k.length > 2); 
            
            if (keywords.length > 0) {
                console.log(`🔍 [Math Vault] No exact match for "${cleanSub}". Trying keywords:`, keywords);
                const keywordFilter = keywords.map(k => `subtopic.ilike.%${k}%,topic.ilike.%${k}%`).join(',');
                
                const keywordData = await storageFacade.get(`db:/manya_vault?subject=ilike:math&or=(${keywordFilter})`);
                
                if (keywordData?.length > 0) {
                    console.log(`✨ [Math Vault] Discovered ${keywordData.length} related questions via keywords.`);
                    data = keywordData;
                }
            }
        }

        if (!data || data.length === 0) return [];

        const transformed = data.map(q => {
            const options = [q.option_a, q.option_b, q.option_c, q.option_d]
                .filter(opt => opt !== null && opt !== 'null' && opt !== '');

            return {
                id: q.qid,
                qid: q.qid,
                subject: typeof q.subject === 'object' ? (q.subject.label || q.subject.id) : (q.subject || 'math'),
                topic: typeof q.topic === 'object' ? (q.topic.label || q.topic.id) : (q.topic || q.subtopic),
                subtopic: q.subtopic,
                difficulty: q.difficulty || 'E',
                question: q.question_text,
                options: options,
                answer: q.correct_answer,
                explanation: parseSolutionToSteps(q.explanation),
                raw_explanation: q.explanation,
                hint: q.hint,
                image_url: q.image_location === 'null' ? null : q.image_location,
                variant: q.qid.includes('-V') ? q.qid.split('-V')[1] : 'V0',
                isPLE: q.metadata?.is_ple || false,
                type: q.item_type || 'MCQ',
                tags: q.metadata?.tags || [],
                engine_type: q.engine_type
            };
        });

        BANK_CACHE[subtopic] = transformed;
        await ManyaDB.cacheQuestions(transformed);
        return transformed;

    } catch (error) {
        console.error("[Math Vault Service] Fetch Error:", error.message);
        return [];
    }
};
