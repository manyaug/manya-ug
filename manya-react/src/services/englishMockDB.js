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
        
        // 1. Session Cache
        if (BANK_CACHE[topic]) return BANK_CACHE[topic];

        // 2. Persistent Cache (IndexedDB)
        const cached = await ManyaDB.getCachedQuestions('english', topic);
        if (cached && cached.length > 0) {
            BANK_CACHE[topic] = cached;
            return cached;
        }

        console.log(`🔍 [English Supabase] Fetching for topic: ${topic}`);

        const { data, error } = await supabase
            .from('questions_english')
            .select('*')
            .eq('topic', topic);

        if (error) throw error;
        
        let transformed;
        if (!data || data.length === 0) {
            const { data: defaultData } = await supabase
                 .from('questions_english')
                 .select('*')
                 .eq('topic', 'default')
                 .limit(5);
            transformed = defaultData ? transformData(defaultData) : [];
        } else {
            transformed = transformData(data);
        }

        if (transformed.length > 0) {
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

