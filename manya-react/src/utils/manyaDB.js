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
                const transaction = db.transaction(this.STORE_NAME, 'readonly');
                const store = transaction.objectStore(this.STORE_NAME);
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
                const transaction = db.transaction(this.STORE_NAME, 'readwrite');
                const store = transaction.objectStore(this.STORE_NAME);
                
                // Set session ID immediately
                localStorage.setItem('manya_session_id', userData.uid);
                
                const request = store.put(userData);
                request.onsuccess = () => {
                    resolve(true);
                };
                request.onerror = () => resolve(false);
            } catch(e) { resolve(false); }
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
