const {createClient} = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) acc[match[1]] = match[2].trim();
    return acc;
}, {});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const sb = createClient(supabaseUrl, supabaseKey);

(async () => {
    // Querying all child tables of manya_vault and their bounds
    let q = `
        SELECT 
            parent.relname AS parent_table,
            child.relname AS partition_table,
            pg_get_expr(child.relpartbound, child.oid) AS partition_bound
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        WHERE parent.relname LIKE 'manya_vault%'
        ORDER BY parent_table, partition_table;
    `;
    let res = await sb.rpc('query', {sql: q});
    console.log('PARTITIONS STRUCTURE:');
    console.log(JSON.stringify(res.data || res, null, 2));
})();
