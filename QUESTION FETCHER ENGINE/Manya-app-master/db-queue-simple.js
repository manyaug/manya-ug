// db-queue-simple.js - Simple operation queue
class DatabaseQueue {
    constructor(db) {
        this.db = db;
        this.queue = [];
        this.processing = false;
    }

    async execute(operation) {
        return new Promise((resolve, reject) => {
            this.queue.push({ operation, resolve, reject });
            if (!this.processing) {
                this.processQueue();
            }
        });
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }

        this.processing = true;
        const { operation, resolve, reject } = this.queue.shift();

        try {
            const result = await operation();
            resolve(result);
        } catch (error) {
            if (error.code === 'SQLITE_BUSY') {
                console.log('Database busy, retrying...');
                // Push back to queue for retry
                this.queue.unshift({ operation, resolve, reject });
                await new Promise(r => setTimeout(r, 100));
            } else {
                reject(error);
            }
        } finally {
            // Process next item after a small delay
            setTimeout(() => this.processQueue(), 50);
        }
    }

    all(sql, params = []) {
        return this.execute(() => {
            return new Promise((resolve, reject) => {
                this.db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        });
    }

    get(sql, params = []) {
        return this.execute(() => {
            return new Promise((resolve, reject) => {
                this.db.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        });
    }

    run(sql, params = []) {
        return this.execute(() => {
            return new Promise((resolve, reject) => {
                this.db.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID, changes: this.changes });
                });
            });
        });
    }
}

module.exports = DatabaseQueue;