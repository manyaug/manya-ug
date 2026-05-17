const {createClient} = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
(async () => {
    let res = await sb.from('manya_vault').insert([{qid: 't1', subject: 'MATH', item_type: 'MCQ', grade_level: 'P7'}]);
    console.log('P7 uppercase:', res.error);

    res = await sb.from('manya_vault').insert([{qid: 't2', subject: 'MATH', item_type: 'MCQ', grade_level: 'p7'}]);
    console.log('p7 lowercase:', res.error);
})();
