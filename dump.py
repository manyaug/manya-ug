import sqlite3
import sys

def dump_schema():
    conn = sqlite3.connect('temp_manya.db')
    cursor = conn.cursor()
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    
    with open('temp_schema.txt', 'w') as f:
        for row in cursor.fetchall():
            if row[0]:
                f.write(row[0] + '\n\n')

    conn.close()

if __name__ == '__main__':
    dump_schema()
