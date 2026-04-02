import { supabase } from './supabaseClient';
import { ManyaDB } from '../utils/manyaDB';
import { resolveSolutionJSON } from '../utils/questionParser';
import { parseSolutionToSteps } from '../utils/solutionVisualizer';

// Simple in-memory cache to speed up re-entry within the same session
const BANK_CACHE = {};
let CACHE_CLEARED = false; // Forced one-time clear per session for v3.6 update

// Map curriculum folder names to 'subtopic' column in Supabase
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
 * Fetches and transforms MATH questions from Supabase.
 * Implements SMART FALLBACK strategy: Try mapping -> Try sanitized -> Give up
 */
export const fetchMathQuestions = async (topicId) => {
    try {
        const subtopic = SUBTOPIC_MAP[topicId] || topicId;
        console.log(`📚 [MathFetcher] topicId="${topicId}" → subtopic="${subtopic}"`);
        
        // --- V3.6 Cache Migration: Clear IndexedDB one time to add 'raw_explanation' field ---
        if (!CACHE_CLEARED) {
            console.log("🛠️ [MathFetcher] Performing one-time IndexedDB cache clear for metadata upgrade...");
            await ManyaDB.clearQuestionCache();
            CACHE_CLEARED = true;
        }
        
        // 1. Return from in-memory cache if available
        if (BANK_CACHE[subtopic]) {
            console.log(`⚡ [Cache] Serving ${subtopic} from in-memory cache (${BANK_CACHE[subtopic].length} Q).`);
            return BANK_CACHE[subtopic];
        }

        // 2. Try IndexedDB (Persistent Offline Cache)
        const allCached = await ManyaDB.getCachedQuestions('math');
        const cached = allCached.filter(q => q.subtopic === subtopic);
        if (cached && cached.length > 0) {
            console.log(`📦 [ManyaDB] Serving ${subtopic} from IndexedDB (${cached.length} Q).`);
            BANK_CACHE[subtopic] = cached;
            return cached;
        }

        // 3. Try Supabase with Primary Subtopic
        console.log(`🔍 [Supabase] Fetching questions for subtopic="${subtopic}" from questions_math table...`);
        let { data, error } = await supabase
            .from('questions_math')
            .select('*')
            .eq('subtopic', subtopic);

        // 4. SMART FALLBACK: If 0 rows, try sanitizing the name
        if (!error && (!data || data.length === 0) && subtopic.includes('quest_')) {
            const sanitized = subtopic.replace(/^quest_\d+_/, ''); // "quest_02_..." -> "..."
            console.warn(`⚠️ [Supabase] 0 rows for "${subtopic}". Retrying with sanitized name: "${sanitized}"...`);
            
            const retry = await supabase
                .from('questions_math')
                .select('*')
                .eq('subtopic', sanitized);
            
            if (retry.data && retry.data.length > 0) {
                data = retry.data;
                console.log(`✅ [Fallback Success] Found ${data.length} questions using sanitized name.`);
            } else {
                // Secondary Fallback: Try with spaces instead of underscores
                const withSpaces = sanitized.replace(/_/g, ' ');
                console.warn(`⚠️ [Supabase] Still 0 rows. Retrying with spaces: "${withSpaces}"...`);
                const retry2 = await supabase
                    .from('questions_math')
                    .select('*')
                    .eq('subtopic', withSpaces);
                if (retry2.data && retry2.data.length > 0) {
                    data = retry2.data;
                    console.log(`✅ [Secondary Fallback Success] Found ${data.length} questions using spaces.`);
                }
            }
        }

        if (error) {
            console.error(`❌ [Supabase] Query error for subtopic "${subtopic}":`, error);
            throw error;
        }
        
        if (!data || data.length === 0) {
            console.warn(`⚠️ [Supabase] 0 rows returned for subtopic="${subtopic}" even after fallback.`);
            return [];
        }

        const transformed = data.map(q => {
            const options = [q.optiona, q.optionb, q.optionc, q.optiond]
                .filter(opt => opt !== null && opt !== 'null' && opt !== '');

            return {
                id: q.qid,
                qid: q.qid,
                subject: 'math',
                topic: q.topic,
                subtopic: q.subtopic,
                difficulty: q.difficulty || 'E',
                question: q.questiontext,
                options: options,
                answer: q.correctanswer,
                explanation: parseSolutionToSteps(q.detailedsolution),
                raw_explanation: q.detailedsolution, // keep for debugging
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
        
        // 5. Save to both caches for future use
        BANK_CACHE[subtopic] = transformed;
        await ManyaDB.cacheQuestions(transformed);
        
        return transformed;

    } catch (error) {
        console.error("[Math Supabase Service] Fetch Error:", error.message);
        return [];
    }
};
