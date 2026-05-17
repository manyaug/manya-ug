const {createClient} = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
(async () => {
    let q = "SELECT relname, pg_get_expr(relpartbound, oid) AS bound FROM pg_class WHERE relname LIKE 'manya_vault%' OR relname LIKE 'questions_%'";
    let res = await sb.rpc('query', {sql: q});
    console.log(res.data);
})();
