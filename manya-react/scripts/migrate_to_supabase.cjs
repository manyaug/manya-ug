const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// ─── CONFIGURATION ──────────────────────────────────────────────────────────
// Ensure these are set in your .env.local file
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ SUPABASE_URL or SUPABASE_KEY is missing. Please provide them.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const EXCEL_PATH = 'd:/manya_app/manya-react/public/content/sst/sst_p7_question_bank.xlsx';

async function migrateExcel() {
    console.log("🚀 Starting SST Excel Migration to Supabase...");

    try {
        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheets = ['Raw', 'Rephrased'];
        let allQuestions = [];

        for (const sheetName of sheets) {
            console.log(`\n📄 Parsing Sheet: ${sheetName}...`);
            const worksheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(worksheet);

            const processed = rawData.map(row => {
                // Determine Variant from QID (e.g., -V1, -V2)
                let variant = 'V0';
                if (row.qid && row.qid.includes('-V')) {
                    variant = row.qid.split('-').pop(); // Extracts V1, V2, etc.
                }

                // Map Options to Array
                const options = [
                    row.optiona, row.optionb, row.optionc, row.optiond
                ].filter(opt => opt && opt !== 'null');

                // Sanitize "null" strings
                const clean = (val) => (val === 'null' || val === null || val === undefined) ? null : val;

                return {
                    id: row.qid,
                    subject: 'sst',
                    topic: clean(row.topic) || 'Locating Africa',
                    subtopic: clean(row.subtopic) || 'mixed',
                    question: clean(row.questiontext),
                    options: options,
                    answer: clean(row.correctanswer),
                    hint: clean(row.hint),
                    solution: clean(row.detailedsolution),
                    image_url: clean(row.imagelocation),
                    variant: variant,
                    difficulty: clean(row.difficulty) || 'E',
                    is_ple: clean(row.marked_ple) === 'yes',
                    type: clean(row.questiontype) || 'MCQ',
                    engine_config: {
                        engine_type: clean(row.engine_type),
                        mode: clean(row.mode),
                        json_path: clean(row.json_reference_path),
                        model_url: clean(row.model_url)
                    }
                };
            }).filter(q => q.question && q.answer); // Filter out empty rows

            allQuestions.push(...processed);
            console.log(`✅ Loaded ${processed.length} questions from ${sheetName}`);
        }

        console.log(`\n📦 Total Questions to Upload: ${allQuestions.length}`);

        // Upload in BATCHES
        const BATCH_SIZE = 100;
        for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
            const batch = allQuestions.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('questions').upsert(batch);

            if (error) {
                console.error(`❌ Batch ERROR:`, error.message);
                // Log the first item in the batch for debugging
                console.log("Sample Data:", JSON.stringify(batch[0], null, 2));
            } else {
                process.stdout.write(`\r✅ Uploaded ${Math.min(i + BATCH_SIZE, allQuestions.length)} / ${allQuestions.length}`);
            }
        }

        console.log("\n\n✨ SST Migration Complete! Your database is now populated.");

    } catch (error) {
        console.error("❌ CRITICAL ERROR:", error.message);
    }
}

migrateExcel();
