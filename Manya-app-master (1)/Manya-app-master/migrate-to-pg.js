const sqlite3 = require('sqlite3');
const { Pool } = require('pg');
const fs = require('fs');

// Configuration
const SQLITE_PATH = './manya.db';
const PG_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'manya_db',
    user: 'postgres',
    password: 'root', // Change this to your actual password
};

async function migrate() {
    console.log('🔄 Starting migration from SQLite to PostgreSQL...');
    
    // Connect to SQLite
    const sqlite = new sqlite3.Database(SQLITE_PATH, (err) => {
        if (err) {
            console.error('❌ Error connecting to SQLite:', err.message);
            process.exit(1);
        }
        console.log('✅ Connected to SQLite');
    });

    // Connect to PostgreSQL
    const pg = new Pool(PG_CONFIG);
    
    try {
        // Test PostgreSQL connection
        await pg.query('SELECT 1');
        console.log('✅ Connected to PostgreSQL');
    } catch (err) {
        console.error('❌ Error connecting to PostgreSQL:', err.message);
        process.exit(1);
    }

    // Get all tables from SQLite
    const tables = await new Promise((resolve, reject) => {
        sqlite.all(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(r => r.name));
            }
        );
    });

    console.log('\n📋 Found tables in SQLite:', tables);

    // Migrate each table
    for (const table of tables) {
        console.log(`\n📦 Migrating table: ${table}`);
        
        try {
            // Get table schema
            const schema = await new Promise((resolve, reject) => {
                sqlite.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            const columns = schema.map(col => col.name);
            console.log(`   Columns: ${columns.join(', ')}`);

            // Drop table if exists in PostgreSQL
            try {
                await pg.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
                console.log(`   Dropped existing table`);
            } catch (err) {
                // Ignore drop errors
            }

            // Create table in PostgreSQL
            const createColumns = schema.map(col => {
                let type = col.type.toUpperCase();
                // Convert SQLite types to PostgreSQL
                if (type.includes('INT')) {
                    if (col.pk) return `"${col.name}" SERIAL PRIMARY KEY`;
                    return `"${col.name}" INTEGER`;
                }
                if (type.includes('CHAR') || type.includes('TEXT')) return `"${col.name}" TEXT`;
                if (type.includes('REAL') || type.includes('DOUB')) return `"${col.name}" DOUBLE PRECISION`;
                if (type.includes('BOOL')) return `"${col.name}" BOOLEAN`;
                if (type.includes('DATE') || type.includes('TIME')) return `"${col.name}" TIMESTAMP`;
                return `"${col.name}" TEXT`;
            }).join(',\n            ');

            const createSQL = `CREATE TABLE "${table}" (\n            ${createColumns}\n        )`;
            
            try {
                await pg.query(createSQL);
                console.log(`   ✅ Table created`);
            } catch (err) {
                console.error(`   ❌ Error creating table:`, err.message);
                continue;
            }

            // Get data from SQLite
            const rows = await new Promise((resolve, reject) => {
                sqlite.all(`SELECT * FROM "${table}"`, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            if (rows.length === 0) {
                console.log(`   📭 No data to migrate`);
                continue;
            }

            // Insert data in batches
            const batchSize = 100;
            let inserted = 0;
            
            for (let i = 0; i < rows.length; i += batchSize) {
                const batch = rows.slice(i, i + batchSize);
                
                // Build parameterized insert query
                const placeholders = batch.map((_, idx) => 
                    `(${columns.map((_, j) => `$${idx * columns.length + j + 1}`).join(', ')})`
                ).join(', ');
                
                const values = batch.flatMap(row => 
                    columns.map(col => {
                        const val = row[col];
                        // Handle SQLite-specific values
                        if (val === null) return null;
                        if (typeof val === 'object') return JSON.stringify(val);
                        return val;
                    })
                );

                const insertSQL = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES ${placeholders}`;

                try {
                    await pg.query(insertSQL, values);
                    inserted += batch.length;
                    console.log(`   ✅ Inserted rows ${i + 1} to ${i + batch.length} (${inserted}/${rows.length})`);
                } catch (err) {
                    console.error(`   ❌ Error inserting batch:`, err.message);
                    // Try one by one for debugging
                    console.log(`   🔍 Attempting single-row inserts for debugging...`);
                    for (const row of batch) {
                        const singleValues = columns.map(col => row[col]);
                        const singlePlaceholders = columns.map((_, j) => `$${j + 1}`).join(', ');
                        const singleSQL = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${singlePlaceholders})`;
                        try {
                            await pg.query(singleSQL, singleValues);
                        } catch (singleErr) {
                            console.error(`      ❌ Failed on row:`, row);
                            console.error(`      Error:`, singleErr.message);
                        }
                    }
                }
            }

            console.log(`   ✅ Migrated ${inserted} rows to ${table}`);

        } catch (err) {
            console.error(`   ❌ Error migrating table ${table}:`, err.message);
        }
    }

    console.log('\n🎉 Migration complete!');
    
    // Close connections
    sqlite.close();
    await pg.end();
}

// Run the migration
migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});