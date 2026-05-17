const {createClient} = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
(async () => {
    const grades = ['p6', 'P6', 'primary 6', 'primary_6', 'grade 6', 'Grade 6', 'p8', 'P8', 'primary 8', 'grade 8', 'math', 'MATH', 'Math', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'Primary 7', 'Primary_7'];
    for (let g of grades) {
        let res = await sb.from('manya_vault').insert([{qid: 't_math_'+g, subject: 'MATH', grade_level: g}]);
        if (!res.error) {
            console.log('SUCCESS for MATH:', g);
            return;
        }
    }
    console.log('None of the math grades worked.');
})();
