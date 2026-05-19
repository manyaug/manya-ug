const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
    const match = line.trim().match(/^([^=]+)=(.*)$/);
    if (match) acc[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    return acc;
}, {});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing Supabase credentials');
    process.exit(1);
}

// 1. Fetch user balances
fetch(`${supabaseUrl}/rest/v1/user_balances?select=*`, {
    headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
    }
})
.then(res => res.json())
.then(balances => {
    console.log('--- USER BALANCES IN SUPABASE ---');
    console.log(JSON.stringify(balances, null, 2));
    
    // 2. Fetch profiles
    return fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
})
.then(res => res.json())
.then(profiles => {
    console.log('--- USER PROFILES IN SUPABASE ---');
    console.log(JSON.stringify(profiles, null, 2));
})
.catch(console.error);
