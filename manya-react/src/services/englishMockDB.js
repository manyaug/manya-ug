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
 * Fetches and transforms ENGLISH questions from Supabase.
 * Implements OFFLINE-FIRST strategy using ManyaDB (IndexedDB).
 */
export const fetchEnglishQuestions = async (topicId) => {
    try {
        const subtopic = SUBTOPIC_MAP[topicId] || topicId;
        console.log(`📚 [EnglishFetcher] Requesting: topicId="${topicId}" → subtopic="${subtopic}"`);
        
        if (BANK_CACHE[subtopic]) {
            return BANK_CACHE[subtopic];
        }

        const allCached = await ManyaDB.getCachedQuestions('english');
        const cached = allCached.filter(q => q.subtopic === subtopic);
        
        // CACHE REPAIR: If we have questions but they are missing 'question' text, 
        // it means we have stale/corrupt offline data. Force a refresh.
        const validQuestions = cached.filter(q => q.question && q.question !== 'None');
        const isBroken = cached.length > 0 && validQuestions.length === 0;

        if (cached && cached.length > 0 && !isBroken) {
            BANK_CACHE[subtopic] = cached;
            return cached;
        }
        
        if (isBroken) {
            console.warn(`♻️ [EnglishFetcher] Local cache for "${subtopic}" is missing text. Forcing repair from Supabase...`);
        }

        console.log(`🔍 [Supabase] Fetching questions for subtopic="${subtopic}"...`);
        
        // BROAD SEARCH: We look for the subtopic OR the topic name to ensure mapping rows
        // (which are sometimes tagged with the unit folder name) are included.
        const { data, error } = await supabase
            .from('questions_english')
            .select('*')
            .or(`subtopic.eq."${subtopic}",topic.eq."${subtopic}",subtopic.eq."${topicId}",topic.eq."${topicId}"`);

        if (error) {
            console.error("Supabase Error:", error.message);
            throw error;
        }

        if (!data || data.length === 0) {
            console.warn(`⚠️ [Supabase] No rows for "${subtopic}". Trying case-insensitive wildcard search...`);
            const retry = await supabase
                .from('questions_english')
                .select('*')
                .ilike('subtopic', `%${subtopic}%`);
            
            if (retry.data && retry.data.length > 0) {
                console.log(`✅ [Fallback Success] Found ${retry.data.length} items.`);
                return processTransformed(retry.data, subtopic);
            }
            return [];
        }

        return processTransformed(data, subtopic);

    } catch (error) {
        console.error("[English Supabase Service] Fetch Error:", error.message);
        return [];
    }
};

async function processTransformed(data, subtopic) {
    const transformed = data.map(q => {
        // HYDRATION: Detect Quest Mappings or Simulation Pointers
        const isQuest = q.questiontype === 'QUEST' || (q.engine_type && q.engine_type !== 'null');
        
        if (isQuest) {
            return {
                qid: q.qid,
                subject: 'english',
                subtopic: q.subtopic,
                mapping: {
                    qid: q.qid,
                    topic: q.topic,
                    subtopic: q.subtopic,
                    engine_type: q.engine_type,
                    json_reference_path: q.json_reference_path,
                    vocabulary: q.tags || [],
                    characters: q.variant_title
                }
            };
        }

        const options = [q.optiona, q.optionb, q.optionc, q.optiond]
            .filter(opt => opt !== null && opt !== 'null' && opt !== '');

        return {
            id: q.qid,
            qid: q.qid,
            subject: 'english',
            topic: q.topic,
            subtopic: q.subtopic,
            difficulty: q.difficulty || 'E',
            question: q.questiontext,
            options: options,
            answer: q.correctanswer,
            explanation: q.detailedsolution,
            hint: q.hint,
            variant: q.qid.includes('-V') ? 'V' + q.qid.split('-V')[1] : 'V0',
            isPLE: q.marked_ple === 'yes' || q.source_sheet === 'RAW',
            type: q.questiontype || 'MCQ',
            tags: q.tags || [],
            source: q.source_sheet
        };
    });

    if (transformed.length > 0) {
        BANK_CACHE[subtopic] = transformed;
        await ManyaDB.cacheQuestions(transformed);
    }
    return transformed;
}
