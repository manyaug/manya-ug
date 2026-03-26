/**
 * ENHANCED EXCEL -> SUPABASE MIGRATION SCRIPT v2.0
 * -----------------------------------------------
 * 1. Loads 'Raw' and 'Rephrased' sheets from sst_p7_question_bank.xlsx.
 * 2. Implements "Strict Subtopic Mapping" to fix mis-categorized questions 
 *    (e.g., GMT questions in world_stage).
 * 3. Batches 1800+ questions for full data parity.
 */

import XLSX from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const EXCEL_FILE = path.join(__dirname, '../public/content/sst/sst_p7_question_bank.xlsx');

/**
 * Clean subtopic based on question content.
 */
function getCleanSubtopic(row) {
    const text = (row.questiontext || '').toLowerCase();
    const sub = (row.subtopic || '').toLowerCase();

    // Fix GMT/Time questions tagged as 'world_stage'
    if (sub === 'world_stage' || sub === 'grid_master') {
        if (text.includes('gmt') || text.includes('noon') || text.includes('calculate the time') || text.includes('4 minutes')) {
            return 'time_calc';
        }
    }
    
    // Fix Latitude/Longitude questions in 'world_stage'
    if (sub === 'world_stage') {
        if (text.includes('latitude') || text.includes('longitude') || text.includes('equator') || text.includes('meridian')) {
            // Only if it's purely about the lines, not the fact that Africa is on them
            if (!text.includes('africa')) return 'latitudes_longitudes';
        }
    }

    return row.subtopic;
}

async function migrate() {
    console.log("🚀 Starting Enhanced Excel-to-Supabase migration...");

    try {
        const workbook = XLSX.readFile(EXCEL_FILE);
        let allFormatted = [];

        ['Raw', 'Rephrased'].forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
                console.warn(`⚠️ Sheet '${sheetName}' not found.`);
                return;
            }

            const data = XLSX.utils.sheet_to_json(worksheet);
            console.log(`📦 Processing ${data.length} rows from [${sheetName}]...`);

            const formatted = data
                .filter(row => row.qid && (row.questiontext || row.engine_type || row.json_reference_path))
                .map(row => ({
                    qid: row.qid,
                    term: row.term === 'null' ? null : row.term,
                    topic: row.topic,
                    subtopic: getCleanSubtopic(row),
                    difficulty: row.difficulty,
                    marked_ple: row.marked_ple,
                    questiontype: row.questiontype,
                    parentid: row.parentid === 'null' ? null : row.parentid,
                    orderinparent: row.orderinparent === 'null' ? null : row.orderinparent,
                    questiontext: row.questiontext,
                    optiona: row.optiona === 'null' ? null : row.optiona,
                    optionb: row.optionb === 'null' ? null : row.optionb,
                    optionc: row.optionc === 'null' ? null : row.optionc,
                    optiond: row.optiond === 'null' ? null : row.optiond,
                    correctanswer: row.correctanswer,
                    hint: row.hint === 'null' ? null : row.hint,
                    detailedsolution: row.detailedsolution === 'null' ? null : row.detailedsolution,
                    imagelocation: row.imagelocation === 'null' ? null : row.imagelocation,
                    tags: row.tags && row.tags !== 'null' ? JSON.parse(row.tags) : [],
                    engine_type: row.engine_type === 'null' ? null : row.engine_type,
                    mode: row.mode === 'null' ? null : row.mode,
                    json_reference_path: row.json_reference_path === 'null' ? null : row.json_reference_path,
                    model_url: row.model_url === 'null' ? null : row.model_url,
                    has_hotspots: row.has_hotspots === 'null' ? null : row.has_hotspots,
                    variant_title: row.variant_title === 'null' ? null : row.variant_title,
                    question_count: row.question_count && row.question_count !== 'null' ? parseInt(row.question_count) : null,
                    full_json_raw: row.full_json_raw === 'null' ? null : row.full_json_raw,
                    filename: row.filename === 'null' ? null : row.filename,
                    folder: row.folder === 'null' ? null : row.folder,
                    source_sheet: sheetName
                }));

            allFormatted = allFormatted.concat(formatted);
        });

        console.log(`✨ Total valid questions formatted: ${allFormatted.length}`);

        // Upload in batches
        const BATCH_SIZE = 100;
        for (let i = 0; i < allFormatted.length; i += BATCH_SIZE) {
            const batch = allFormatted.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
                .from('questions')
                .upsert(batch, { onConflict: 'qid' });

            if (error) {
                console.error(`❌ Error uploading batch at index ${i}:`, error.message);
                throw error;
            } else {
                console.log(`✅ Uploaded batch ${i / BATCH_SIZE + 1} of ${Math.ceil(allFormatted.length / BATCH_SIZE)}`);
            }
        }

        console.log("🏁 Enhanced Migration successful!");
    } catch (err) {
        console.error("💥 Migration failed:", err.message);
    }
}

migrate();
