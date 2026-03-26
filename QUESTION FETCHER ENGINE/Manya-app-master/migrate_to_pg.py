import sqlite3
import psycopg2

# --- Configuration ---
SQLITE_PATH = "manya.db"
PG_CONN_STRING = "host=localhost port=5432 dbname=manya_db user=postgres password=postgres"

# --- Connect to both databases ---
sqlite_conn = sqlite3.connect(SQLITE_PATH)
sqlite_cursor = sqlite_conn.cursor()

pg_conn = psycopg2.connect(PG_CONN_STRING)
pg_cursor = pg_conn.cursor()
pg_conn.autocommit = False  # Use transactions for safety

# --- Get list of tables from SQLite ---
sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [table[0] for table in sqlite_cursor.fetchall()]

print(f"Found tables: {tables}")

for table_name in tables:
    print(f"\n--- Migrating {table_name} ---")
    
    # 1. Get table schema
    sqlite_cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table_name}';")
    create_sql = sqlite_cursor.fetchone()[0]
    
    # 2. Convert SQLite schema to PostgreSQL
    #    - Replace AUTOINCREMENT with SERIAL
    #    - Remove sqlite_sequence references
    create_sql = create_sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
    create_sql = create_sql.replace("AUTOINCREMENT", "")
    
    # 3. Drop and recreate table in PostgreSQL
    pg_cursor.execute(f"DROP TABLE IF EXISTS {table_name} CASCADE;")
    pg_cursor.execute(create_sql)
    print(f"   Table created.")
    
    # 4. Get data from SQLite
    sqlite_cursor.execute(f"SELECT * FROM {table_name};")
    rows = sqlite_cursor.fetchall()
    
    if rows:
        # Get column names (excluding the sqlite_sequence table which is internal)
        if table_name != "sqlite_sequence":
            sqlite_cursor.execute(f"PRAGMA table_info({table_name});")
            columns = [col[1] for col in sqlite_cursor.fetchall()]
            placeholders = ','.join(['%s'] * len(columns))
            insert_sql = f"INSERT INTO {table_name} ({','.join(columns)}) VALUES ({placeholders})"
            
            # Insert data in batches
            batch_size = 100
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i+batch_size]
                pg_cursor.executemany(insert_sql, batch)
                pg_conn.commit()
                print(f"   Inserted rows {i} to {i+len(batch)}")
    
    pg_conn.commit()

print("\n✅ Migration complete!")

# --- Clean up ---
sqlite_conn.close()
pg_cursor.close()
pg_conn.close()