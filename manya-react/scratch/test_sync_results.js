import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("🔍 Fetching a sample of synced records...");
    
    // Fetch 5 notes/recap items
    const { data: nonMcqs, error: err1 } = await supabase
        .from('manya_vault')
        .select('qid, subject, item_type, engine_type, cdn_url, option_a, correct_answer')
        .in('item_type', ['Notes', 'Recaps', 'Interactive_study', 'Interactive_questions'])
        .limit(5);

    if (err1) {
        console.error("❌ Error fetching non-MCQs:", err1.message);
    } else {
        console.log("\n📁 SAMPLE NON-MCQ RECORDS (Should have NULL options and relative cdn_urls):");
        console.table(nonMcqs);
    }

    // Fetch 5 MCQ items
    const { data: mcqs, error: err2 } = await supabase
        .from('manya_vault')
        .select('qid, subject, item_type, engine_type, cdn_url, option_a, correct_answer')
        .eq('item_type', "MCQ's")
        .limit(5);

    if (err2) {
        console.error("❌ Error fetching MCQs:", err2.message);
    } else {
        console.log("\n📝 SAMPLE MCQ RECORDS (Should have actual options and resolved engine types):");
        console.table(mcqs);
    }

    // Print breakdown of item_types
    const { data: counts, error: err3 } = await supabase
        .rpc('get_item_type_counts'); // Let's just do a normal query or group count if we can, or just print total counts for each type manually

    const types = ["MCQ's", "Notes", "Recaps", "Interactive_study", "Interactive_questions"];
    console.log("\n📊 DATABASE RECORDS SUMMARY:");
    for (const type of types) {
        const { count, error } = await supabase
            .from('manya_vault')
            .select('*', { count: 'exact', head: true })
            .eq('item_type', type);
        if (error) console.error(`❌ Error counting ${type}:`, error.message);
        else console.log(`  - ${type}: ${count} rows`);
    }
}

run();
