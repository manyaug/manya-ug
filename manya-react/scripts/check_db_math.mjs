import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from('manya_vault')
        .select('subtopic, qid')
        .eq('subject', 'MATH');

    if (error) {
        console.error(error);
        return;
    }

    const counts = {};
    data.forEach(row => {
        const sub = row.subtopic;
        counts[sub] = (counts[sub] || 0) + 1;
    });

    console.log("Distinct subtopics and counts:", counts);
}

run();
