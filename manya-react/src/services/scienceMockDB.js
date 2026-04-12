import { supabase } from './supabaseClient';
import { ManyaDB } from '../utils/manyaDB';

const BANK_CACHE = {};

const SUBTOPIC_MAP = {
    'quest_1_types_of_skeletons': 'types_of_skeleton',
    'quest_2_human_skeleton': 'human_skeleton',
    'quest_3_axial_skull_spine': 'axial_skull_spine',
    'quest_4_axial_rib_cage': 'axial_rib_cage',
    'quest_5_appendicular_limbs': 'appendicular_limbs',
    'quest_6_bone_structure': 'bone_structure',
    'quest_7_joints_structure': 'joints_structure',
    'quest_8_hinge_ball-and-socket': 'hinge_ball_and_socket',
    'quest_9_pivot_and_gliding': 'pivot_and_gliding',
    'quest_10_muscular_system_types': 'muscular_system_types',
    'quest_11_muscle_action_antagonistic_pairs': 'muscle_action_antagonistic_pairs',
    'quest_12_posture_and_teeth': 'posture_and_teeth',
    'quest_13_disorders_and_first_aid': 'disorders_and_first_aid',
    'quest_14_bone_diseases': 'bone_diseases'
};

/**
 * Fetches and transforms SCIENCE questions from the unified Vault.
 */
export const fetchScienceQuestions = async (topicId) => {
    try {
        const subtopic = SUBTOPIC_MAP[topicId] || topicId;
        
        if (BANK_CACHE[subtopic]) return BANK_CACHE[subtopic];

        const allCached = await ManyaDB.getCachedQuestions('science');
        const cached = allCached.filter(q => q.subtopic === subtopic);
        if (cached && cached.length > 0) {
            BANK_CACHE[subtopic] = cached;
            return cached;
        }

        // --- RESILIENT VAULT QUERY ---
        let { data, error } = await supabase
            .from('manya_vault')
            .select('*')
            .ilike('subject', 'science')
            .in('subtopic', [subtopic, topicId])
            .ilike('item_type', '%MCQ%');

        // Fallback for sanitized names
        if (!error && (!data || data.length === 0) && subtopic.includes('quest_')) {
            const sanitized = subtopic.replace(/^quest_\d+_/, '');
            const retry = await supabase
                .from('manya_vault')
                .select('*')
                .eq('subject', 'SCIENCE')
                .eq('subtopic', sanitized)
                .eq('item_type', 'MCQ');
            
            if (retry.data?.length > 0) data = retry.data;
            else {
                const withSpaces = sanitized.replace(/_/g, ' ');
                const retry2 = await supabase
                    .from('manya_vault')
                    .select('*')
                    .eq('subject', 'SCIENCE')
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
                subject: 'science',
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
        console.error("[Science Vault Service] Fetch Error:", error.message);
        return [];
    }
};
