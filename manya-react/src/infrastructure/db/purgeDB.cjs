
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

async function purge() {
    const tablesToPurge = [
        'user_answers', 
        'quest_progress', 
        'concept_mastery', 
        'emotional_metrics', 
        'user_chests', 
        'achievements', 
        'badges',
        'daily_coin_earnings',
        'user_challenge_progress',
        'unlocked_content',
        'unlocked_simulations'
    ];

    console.log("🧨 [Purge] Re-Initiating purge with type-safe filters...");

    for (const table of tablesToPurge) {
        try {
            // Use a broad filter that works for both string and numeric IDs
            const { error } = await supabase.from(table).delete().not('id', 'is', null);
            
            if (error) {
                console.log(`❌ [Table] ${table.padEnd(25)} | Error: ${error.message}`);
            } else {
                console.log(`✅ [Table] ${table.padEnd(25)} | Purge successful.`);
            }
        } catch (e) {
             console.log(`❌ [Table] ${table.padEnd(25)} | Exception: ${e.message}`);
        }
    }

    console.log("\n✨ Type-safe purge sequence complete.");
}

purge();
