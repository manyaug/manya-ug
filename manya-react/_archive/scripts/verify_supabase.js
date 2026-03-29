import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("🔍 [Verification] Checking Supabase data for contamination...");

    // 1. Check world_stage for GMT
    const { data: wsData, error: wsError } = await supabase
        .from('questions')
        .select('qid, questiontext')
        .eq('subtopic', 'world_stage');

    if (wsError) console.error(wsError);
    
    const contaminated = wsData?.filter(q => 
        q.questiontext.toLowerCase().includes('gmt') || 
        q.questiontext.toLowerCase().includes('noon')
    );

    if (contaminated && contaminated.length > 0) {
        console.error("❌ Still found contaminated questions in world_stage:", contaminated);
    } else {
        console.log("✅ world_stage is CLEAN of GMT/Time questions.");
    }

    // 2. Check if the specific question was moved to time_calc
    const { data: moveData } = await supabase
        .from('questions')
        .select('subtopic')
        .eq('qid', 'SST-P7-T1-00056')
        .single();

    if (moveData?.subtopic === 'time_calc') {
        console.log("✅ SST-P7-T1-00056 successfully moved to time_calc.");
    } else {
        console.error("❌ SST-P7-T1-00056 is still in:", moveData?.subtopic);
    }

    // 3. Check total counts
    const { count: rawCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('source_sheet', 'Raw');

    const { count: rephrasedCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('source_sheet', 'Rephrased');

    console.log(`📊 Total Raw: ${rawCount}`);
    console.log(`📊 Total Rephrased: ${rephrasedCount}`);
    console.log(`📊 Grand Total: ${(rawCount || 0) + (rephrasedCount || 0)}`);
}

check();
