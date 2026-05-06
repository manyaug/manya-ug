const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nvwzsrrsbrioragjchyn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52d3pzcnJzYnJpb3JhZ2pjaHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MzUxNTUsImV4cCI6MjA5MTMxMTE1NX0.hxj4SYLjRmUYWX8ijJkdZzgmYSoU0gvGu9Q41eJ4G_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log("Fetching PQ-SIM-ENG-06-010 from Vault...");
    const { data, error } = await supabase
        .from('manya_vault')
        .select('*')
        .in('qid', ['PQ-SIM-ENG-06-010', 'PQ-SIM-ENG-01-004']);

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    console.log(`Found ${data.length} questions:`);
    data.forEach(q => {
        console.log(`\n- QID: ${q.qid}`);
        console.log(`  Engine Type: ${q.engine_type}`);
        console.log(`  Item Type: ${q.item_type}`);
        console.log(`  Topic: ${q.topic}`);
        console.log(`  Subtopic: ${q.subtopic}`);
        console.log(`  Question Text: ${q.question_text ? q.question_text.substring(0, 80) + '...' : 'None'}`);
    });
}

run();
