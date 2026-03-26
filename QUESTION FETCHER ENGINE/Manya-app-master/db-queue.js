// db-queue.js - Simple queue to prevent SQLITE_BUSY errors
class DatabaseQueue {
    constructor(db) {
        this.db = db;
        this.queue = [];
        this.processing = false;
        this.maxRetries = 3;
    }

    // Queue a database operation
    async execute(operation, context = '') {
        return new Promise((resolve, reject) => {
            this.queue.push({ operation, resolve, reject, context, retries: 0 });
            if (!this.processing) {
                this.processQueue();
            }
        });
    }

    // Process queue sequentially
    async processQueue() {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }

        this.processing = true;
        const item = this.queue.shift();

        try {
            const result = await item.operation();
            item.resolve(result);
        } catch (error) {
            if (error.code === 'SQLITE_BUSY' && item.retries < this.maxRetries) {
                // Retry busy operations
                console.log(`⚠️ Database busy, retrying ${item.context} (attempt ${item.retries + 1}/${this.maxRetries})`);
                item.retries++;
                this.queue.unshift(item); // Put back at front of queue
                await new Promise(r => setTimeout(r, 200 * Math.pow(2, item.retries))); // Exponential backoff
            } else {
                console.error(`❌ Error in ${item.context}:`, error);
                item.reject(error);
            }
        }

        // Small delay between operations
        setTimeout(() => this.processQueue(), 50);
    }

    // Helper methods for common operations
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

module.exports = DatabaseQueue;