export const ManyaDB = {
    DB_NAME: 'ManyaSystemDB',
    VERSION: 5, // v5: Added gamification stores (badges, chests, challenges)
    STORE_USERS: 'users',
    STORE_QUESTIONS: 'questions',
    STORE_SYNC_LOGS: 'sync_logs',
    STORE_ANSWERS: 'answers',
    STORE_CONCEPT_MASTERY: 'concept_mastery',
    STORE_ACHIEVEMENTS: 'achievements',
    STORE_BADGES: 'badges',
    STORE_CHESTS: 'user_chests',
    STORE_CHALLENGES: 'daily_challenges',
    STORE_POWER_UPS: 'power_ups',

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
                if (!db.objectStoreNames.contains(this.STORE_CONCEPT_MASTERY)) {
                    const cmStore = db.createObjectStore(this.STORE_CONCEPT_MASTERY, { keyPath: 'id' });
                    cmStore.createIndex('subject', 'subject', { unique: false });
                    cmStore.createIndex('baseId', 'baseId', { unique: false });
                }
                if (!db.objectStoreNames.contains(this.STORE_ACHIEVEMENTS)) {
                    db.createObjectStore(this.STORE_ACHIEVEMENTS, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(this.STORE_BADGES)) {
                    db.createObjectStore(this.STORE_BADGES, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(this.STORE_CHESTS)) {
                    db.createObjectStore(this.STORE_CHESTS, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(this.STORE_CHALLENGES)) {
                    db.createObjectStore(this.STORE_CHALLENGES, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(this.STORE_POWER_UPS)) {
                    db.createObjectStore(this.STORE_POWER_UPS, { keyPath: 'id' });
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
                
                // Set session ID immediately (if valid)
                if (userData.uid && userData.uid !== 'null' && userData.uid !== 'undefined') {
                    localStorage.setItem('manya_session_id', userData.uid);
                }
                
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
        if (!questions || !Array.isArray(questions)) return false;
        
        const db = await this.connect();
        if (!db) return false;

        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(this.STORE_QUESTIONS, 'readwrite');
                const store = transaction.objectStore(this.STORE_QUESTIONS);
                
                // CRITICAL: Filter out any objects missing the mandatory qid (primary key)
                // to avoid DataError: "Evaluating the object store's key path did not yield a value."
                const validQuestions = questions.filter(q => q && q.qid);
                
                if (validQuestions.length < questions.length) {
                    console.warn(`[ManyaDB] Filtered out ${questions.length - validQuestions.length} corrupt questions missing QID.`);
                }

                validQuestions.forEach(q => store.put(q));
                
                transaction.oncomplete = () => resolve(true);
                transaction.onerror = (e) => {
                    console.error("[ManyaDB] Transaction Error:", e.target.error);
                    resolve(false);
                };
            } catch(e) {
                console.error("[ManyaDB] Cache Exception:", e);
                resolve(false);
            }
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

    // ── CONCEPT MASTERY METHODS ──────────────────────────────────────────────

    async getConceptMastery(subject, baseId) {
        const db = await this.connect();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(this.STORE_CONCEPT_MASTERY, 'readonly');
                const store = tx.objectStore(this.STORE_CONCEPT_MASTERY);
                const req = store.get(`${subject}::${baseId}`);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            } catch(e) { resolve(null); }
        });
    },

    async upsertConceptMastery(record) {
        const db = await this.connect();
        if (!db) return false;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(this.STORE_CONCEPT_MASTERY, 'readwrite');
                const store = tx.objectStore(this.STORE_CONCEPT_MASTERY);
                const req = store.put(record);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            } catch(e) { resolve(false); }
        });
    },

    async getAllConceptMastery(subject) {
        const db = await this.connect();
        if (!db) return [];
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(this.STORE_CONCEPT_MASTERY, 'readonly');
                const store = tx.objectStore(this.STORE_CONCEPT_MASTERY);
                const index = store.index('subject');
                const req = index.getAll(subject);
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            } catch(e) { resolve([]); }
        });
    },

    createDefaultRecord() {

        return {
            uid: null,
            email: null,
            onboarded: false,
            nickname: "New Hero",
            fullName: "",
            avatarSeed: "Manya",
            diamonds: 0, 
            coins: 0, 
            mathGems: 0,
            scienceGems: 0,
            englishGems: 0,
            sstGems: 0,
            current_streak: 0,
            longest_streak: 0,
            last_active_at: null,
            unlockedBadges: ['gen_01'], 
            stats_quests_completed: 0,
            stats_perfect_answers: 0,
            stats_hints_used: 0,
            stats_explanations_viewed: 0,
            theme: 'dark',
            preferences: { likes: [], hates: [] },
            parent: { name: "", whatsapp: "" },
            pendingBadgeCelebrations: [],
            vaultArtifacts: [], 
            is_pro: false,
            learning_type: 'ADAPTIVE',
            created_at: new Date().toISOString()
        };
    }
};

