import { supabase } from './supabaseClient';
import { ManyaDB } from '../utils/manyaDB';

const BANK_CACHE = {};

// Map curriculum folder names to 'subtopic' column in Supabase
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
 * Fetches and transforms SCIENCE questions from Supabase.
 * Implements OFFLINE-FIRST strategy using ManyaDB (IndexedDB).
 */
export const fetchScienceQuestions = async (topicId) => {
    try {
        const subtopic = SUBTOPIC_MAP[topicId] || topicId;
        console.log(`📚 [ScienceFetcher] topicId="${topicId}" → subtopic="${subtopic}"`);
        
        if (BANK_CACHE[subtopic]) {
            console.log(`⚡ [Cache] Serving ${subtopic} from in-memory cache (${BANK_CACHE[subtopic].length} Q).`);
            return BANK_CACHE[subtopic];
        }

        const allCached = await ManyaDB.getCachedQuestions('science');
        const cached = allCached.filter(q => q.subtopic === subtopic);
        if (cached && cached.length > 0) {
            console.log(`📦 [ManyaDB] Serving ${subtopic} from IndexedDB (${cached.length} Q).`);
            BANK_CACHE[subtopic] = cached;
            return cached;
        }

        // 3. Try Supabase with Primary Subtopic
        console.log(`🔍 [Supabase] Fetching questions for subtopic="${subtopic}" from questions_science table...`);
        let { data, error } = await supabase
            .from('questions_science')
            .select('*')
            .eq('subtopic', subtopic);

        // 4. SMART FALLBACK: If 0 rows, try sanitizing the name (stripping quest_ prefix)
        if (!error && (!data || data.length === 0) && subtopic.includes('quest_')) {
            const sanitized = subtopic.replace(/^quest_\d+_/, '');
            console.warn(`⚠️ [Supabase] 0 rows for "${subtopic}". Retrying with sanitized name: "${sanitized}"...`);
            
            const retry = await supabase
                .from('questions_science')
                .select('*')
                .eq('subtopic', sanitized);
            
            if (retry.data && retry.data.length > 0) {
                data = retry.data;
                console.log(`✅ [Fallback Success] Found ${data.length} Science questions using sanitized name.`);
            } else {
                // Secondary Fallback: Try with spaces instead of underscores
                const withSpaces = sanitized.replace(/_/g, ' ');
                console.warn(`⚠️ [Supabase] Still 0 rows. Retrying with spaces: "${withSpaces}"...`);
                const retry2 = await supabase
                    .from('questions_science')
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
                subject: 'science',
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
        
        BANK_CACHE[subtopic] = transformed;
        await ManyaDB.cacheQuestions(transformed);
        
        return transformed;

    } catch (error) {
        console.error("[Science Supabase Service] Fetch Error:", error.message);
        return [];
    }
};
