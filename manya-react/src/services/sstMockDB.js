import { supabase } from './supabaseClient';
import { ManyaDB } from '../utils/manyaDB';

const BANK_CACHE = {};

const SUBTOPIC_MAP = {
    'quest_1_world_stage': 'world_stage',
    'quest_2_grid_master': 'latitudes_longitudes',
    'quest_3_calculating_time': 'time_calc',
    'quest_4_water_bodies': 'Water Bodies',
    'quest_5_coastal_features': 'coastal_features',
    'quest_6_regional_division_capital_cities': 'Regional Division Capital Cities',
    'quest_7_landlocked_countries': 'regions_capitals'
};

/**
 * Fetches and transforms questions from the unified Manya Vault.
 */
export const fetchSstQuestions = async (topicId) => {
    try {
        const subtopic = SUBTOPIC_MAP[topicId] || topicId;
        
        if (BANK_CACHE[subtopic]) return BANK_CACHE[subtopic];

        const allCached = await ManyaDB.getCachedQuestions('sst');
        const cached = allCached.filter(q => q.subtopic === subtopic);
        if (cached && cached.length > 0) {
            BANK_CACHE[subtopic] = cached;
            return cached;
        }

        // --- RESILIENT VAULT QUERY ---
        let { data, error } = await supabase
            .from('manya_vault')
            .select('*')
            .ilike('subject', 'sst')
            .in('subtopic', [subtopic, topicId])
            .ilike('item_type', '%MCQ%');

        // Fallback for sanitized names
        if (!error && (!data || data.length === 0) && subtopic.includes('quest_')) {
            const sanitized = subtopic.replace(/^quest_\d+_/, '');
            const retry = await supabase
                .from('manya_vault')
                .select('*')
                .eq('subject', 'SST')
                .eq('subtopic', sanitized)
                .eq('item_type', 'MCQ');
            
            if (retry.data?.length > 0) data = retry.data;
            else {
                const withSpaces = sanitized.replace(/_/g, ' ');
                const retry2 = await supabase
                    .from('manya_vault')
                    .select('*')
                    .eq('subject', 'SST')
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
                subject: 'sst',
                topic: q.topic,
                subtopic: q.subtopic,
                difficulty: q.difficulty || 'E',
                question: q.question_text,
                options: options,
                answer: q.correct_answer,
                explanation: q.explanation,
                hint: q.hint,
                image_url: q.image_location === 'null' ? null : q.image_location,
                variant: q.qid.includes('-V') ? q.qid.split('-V')[1] : 'V0',
                isPLE: q.metadata?.is_ple || false,
                type: q.item_type || 'MCQ',
                tags: q.metadata?.tags || [],
                engine_type: q.engine_type,
                interaction_config: q.interaction_config
            };
        });

        BANK_CACHE[subtopic] = transformed;
        await ManyaDB.cacheQuestions(transformed);
        return transformed;

    } catch (error) {
        console.error("[SST Vault Service] Fetch Error:", error.message);
        return [];
    }
};
