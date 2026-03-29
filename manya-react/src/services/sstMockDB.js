import { supabase } from './supabaseClient';
import { ManyaDB } from '../utils/manyaDB';

// Simple in-memory cache to speed up re-entry within the same session
const BANK_CACHE = {};

// Map subtopic names (from URL/Navigation) to 'subtopic' column in Supabase
const SUBTOPIC_MAP = {
    'quest_1_world_stage': 'world_stage',
    'quest_2_grid_master': 'latitudes_longitudes',
    'quest_3_calculating_time': 'time_calc',
    'quest_4_water_bodies': 'water_bodies',
    'quest_5_coastal_features': 'water_borders',
    'quest_6_regional_division_capital_cities': 'regional_division_capital_cities',
    'quest_7_landlocked_countries': 'regions_capitals'
};

/**
 * Fetches and transforms questions from Supabase.
 * Returns a unified array containing both Raw and Rephrased questions for the subtopic.
 * Implements OFFLINE-FIRST strategy using ManyaDB (IndexedDB).
 */
export const fetchSstQuestions = async (topicId) => {
    try {
        const subtopic = SUBTOPIC_MAP[topicId] || topicId;
        
        // 1. Return from in-memory cache if available (Fastest)
        if (BANK_CACHE[subtopic]) {
            console.log(`⚡ [Cache] Serving ${subtopic} from in-memory cache.`);
            return BANK_CACHE[subtopic];
        }

        // 2. Try IndexedDB (Persistent Offline Cache)
        const cached = await ManyaDB.getCachedQuestions('sst', subtopic);
        if (cached && cached.length > 0) {
            console.log(`📦 [ManyaDB] Serving ${subtopic} from IndexedDB.`);
            BANK_CACHE[subtopic] = cached; // Update session cache
            return cached;
        }

        console.log(`🔍 [Supabase] Fetching ALL questions (Raw + Rephrased) for subtopic: ${subtopic}`);

        const { data, error } = await supabase
            .from('questions_sst')
            .select('*')
            .eq('subtopic', subtopic);

        if (error) throw error;
        if (!data || data.length === 0) {
            console.warn(`⚠️ No questions found in Supabase for subtopic: ${subtopic}`);
            return [];
        }

        const transformed = data.map(q => {
            // Collect options, removing potential nulls
            const options = [q.optiona, q.optionb, q.optionc, q.optiond]
                .filter(opt => opt !== null && opt !== 'null' && opt !== '');

            return {
                id: q.qid,
                qid: q.qid, // Ensuring naming consistency for ManyaDB
                subject: 'sst',
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
                parentid: q.parentid,
                json_reference_path: q.json_reference_path,
                engine_type: q.engine_type,
                mode: q.mode,
                model_url: q.model_url,
                has_hotspots: q.has_hotspots,
                variant_title: q.variant_title,
                question_count: q.question_count,
                full_json_raw: q.full_json_raw,
                filename: q.filename,
                folder: q.folder
            };
        });

        console.log(`✅ [Supabase] Loaded ${transformed.length} questions for ${subtopic}`);
        
        // 3. Save to both caches for future use
        BANK_CACHE[subtopic] = transformed;
        await ManyaDB.cacheQuestions(transformed);
        
        return transformed;

    } catch (error) {
        console.error("[SST Supabase Service] Fetch Error:", error.message);
        return [];
    }
};

