export const ManyaDB = {
    DB_NAME: 'ManyaSystemDB',
    VERSION: 3, // Incremented version to add 'answers' store
    STORE_USERS: 'users',
    STORE_QUESTIONS: 'questions',
    STORE_SYNC_LOGS: 'sync_logs',
    STORE_ANSWERS: 'answers',

    async connect() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_USERS)) {
                    db.createObjectStore(this.STORE_USERS, { keyPath: 'uid' });
                }
                if (!db.objectStoreNames.contains(this.STORE_QUESTIONS)) {
                    db.createObjectStore(this.STORE_QUESTIONS, { keyPath: 'qid' });
                }
                if (!db.objectStoreNames.contains(this.STORE_SYNC_LOGS)) {
                    db.createObjectStore(this.STORE_SYNC_LOGS, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(this.STORE_ANSWERS)) {
                    const store = db.createObjectStore(this.STORE_ANSWERS, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('subject', 'subject', { unique: false });
                    store.createIndex('questionId', 'questionId', { unique: false });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    },

    async getCurrentUser() {
        const uid = localStorage.getItem('manya_session_id');
        if (!uid) return null;
        const db = await this.connect();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(this.STORE_USERS, 'readonly');
                const store = transaction.objectStore(this.STORE_USERS);
                const request = store.get(uid);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => resolve(null);
            } catch(e) { resolve(null); }
        });
    },

    async saveUser(userData) {
        const db = await this.connect();
        if (!db) return false;
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(this.STORE_USERS, 'readwrite');
                const store = transaction.objectStore(this.STORE_USERS);
                
                // Set session ID immediately
                localStorage.setItem('manya_session_id', userData.uid);
                
                const request = store.put(userData);
                request.onsuccess = () => resolve(true);
                request.onerror = () => resolve(false);
            } catch(e) { resolve(false); }
        });
    },


    /**
     * QUESTIONS CACHE METHODS
     */
    async getCachedQuestions(subject, topic = null) {
        const db = await this.connect();
        if (!db) return [];
        return new Promise((resolve) => {
            const transaction = db.transaction(this.STORE_QUESTIONS, 'readonly');
            const store = transaction.objectStore(this.STORE_QUESTIONS);
            const request = store.getAll();
            
            request.onsuccess = () => {
                let filtered = request.result.filter(q => q.subject === subject);
                if (topic) filtered = filtered.filter(q => q.topic === topic);
                resolve(filtered);
            };
            request.onerror = () => resolve([]);
        });
    },

    async cacheQuestions(questions) {
        const db = await this.connect();
        if (!db) return false;
        return new Promise((resolve) => {
            const transaction = db.transaction(this.STORE_QUESTIONS, 'readwrite');
            const store = transaction.objectStore(this.STORE_QUESTIONS);
            questions.forEach(q => store.put(q));
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => resolve(false);
        });
    },

    async clearQuestionCache() {
        const db = await this.connect();
        if (!db) return;
        const transaction = db.transaction(this.STORE_QUESTIONS, 'readwrite');
        transaction.objectStore(this.STORE_QUESTIONS).clear();
    },

    /**
     * SYNC QUEUE METHODS (Offline Writing)
     */
    async addToSyncQueue(type, data) {
        const db = await this.connect();
        if (!db) return false;
        return new Promise((resolve) => {
            const transaction = db.transaction(this.STORE_SYNC_LOGS, 'readwrite');
            const store = transaction.objectStore(this.STORE_SYNC_LOGS);
            const request = store.add({ type, data, timestamp: new Date().toISOString() });
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    },

    async getSyncQueue() {
        const db = await this.connect();
        if (!db) return [];
        return new Promise((resolve) => {
            const transaction = db.transaction(this.STORE_SYNC_LOGS, 'readonly');
            const store = transaction.objectStore(this.STORE_SYNC_LOGS);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        });
    },

    /**
     * ANSWER HISTORY METHODS
     */
    async getAnswerHistory(subject) {
        const db = await this.connect();
        if (!db) return [];
        return new Promise((resolve) => {
            const transaction = db.transaction(this.STORE_ANSWERS, 'readonly');
            const store = transaction.objectStore(this.STORE_ANSWERS);
            const index = store.index('subject');
            const request = index.getAll(subject);
            
            request.onsuccess = () => {
                // Keep only last 500 for performance
                const results = request.result || [];
                resolve(results.slice(-500));
            };
            request.onerror = () => resolve([]);
        });
    },

    async recordAnswer(subject, answerData) {
        const db = await this.connect();
        if (!db) return false;
        return new Promise((resolve) => {
            const transaction = db.transaction(this.STORE_ANSWERS, 'readwrite');
            const store = transaction.objectStore(this.STORE_ANSWERS);
            const entry = {
                ...answerData,
                subject,
                answeredAt: new Date().toISOString()
            };
            const request = store.add(entry);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    },

    async removeSyncItem(id) {

        const db = await this.connect();
        if (!db) return false;
        return new Promise((resolve) => {
            const transaction = db.transaction(this.STORE_SYNC_LOGS, 'readwrite');
            const store = transaction.objectStore(this.STORE_SYNC_LOGS);
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    },

    createDefaultRecord() {

        return {
            uid: `ID_${Math.floor(Math.random() * 1000000)}`,
            onboarded: false,
            nickname: "",
            fullName: "",
            avatarSeed: "Manya",
            school: "",
            goal: "Agg 4-8",
            diamonds: 150, // Global currency
            mathGems: 25, 
            scienceGems: 12,
            sstGems: 40,
            englishGems: 18,
            league: 'Bronze', // Bronze, Silver, Gold, Amethyst, Diamond
            xp: 150,
            theme: 'light',
            preferences: { likes: [], hates: [] },
            parent: { name: "", whatsapp: "" },
            created_at: new Date().toISOString()
        };
    }
};

