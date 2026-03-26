// db-retry.js - Retry wrapper for database operations

class DBRetry {
    constructor(db) {
        this.db = db;
        this.maxRetries = 5;
        this.retryDelay = 100; // ms
    }

    async execute(operation, context = '') {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (error.code === 'SQLITE_BUSY') {
                    console.log(`⚠️ Database busy (attempt ${attempt}/${this.maxRetries})${context ? ' - ' + context : ''}`);
                    
                    if (attempt < this.maxRetries) {
                        // Exponential backoff
                        const delay = this.retryDelay * Math.pow(2, attempt - 1);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                } else {
                    // Not a busy error, don't retry
                    throw error;
                }
            }
        }
        
        throw lastError;
    }

    get(sql, params = [], context = '') {
        return this.execute(() => {
            return new Promise((resolve, reject) => {
                this.db.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }, context);
    }

    all(sql, params = [], context = '') {
        return this.execute(() => {
            return new Promise((resolve, reject) => {
                this.db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        }, context);
    }

    run(sql, params = [], context = '') {
        return this.execute(() => {
            return new Promise((resolve, reject) => {
                this.db.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID, changes: this.changes });
                });
            });
        }, context);
    }
}

module.exports = DBRetry;