
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

async function deepProbe() {
    const tables = [
        'achievements', 'badges', 'chest_reward_pool', 'concept_error_tracking', 
        'concept_mastery', 'daily_challenges', 'daily_coin_earnings', 
        'emotional_metrics', 'manya_vault', 'manya_vault_english', 
        'power_ups', 'profiles', 'quest_progress', 'unlocked_content', 
        'unlocked_simulations', 'user_answers', 'user_challenge_progress', 
        'user_chests', 'user_sessions'
    ];

    console.log("🌌 [Deep Probe] Harvesting live Supabase architecture...");
    
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`❌ [Table] ${table.padEnd(25)} | Error: ${error.message}`);
                continue;
            }
            if (data && data.length > 0) {
                console.log(`✅ [Table] ${table.padEnd(25)} | Columns: ${Object.keys(data[0]).join(', ')}`);
            } else {
                // Table exists but is empty
                console.log(`⚠️ [Table] ${table.padEnd(25)} | Exists but Empty (Schema verified via select)`);
            }
        } catch (e) {
            console.log(`❌ [Table] ${table.padEnd(25)} | Exception: ${e.message}`);
        }
    }
}

deepProbe();
