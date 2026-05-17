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
    const subtopic = 'application_of_sets';
    const spaceSub = 'application of sets';
    const topicId = 'quest_08_application_of_sets';

    const orFilter = `subtopic.ilike.%${subtopic}%,subtopic.ilike.%${spaceSub}%,subtopic.ilike.%${topicId}%`;
    console.log("Or filter:", orFilter);

    const { data, error } = await supabase
        .from('manya_vault')
        .select('*')
        .eq('subject', 'MATH')
        .or(orFilter);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Query returned ${data.length} records.`);
    console.log("Records detail (qid and subtopic):");
    data.forEach(d => {
        console.log(`- qid: ${d.qid}, subtopic: ${d.subtopic}, item_type: ${d.item_type}`);
    });
}

run();
