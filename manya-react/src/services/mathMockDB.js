import { supabase } from './supabaseClient';
import { ManyaDB } from '../utils/manyaDB';
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

        // --- RESILIENT VAULT QUERY ---
        let { data, error } = await supabase
            .from('manya_vault')
            .select('*')
            .ilike('subject', 'math')
            .in('subtopic', [subtopic, topicId]) // Match both 'calculating_subsets' AND 'quest_03_...'
            .ilike('item_type', '%MCQ%');        // Whitespace-resilient: catches ' MCQ '

        // Fallback for sanitized names
        if (!error && (!data || data.length === 0) && subtopic.includes('quest_')) {
            const sanitized = subtopic.replace(/^quest_\d+_/, '');
            const retry = await supabase
                .from('manya_vault')
                .select('*')
                .eq('subject', 'MATH')
                .eq('subtopic', sanitized)
                .eq('item_type', 'MCQ');
            
            if (retry.data?.length > 0) data = retry.data;
            else {
                const withSpaces = sanitized.replace(/_/g, ' ');
                const retry2 = await supabase
                    .from('manya_vault')
                    .select('*')
                    .eq('subject', 'MATH')
                    .eq('subtopic', withSpaces)
                    .eq('item_type', 'MCQ');
                if (retry2.data?.length > 0) data = retry2.data;
            }
        }

        if (error) throw error;
        if (!data || data.length === 0) return [];

        const transformed = data.map(q => {
            const options = [q.option_a, q.option_b, q.option_c, q.option_d]
                .filter(opt => opt !== null && opt !== 'null' && opt !== '');

            return {
                id: q.qid,
                qid: q.qid,
                subject: 'math',
                topic: q.topic,
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
