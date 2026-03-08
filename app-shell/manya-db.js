/**
 * MANYA SYSTEM DATABASE (SQL-LIKE)
 * Path: app-shell/js/manya-db.js
 */
export const ManyaDB = {
    DB_NAME: 'ManyaSystemDB',
    VERSION: 1,
    STORE_NAME: 'users',

    async connect() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME, { keyPath: 'uid' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getCurrentUser() {
        const uid = localStorage.getItem('manya_session_id');
        if (!uid) return null;
        const db = await this.connect();
        return new Promise((resolve) => {
            const transaction = db.transaction(this.STORE_NAME, 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(uid);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => resolve(null);
        });
    },

    async saveUser(userData) {
        const db = await this.connect();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.STORE_NAME, 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.put(userData);
            request.onsuccess = () => {
                localStorage.setItem('manya_session_id', userData.uid);
                // Trigger HUD update
                window.dispatchEvent(new Event('db_updated'));
                resolve(true);
            };
            request.onerror = () => reject(request.error);
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
            xp: 0,
            diamonds: 150,
            preferences: { likes: [], hates: [] },
            parent: { name: "", whatsapp: "" },
            created_at: new Date().toISOString(),
            status: 'Free Scholar', // Options: 'Free Scholar', 'Elite Hero'
            expiryDate: null,
            diamonds: 150,
    };
    }
};