import { supabase } from './supabaseClient';
import { ManyaDB } from '../utils/manyaDB';

const BANK_CACHE = {};

const SUBTOPIC_MAP = {
    'quest_01_holiday_kickoff': 'quest_01_holiday_kickoff',
    'quest_02_going_to_mastery': 'quest_02_going_to_mastery',
    'quest_03_question_tags_mastery': 'quest_03_question_tags_mastery',
    'quest_04_reported_speech_mastery': 'quest_04_reported_speech_mastery',
    'quest_05_village_arrival': 'quest_05_village_arrival',
    'quest_06_feeling_and_facts': 'quest_06_feeling_and_facts',
    'quest_07_past_regrets': 'quest_07_past_regrets',
    'quest_08_voice_mastery': 'quest_08_voice_mastery',
    'quest_09_final_review': 'quest_09_final_review',
    'quest_10_vault': 'Vault'
};

/**
 * Fetches and transforms ENGLISH questions from the unified Manya Vault.
 */
export const fetchEnglishQuestions = async (topicId) => {
    try {
        const subtopic = SUBTOPIC_MAP[topicId] || topicId;
        const subtopicLow = subtopic.toLowerCase();
        const isStorySearch = subtopicLow.includes('quest') || subtopicLow.includes('story') || topicId.toLowerCase().includes('quest');

        if (BANK_CACHE[subtopic] && !isStorySearch) return BANK_CACHE[subtopic];

        const allCached = await ManyaDB.getCachedQuestions('english');
        const cached = allCached.filter(q => q.subtopic === subtopic);
        
        // Cache Repair Check
        const validQuestions = cached.filter(q => q.question && q.question !== 'None');
        const isBroken = cached.length > 0 && validQuestions.length === 0;

        if (cached && cached.length > 0 && !isBroken && !isStorySearch) {
            BANK_CACHE[subtopic] = cached;
            return cached;
        }

        // --- RESILIENT VAULT QUERY ---
        let { data, error } = await supabase
            .from('manya_vault')
            .select('*')
            .ilike('subject', 'english')
            .or(`subtopic.in.("${subtopic}","${topicId}"),qid.eq."${subtopic}",qid.eq."${topicId}"`);

        if (!error && (!data || data.length === 0)) {
            const retry = await supabase
                .from('manya_vault')
                .select('*')
                .eq('subject', 'ENGLISH')
                .ilike('subtopic', `%${subtopic}%`);
            if (retry.data?.length > 0) data = retry.data;
        }

        if (error) throw error;
        if (!data || data.length === 0) return [];

        const transformed = data.map(q => {
            const options = [q.option_a, q.option_b, q.option_c, q.option_d]
                .filter(opt => opt !== null && opt !== 'null' && opt !== '');

            return {
                id: q.qid,
                qid: q.qid,
                subject: 'english',
                topic: q.topic,
                subtopic: q.subtopic,
                difficulty: q.difficulty || 'E',
                question: q.question_text,
                options: options,
                answer: q.correct_answer,
                explanation: q.explanation,
                hint: q.hint,
                variant: q.qid.includes('-V') ? 'V' + q.qid.split('-V')[1] : 'V0',
                isPLE: q.metadata?.is_ple || false,
                type: q.item_type || 'MCQ',
                tags: q.metadata?.tags || [],
                engine_type: q.engine_type,
                interaction_config: typeof q.interaction_config === 'string' ? JSON.parse(q.interaction_config) : q.interaction_config,
                // Backward compatibility mapping for older English Fetcher versions
                mapping: q.item_type === 'QUEST' || q.engine_type ? {
                    qid: q.qid,
                    engine_type: q.engine_type,
                    json_reference_path: q.qid, 
                    vocabulary: q.metadata?.tags || []
                } : null
            };
        });

        if (transformed.length > 0) {
            BANK_CACHE[subtopic] = transformed;
            await ManyaDB.cacheQuestions(transformed);
        }
        return transformed;

    } catch (error) {
        console.error("[English Vault Service] Fetch Error:", error.message);
        return [];
    }
};
