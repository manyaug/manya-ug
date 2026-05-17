const {createClient} = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
(async () => {
    let q = "SELECT child.relname, pg_get_expr(child.relpartbound, child.oid) FROM pg_inherits JOIN pg_class parent ON pg_inherits.inhparent = parent.oid JOIN pg_class child ON pg_inherits.inhrelid = child.oid WHERE parent.relname = 'manya_vault_math'";
    let res = await sb.rpc('query', {sql: q});
    console.log(res);
})();
