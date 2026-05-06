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

fetch(`${supabaseUrl}/rest/v1/math_questions?select=*&limit=1`, {
    headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
    }
})
.then(res => res.json())
.then(data => {
    console.log(JSON.stringify(data[0], null, 2));
})
.catch(console.error);
