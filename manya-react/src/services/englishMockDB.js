import { supabase } from './supabaseClient';
import { ManyaDB } from '../utils/manyaDB';

// Simple in-memory cache to speed up re-entry
const BANK_CACHE = {};

/**
 * Fetches and transforms questions from Supabase (English Bank).
 * Implements OFFLINE-FIRST strategy using ManyaDB (IndexedDB).
 */
export const fetchEnglishQuestions = async (topicId) => {
    try {
        const topic = topicId?.replace(/\.json$/, "");
        console.log(`\ud83d\udcd3 [EnglishFetcher] topicId="${topicId}" \u2192 topic="${topic}"`);
        
        // 1. Session Cache
        if (BANK_CACHE[topic]) {
            console.log(`\u26a1 [Cache] Serving ${topic} from in-memory cache.`);
            return BANK_CACHE[topic];
        }

        // 2. Persistent Cache (IndexedDB)
        const allCached = await ManyaDB.getCachedQuestions('english');
        const cached = allCached.filter(q => q.topic === topic);
        if (cached && cached.length > 0) {
            console.log(`\ud83d\udce6 [ManyaDB] Serving ${topic} from IndexedDB (${cached.length} Q).`);
            BANK_CACHE[topic] = cached;
            return cached;
        }

        console.log(`\ud83d\udd0d [Supabase] Fetching English questions for topic="${topic}"...`);

        const { data, error } = await supabase
            .from('questions_english')
            .select('*')
            .eq('topic', topic);

        if (error) {
            console.error(`\u274c [Supabase] RLS or query error for English topic "${topic}":`, error);
            throw error;
        }
        
        let transformed;
        if (!data || data.length === 0) {
            console.warn(`\u26a0\ufe0f [Supabase] 0 rows returned for English topic="${topic}".`);
            console.warn(`   Trying default fallback pool...`);
            const { data: defaultData } = await supabase
                 .from('questions_english')
                 .select('*')
                 .eq('topic', 'default')
                 .limit(5);
            transformed = defaultData ? transformData(defaultData) : [];
            
            if (transformed.length === 0) {
                console.error(`\u274c [EnglishFetcher] Both specific topic and default pool returned 0 questions.`);
                console.error(`   Likely RLS blocking anon reads on questions_english table.`);
            }
        } else {
            transformed = transformData(data);
        }

        if (transformed.length > 0) {
            console.log(`\u2705 [Supabase] Loaded ${transformed.length} English questions.`);
            BANK_CACHE[topic] = transformed;
            await ManyaDB.cacheQuestions(transformed);
        }
        
        return transformed;
    } catch (error) {
        console.error("[English Supabase Service] Fetch Error:", error.message);
        return [];
    }
};

function transformData(data) {
    return data.map(q => {
        const options = [q.optiona, q.optionb, q.optionc, q.optiond]
            .filter(opt => opt !== null && opt !== 'null' && opt !== '');

        return {
            qid: q.qid, // Key for IndexedDB
            subject: 'english',
            topic: q.topic,
            subtopic: q.subtopic,
            difficulty: q.difficulty || 'E',
            question: q.questiontext,
            options: options,
            answer: q.correctanswer,
            explanation: q.detailedsolution,
            hint: q.hint,
            image_url: q.imagelocation === 'null' ? null : q.imagelocation,
            variant: q.qid.includes('-V') ? q.qid.split('-V')[1] : 'V0',
            isPLE: q.marked_ple === 'yes',
            type: q.questiontype || 'MCQ',
            tags: q.tags || [],
            source: q.source_sheet,
            engine_type: q.engine_type,
            json_reference_path: q.json_reference_path
        };
    });
}

