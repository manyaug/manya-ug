const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) acc[match[1]] = match[2].trim();
    return acc;
}, {});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing Supabase credentials');
    process.exit(1);
}

fetch(`${supabaseUrl}/rest/v1/manya_vault?subject=ilike.*math*&subtopic=ilike.*calculating_subsets*`, {
    headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
    }
})
.then(res => res.json())
.then(async (data) => {
    console.log(`Loaded ${data.length} records`);
    const subtopics = new Set();
    data.forEach((d) => {
        subtopics.add(d.subtopic);
    });
    console.log("Subtopics in DB:", Array.from(subtopics));
    console.log("First 10 items qid, subtopic, variant:", data.slice(0, 10).map(d => ({ qid: d.qid || d.id, subtopic: d.subtopic, variant: d.variant })));
    console.log("Items 60-70 qid, subtopic, variant:", data.slice(60, 70).map(d => ({ qid: d.qid || d.id, subtopic: d.subtopic, variant: d.variant })));
})
.catch(console.error);








