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

fetch(`${supabaseUrl}/rest/v1/manya_vault?qid=eq.PQ-ENG7-T1-00182`, {
    headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
    }
})
.then(res => res.json())
.then(data => {
    console.log('DB Row for PQ-ENG7-T1-00182:', JSON.stringify(data, null, 2));
})
.catch(console.error);
