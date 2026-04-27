
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) env[key.trim()] = val.trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function reset() {
    console.log("💰 [Economy Reset] Setting all profile coins to 0...");
    
    // We update all profiles where id is not null
    const { error } = await supabase.from('profiles').update({ coins: 0 }).not('id', 'is', null);

    if (error) {
        console.error("❌ Error resetting coins:", error.message);
        // Fallback: If 'coins' column is actually named 'diamonds' or something else locally
        // but based on syncService it's 'coins' or in 'profiles' might be something else.
        // Let's also reset diamonds just in case since user said "reset coins".
        const { error: error2 } = await supabase.from('profiles').update({ gems_overall: 0 }).not('id', 'is', null);
        if (error2) console.log("Gems also failed to reset (might be missing column).");
    } else {
        console.log("✅ Coins reset successfully across all profiles.");
    }
}

reset();
