/**
 * MANYA LOCAL DATABASE  (Backend Layer — IndexedDB / SQLite)
 * ===========================================================
 * On-device structured data store.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  ANDROID DEVELOPER — LOCAL DB REPLACEMENT                                   │
 * │                                                                              │
 * │  This file manages ALL local-device persistence for game state.             │
 * │  Web uses IndexedDB.  Android replaces this with SQLite (Room).             │
 * │                                                                              │
 * │  SQLite Tables to Create (mirrors IndexedDB stores below):                 │
 * │                                                                              │
 * │  TABLE: users                                                                │
 * │    uid TEXT PRIMARY KEY, email TEXT, nickname TEXT, fullName TEXT,          │
 * │    avatarSeed TEXT, diamonds INTEGER DEFAULT 0, coins INTEGER DEFAULT 0,    │
 * │    mathGems INTEGER DEFAULT 0, scienceGems INTEGER DEFAULT 0,               │
 * │    englishGems INTEGER DEFAULT 0, sstGems INTEGER DEFAULT 0,                │
 * │    current_streak INTEGER DEFAULT 0, longest_streak INTEGER DEFAULT 0,      │
 * │    last_active_at TEXT, onboarded INTEGER DEFAULT 0,                        │
 * │    unlockedBadges TEXT DEFAULT '[]',  -- JSON array                         │
 * │    vaultArtifacts TEXT DEFAULT '[]',  -- JSON array                         │
 * │    pendingBadgeCelebrations TEXT DEFAULT '[]',  -- JSON array               │
 * │    is_pro INTEGER DEFAULT 0, learning_type TEXT DEFAULT 'ADAPTIVE',         │
 * │    stats_quests_completed INTEGER DEFAULT 0,                                │
 * │    stats_perfect_answers INTEGER DEFAULT 0,                                 │
 * │    stats_hints_used INTEGER DEFAULT 0,                                      │
 * │    stats_explanations_viewed INTEGER DEFAULT 0,                             │
 * │    theme TEXT DEFAULT 'dark', preferences TEXT DEFAULT '{}',                │
 * │    parent_name TEXT, parent_whatsapp TEXT, parent_pin_hash TEXT,            │
 * │    report_enabled INTEGER DEFAULT 1, created_at TEXT                        │
 * │                                                                              │
 * │  TABLE: questions                                                            │
 * │    qid TEXT PRIMARY KEY, subject TEXT NOT NULL,                             │
 * │    topic TEXT, subtopic TEXT, data TEXT  -- full question JSON              │
 * │                                                                              │
 * │  TABLE: sync_logs (Outbox queue — flush when online)                        │
 * │    id INTEGER PRIMARY KEY AUTOINCREMENT,                                    │
 * │    type TEXT NOT NULL,  -- 'ANSWER' | 'PROFILE' | 'PROGRESS' | etc.        │
 * │    data TEXT NOT NULL,  -- JSON payload                                     │
 * │    timestamp TEXT NOT NULL,                                                 │
 * │    synced INTEGER DEFAULT 0                                                 │
 * │                                                                              │
 * │  TABLE: answers                                                              │
 * │    id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT,                      │
 * │    questionId TEXT, isCorrect INTEGER, selectedAnswer TEXT,                 │
 * │    correctAnswer TEXT, timeSpentMs INTEGER, hintUsed INTEGER,               │
 * │    answeredAt TEXT                                                           │
 * │                                                                              │
 * │  TABLE: concept_mastery                                                     │
 * │    id TEXT PRIMARY KEY,  -- format: "{subject}::{baseId}"                  │
 * │    subject TEXT NOT NULL, baseId TEXT NOT NULL,                             │
 * │    masteryLevel TEXT DEFAULT 'new',  reviewCount INTEGER DEFAULT 0,         │
 * │    lastReviewedAt TEXT, nextReviewAt TEXT,                                  │
 * │    correctStreak INTEGER DEFAULT 0,  totalAttempts INTEGER DEFAULT 0,       │
 * │    totalCorrect INTEGER DEFAULT 0,   createdAt TEXT, updatedAt TEXT         │
 * │                                                                              │
 * │  TABLE: achievements                                                         │
 * │    id INTEGER PRIMARY KEY AUTOINCREMENT, badge_id TEXT, earned_at TEXT      │
 * │                                                                              │
 * │  TABLE: badges   (same as achievements but keyed by badge string id)       │
 * │    id TEXT PRIMARY KEY, badge_name TEXT, earned_at TEXT                     │
 * │                                                                              │
 * │  TABLE: user_chests                                                          │
 * │    id INTEGER PRIMARY KEY AUTOINCREMENT, chest_type TEXT,                   │
 * │    opened INTEGER DEFAULT 0, opened_at TEXT, created_at TEXT               │
 * │                                                                              │
 * │  TABLE: daily_challenges                                                    │
 * │    id TEXT PRIMARY KEY, day_number INTEGER,  challenge_type TEXT,           │
 * │    target_value INTEGER, reward_value INTEGER, subject TEXT,                │
 * │    description TEXT                                                          │
 * │                                                                              │
 * │  TABLE: power_ups                                                            │
 * │    id TEXT PRIMARY KEY, type TEXT, count INTEGER DEFAULT 0                  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * Android: implement window.ManyaBackend.db = { get, insert, upsert, patch, delete }
 * Each method receives a table name and a query/payload object (see storageFacade.js).
 */

const isAndroid = () =>
    typeof window !== 'undefined' && typeof window.ManyaBackend !== 'undefined';

export const ManyaDB = {
    DB_NAME: 'ManyaSystemDB',
    VERSION: 5,
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

    // ──────────────────────────────────────────────────────────────────────────
    // ANDROID NOTE: connect() is a no-op on Android — SQLite is always ready.
    // ──────────────────────────────────────────────────────────────────────────
    async connect() {
        if (isAndroid()) return true; // SQLite is always open on Android
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_USERS))
                    db.createObjectStore(this.STORE_USERS, { keyPath: 'uid' });
                if (!db.objectStoreNames.contains(this.STORE_QUESTIONS))
                    db.createObjectStore(this.STORE_QUESTIONS, { keyPath: 'qid' });
                if (!db.objectStoreNames.contains(this.STORE_SYNC_LOGS))
                    db.createObjectStore(this.STORE_SYNC_LOGS, { keyPath: 'id', autoIncrement: true });
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
                if (!db.objectStoreNames.contains(this.STORE_ACHIEVEMENTS))
                    db.createObjectStore(this.STORE_ACHIEVEMENTS, { keyPath: 'id', autoIncrement: true });
                if (!db.objectStoreNames.contains(this.STORE_BADGES))
                    db.createObjectStore(this.STORE_BADGES, { keyPath: 'id' });
                if (!db.objectStoreNames.contains(this.STORE_CHESTS))
                    db.createObjectStore(this.STORE_CHESTS, { keyPath: 'id', autoIncrement: true });
                if (!db.objectStoreNames.contains(this.STORE_CHALLENGES))
                    db.createObjectStore(this.STORE_CHALLENGES, { keyPath: 'id' });
                if (!db.objectStoreNames.contains(this.STORE_POWER_UPS))
                    db.createObjectStore(this.STORE_POWER_UPS, { keyPath: 'id' });
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    },

    // ── USERS ─────────────────────────────────────────────────────────────────
    async getCurrentUser() {
        const uid = localStorage.getItem('manya_session_id');
        if (!uid) return null;
        if (isAndroid()) {
            const result = await window.ManyaBackend.db.get('users', { id: uid, single: true });
            return result;
        }
        const db = await this.connect();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(this.STORE_USERS, 'readonly');
                const req = tx.objectStore(this.STORE_USERS).get(uid);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            } catch(e) { resolve(null); }
        });
    },

    async saveUser(userData) {
        if (userData.uid && userData.uid !== 'null' && userData.uid !== 'undefined') {
            localStorage.setItem('manya_session_id', userData.uid);
        }
        if (isAndroid()) {
            return window.ManyaBackend.db.upsert('users', userData, { conflictCol: 'uid' });
        }
        const db = await this.connect();
        if (!db) return false;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(this.STORE_USERS, 'readwrite');
                const req = tx.objectStore(this.STORE_USERS).put(userData);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            } catch(e) { resolve(false); }
        });
    },

    // ── QUESTIONS CACHE ───────────────────────────────────────────────────────
    async getCachedQuestions(subject, topic = null) {
        if (isAndroid()) {
            const filters = { subject };
            if (topic) filters.topic = topic;
            return window.ManyaBackend.db.get('questions', { filters });
        }
        const db = await this.connect();
        if (!db) return [];
        return new Promise((resolve) => {
            const tx = db.transaction(this.STORE_QUESTIONS, 'readonly');
            const req = tx.objectStore(this.STORE_QUESTIONS).getAll();
            req.onsuccess = () => {
                let filtered = req.result.filter(q => q.subject === subject);
                if (topic) filtered = filtered.filter(q => q.topic === topic);
                resolve(filtered);
            };
            req.onerror = () => resolve([]);
        });
    },

    async cacheQuestions(questions) {
        if (!questions || !Array.isArray(questions)) return false;
        const validQuestions = questions.filter(q => q && q.qid);
        if (isAndroid()) {
            return window.ManyaBackend.db.bulkUpsert('questions', validQuestions, { conflictCol: 'qid' });
        }
        const db = await this.connect();
        if (!db) return false;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(this.STORE_QUESTIONS, 'readwrite');
                const store = tx.objectStore(this.STORE_QUESTIONS);
                validQuestions.forEach(q => store.put(q));
                tx.oncomplete = () => resolve(true);
                tx.onerror = (e) => { console.error('[ManyaDB] Cache Error:', e.target.error); resolve(false); };
            } catch(e) { resolve(false); }
        });
    },

    async clearQuestionCache() {
        if (isAndroid()) return window.ManyaBackend.db.deleteAll('questions');
        const db = await this.connect();
        if (!db) return;
        const tx = db.transaction(this.STORE_QUESTIONS, 'readwrite');
        tx.objectStore(this.STORE_QUESTIONS).clear();
    },

    // ── SYNC QUEUE (Offline Write Buffer) ─────────────────────────────────────
    async addToSyncQueue(type, data) {
        const entry = { type, data, timestamp: new Date().toISOString() };
        if (isAndroid()) return window.ManyaBackend.db.insert('sync_logs', entry);
        const db = await this.connect();
        if (!db) return false;
        return new Promise((resolve) => {
            const tx = db.transaction(this.STORE_SYNC_LOGS, 'readwrite');
            const req = tx.objectStore(this.STORE_SYNC_LOGS).add(entry);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    },

    async getSyncQueue() {
        if (isAndroid()) return window.ManyaBackend.db.get('sync_logs', { filters: { synced: 0 } });
        const db = await this.connect();
        if (!db) return [];
        return new Promise((resolve) => {
            const tx = db.transaction(this.STORE_SYNC_LOGS, 'readonly');
            const req = tx.objectStore(this.STORE_SYNC_LOGS).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    },

    async removeSyncItem(id) {
        if (isAndroid()) return window.ManyaBackend.db.delete('sync_logs', id);
        const db = await this.connect();
        if (!db) return false;
        return new Promise((resolve) => {
            const tx = db.transaction(this.STORE_SYNC_LOGS, 'readwrite');
            const req = tx.objectStore(this.STORE_SYNC_LOGS).delete(id);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    },

    // ── ANSWER HISTORY ────────────────────────────────────────────────────────
    async getAnswerHistory(subject) {
        if (isAndroid()) {
            return window.ManyaBackend.db.get('answers', { filters: { subject }, limit: 500, orderBy: 'id', orderDir: 'desc' });
        }
        const db = await this.connect();
        if (!db) return [];
        return new Promise((resolve) => {
            const tx = db.transaction(this.STORE_ANSWERS, 'readonly');
            const req = tx.objectStore(this.STORE_ANSWERS).index('subject').getAll(subject);
            req.onsuccess = () => resolve((req.result || []).slice(-500));
            req.onerror = () => resolve([]);
        });
    },

    async recordAnswer(subject, answerData) {
        const entry = { ...answerData, subject, answeredAt: new Date().toISOString() };
        if (isAndroid()) return window.ManyaBackend.db.insert('answers', entry);
        const db = await this.connect();
        if (!db) return false;
        return new Promise((resolve) => {
            const tx = db.transaction(this.STORE_ANSWERS, 'readwrite');
            const req = tx.objectStore(this.STORE_ANSWERS).add(entry);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    },

    // ── CONCEPT MASTERY ───────────────────────────────────────────────────────
    async getConceptMastery(subject, baseId) {
        if (isAndroid()) {
            return window.ManyaBackend.db.get('concept_mastery', { id: `${subject}::${baseId}`, single: true });
        }
        const db = await this.connect();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(this.STORE_CONCEPT_MASTERY, 'readonly');
                const req = tx.objectStore(this.STORE_CONCEPT_MASTERY).get(`${subject}::${baseId}`);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            } catch(e) { resolve(null); }
        });
    },

    async upsertConceptMastery(record) {
        if (isAndroid()) return window.ManyaBackend.db.upsert('concept_mastery', record, { conflictCol: 'id' });
        const db = await this.connect();
        if (!db) return false;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(this.STORE_CONCEPT_MASTERY, 'readwrite');
                const req = tx.objectStore(this.STORE_CONCEPT_MASTERY).put(record);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            } catch(e) { resolve(false); }
        });
    },

    async getAllConceptMastery(subject) {
        if (isAndroid()) {
            return window.ManyaBackend.db.get('concept_mastery', { filters: { subject } });
        }
        const db = await this.connect();
        if (!db) return [];
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(this.STORE_CONCEPT_MASTERY, 'readonly');
                const req = tx.objectStore(this.STORE_CONCEPT_MASTERY).index('subject').getAll(subject);
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            } catch(e) { resolve([]); }
        });
    },

    // ── DEFAULT USER TEMPLATE ─────────────────────────────────────────────────
    createDefaultRecord() {
        return {
            uid: null, email: null, onboarded: false,
            nickname: 'New Hero', fullName: '', avatarSeed: 'Manya',
            diamonds: 0, coins: 0,
            mathGems: 0, scienceGems: 0, englishGems: 0, sstGems: 0,
            current_streak: 0, longest_streak: 0, last_active_at: null,
            unlockedBadges: ['gen_01'],
            stats_quests_completed: 0, stats_perfect_answers: 0,
            stats_hints_used: 0, stats_explanations_viewed: 0,
            theme: 'dark',
            preferences: { likes: [], hates: [] },
            parent_name: '',
            parent_whatsapp: '',
            parent_pin_hash: '',
            report_enabled: true,
            pendingBadgeCelebrations: [],
            vaultArtifacts: [],
            is_pro: false,
            learning_type: 'ADAPTIVE',
            created_at: new Date().toISOString()
        };
    }
};
