/**
 * MANYA SST SUPABASE DB SERVICE
 * ----------------------------
 * Fetches SST questions directly from Supabase.
 * Now includes BOTH Raw questions and their Rephrased variants.
 */

import { supabase } from './supabaseClient';

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
 */
export const fetchSstQuestions = async (topicId) => {
    try {
        const subtopic = SUBTOPIC_MAP[topicId] || topicId;
        
        console.log(`🔍 [Supabase] Fetching ALL questions (Raw + Rephrased) for subtopic: ${subtopic}`);

        const { data, error } = await supabase
            .from('questions')
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
                source: q.source_sheet
            };
        });

        console.log(`✅ [Supabase] Loaded ${transformed.length} questions for ${subtopic}`);
        return transformed;

    } catch (error) {
        console.error("[SST Supabase Service] Fetch Error:", error.message);
        return [];
    }
};
