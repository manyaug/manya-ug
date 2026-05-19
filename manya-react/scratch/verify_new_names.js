import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("🔍 Querying for the renamed science recap and study records in Supabase...");
    
    const targetQids = [
        'recap_types_of_skeletons',
        'recap_human_skeleton',
        'study_human_skeleton',
        'recap_axial_skull_spine',
        'recap_axial_rib_cage',
        'recap_appendicular_limbs',
        'recap_bone_structure',
        'recap_joints_structure',
        'recap_hinge_ball_socket',
        'recap_pivot_gliding',
        'recap_muscular_system_types',
        'recap_muscle_action_antagonistic_pairs',
        'recap_posture_teeth',
        'recap_disorders_first_aid',
        'recap_bone_diseases'
    ];

    const { data, error } = await supabase
        .from('manya_vault')
        .select('qid, subject, item_type, engine_type, cdn_url')
        .in('qid', targetQids);

    if (error) {
        console.error("❌ Error querying database:", error.message);
    } else {
        console.log(`\n🎉 Found ${data.length} out of ${targetQids.length} migrated specific records:`);
        console.table(data);
    }
}

run();
