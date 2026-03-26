// db-singleton.js - Single database connection manager
const sqlite3 = require('sqlite3').verbose();

class DatabaseSingleton {
    constructor() {
        if (!DatabaseSingleton.instance) {
            this.db = null;
            this.initPromise = null;
            DatabaseSingleton.instance = this;
        }
        return DatabaseSingleton.instance;
    }

    async initialize(dbPath = './manya.db') {
        if (this.db) return this.db;
        
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('✅ Connected to manya.db');
                    // Configure database
                    this.db.serialize(() => {
                        this.db.run('PRAGMA journal_mode = WAL');
                        this.db.run('PRAGMA busy_timeout = 10000');
                        this.db.run('PRAGMA synchronous = NORMAL');
                        this.db.run('PRAGMA cache_size = 20000');
                        this.db.run('PRAGMA foreign_keys = ON');
                    });
                    resolve(this.db);
                }
            });
        });
        
        return this.initPromise;
    }

    get() {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close(() => {
                    console.log('Database connection closed');
                    this.db = null;
                    this.initPromise = null;
                    resolve();
                });
            });
        }
    }
}

const instance = new DatabaseSingleton();
module.exports = instance;