import { storageFacade } from '../infrastructure/storage/storageFacade.js';
import { ManyaDB } from '../infrastructure/db/manyaDB.js';
import { parseSolutionToSteps } from '../utils/solutionVisualizer';
import { hydrateStepData, getEngineType } from '../engines/shared-engines/UniversalLogic';

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
        const spaceSub = subtopic.replace(/_/g, ' ');
        console.log(`🗄️ [MathDB] Fetching bank for: ${subtopic}`);
        
        if (BANK_CACHE[subtopic]) return BANK_CACHE[subtopic];

        const allCached = await ManyaDB.getCachedQuestions('math');
        const cached = allCached.filter(q => q.subtopic === subtopic);
        if (cached && cached.length > 0) {
            BANK_CACHE[subtopic] = cached;
            return cached;
        }

        let data = await storageFacade.get(`db:/manya_vault?subject=ilike:%math%&or=subtopic.ilike.%${subtopic}%,subtopic.ilike.%${spaceSub}%,subtopic.ilike.%${topicId}%`);

        // FALLBACK: Aggressive Keyword Splitting (v5.0)
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

        if (!data || data.length === 0) return [];

        const transformed = data.map(q => {
            // v10.0: Unified Hydration via UniversalLogic
            const parsedData = hydrateStepData(q);
            const engineType = getEngineType(q);
            
            const hasData = parsedData && (Object.keys(parsedData).length > 2 || parsedData.questions || parsedData.sets);
            
            if (q.item_type === 'SIMULATION' && !hasData) {
                console.warn(`🚨 [MathDB] Ghost Simulation detected: ${q.qid || q.id}. Missing payload.`);
            }

            const options = [q.option_a, q.option_b, q.option_c, q.option_d].filter(opt => opt && opt !== 'null');

            return {
                id: q.qid || q.id,
                qid: q.qid || q.id,
                subject: q.subject || 'math',
                topic: q.topic,
                subtopic: q.subtopic,
                difficulty: q.difficulty || 'E',
                question: q.question_text || q.prompt || q.text || q.content || q.description || q.question || `Let's explore ${q.subtopic || q.topic || 'this concept'}!`,
                options: options.length > 0 ? options : ["I'm ready!", "Let's go!", "Start Learning"],
                answer: q.correct_answer || q.answer || "I'm ready!",
                explanation: parseSolutionToSteps(q.explanation),
                raw_explanation: q.explanation,
                hint: q.hint,
                image_url: q.image_location === 'null' ? null : (q.image_url || q.image_location),
                variant: q.variant || (q.qid?.includes('-V') ? q.qid.split('-V')[1] : 'V1'),
                isPLE: q.metadata?.is_ple || false,
                type: q.item_type || 'MCQ',
                tags: q.metadata?.tags || [],
                engineType: engineType,
                data: parsedData || {}, 
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
