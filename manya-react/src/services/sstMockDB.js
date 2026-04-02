import { supabase } from './supabaseClient';
import { ManyaDB } from '../utils/manyaDB';

// Simple in-memory cache to speed up re-entry within the same session
const BANK_CACHE = {};

// Map subtopic names (from URL/Navigation) to 'subtopic' column in Supabase
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
 * Fetches and transforms questions from Supabase.
 * Returns a unified array containing both Raw and Rephrased questions for the subtopic.
 * Implements OFFLINE-FIRST strategy using ManyaDB (IndexedDB).
 */
export const fetchSstQuestions = async (topicId) => {
    try {
        const subtopic = SUBTOPIC_MAP[topicId] || topicId;
        console.log(`📚 [SSTFetcher] topicId="${topicId}" → subtopic="${subtopic}"`);
        
        // 1. Return from in-memory cache if available (Fastest)
        if (BANK_CACHE[subtopic]) {
            console.log(`⚡ [Cache] Serving ${subtopic} from in-memory cache (${BANK_CACHE[subtopic].length} Q).`);
            return BANK_CACHE[subtopic];
        }

        // 2. Try IndexedDB (Persistent Offline Cache)
        // NOTE: ManyaDB.getCachedQuestions filters by q.topic, but our transformed objects
        // store the raw DB topic column. Fetch ALL sst questions and filter by subtopic manually.
        const allCached = await ManyaDB.getCachedQuestions('sst');
        const cached = allCached.filter(q => q.subtopic === subtopic);
        if (cached && cached.length > 0) {
            console.log(`📦 [ManyaDB] Serving ${subtopic} from IndexedDB (${cached.length} Q).`);
            BANK_CACHE[subtopic] = cached;
            return cached;
        }

        // 3. Try Supabase with Primary Subtopic
        console.log(`🔍 [Supabase] Fetching questions for subtopic="${subtopic}" from questions_sst table...`);
        let { data, error } = await supabase
            .from('questions_sst')
            .select('*')
            .eq('subtopic', subtopic);

        // 4. SMART FALLBACK: If 0 rows, try sanitizing the name (stripping quest_ prefix)
        if (!error && (!data || data.length === 0) && subtopic.includes('quest_')) {
            const sanitized = subtopic.replace(/^quest_\d+_/, '');
            console.warn(`⚠️ [Supabase] 0 rows for "${subtopic}". Retrying with sanitized name: "${sanitized}"...`);
            
            const retry = await supabase
                .from('questions_sst')
                .select('*')
                .eq('subtopic', sanitized);
            
            if (retry.data && retry.data.length > 0) {
                data = retry.data;
                console.log(`✅ [Fallback Success] Found ${data.length} SST questions using sanitized name.`);
            } else {
                // Secondary Fallback: Try with spaces instead of underscores
                const withSpaces = sanitized.replace(/_/g, ' ');
                console.warn(`⚠️ [Supabase] Still 0 rows. Retrying with spaces: "${withSpaces}"...`);
                const retry2 = await supabase
                    .from('questions_sst')
                    .select('*')
                    .eq('subtopic', withSpaces);
                if (retry2.data && retry2.data.length > 0) {
                    data = retry2.data;
                    console.log(`✅ [Secondary Fallback Success] Found ${data.length} questions using spaces.`);
                }
            }
        }

        if (error) {
            console.error(`❌ [Supabase] RLS or query error for subtopic "${subtopic}":`, error);
            throw error;
        }

        if (!data || data.length === 0) {
            console.warn(`⚠️ [Supabase] 0 rows returned for subtopic="${subtopic}" even after fallback.`);
            console.warn(`   Likely causes: (1) RLS blocking anon reads, (2) subtopic value mismatch in DB, (3) table is empty.`);
            console.warn(`   Check Supabase → Table Editor → questions_sst → RLS policies.`);
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

