/**
 * MANYA STORAGE SERVICE  (Backend Layer)
 * =========================================
 * Abstracts key-value persistent storage access.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  WEB  (default)  →  localStorage                               │
 * │  ANDROID         →  window.ManyaBackend.kv.get/set/remove       │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Android developer: implement window.ManyaBackend.kv = { get, set, remove, clear }
 * backed by SharedPreferences or a dedicated SQLite "kv_store" table.
 *
 * Contract:
 *   ManyaBackend.kv.get(key)            → string | null
 *   ManyaBackend.kv.set(key, value)     → void
 *   ManyaBackend.kv.remove(key)         → void
 *   ManyaBackend.kv.clear()             → void
 */

const isAndroid = () =>
    typeof window !== 'undefined' && typeof window.ManyaBackend !== 'undefined';

export const storageService = {
    getItem(key) {
        try {
            if (isAndroid()) return window.ManyaBackend.kv.get(key);
            return localStorage.getItem(key);
        } catch (e) {
            console.warn(`[Storage] Failed to get item: ${key}`, e);
            return null;
        }
    },

    setItem(key, value) {
        try {
            if (isAndroid()) return window.ManyaBackend.kv.set(key, value);
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn(`[Storage] Failed to set item: ${key}`, e);
        }
    },

    removeItem(key) {
        try {
            if (isAndroid()) return window.ManyaBackend.kv.remove(key);
            localStorage.removeItem(key);
        } catch (e) {
            console.warn(`[Storage] Failed to remove item: ${key}`, e);
        }
    },

    clear() {
        try {
            if (isAndroid()) return window.ManyaBackend.kv.clear();
            localStorage.clear();
        } catch (e) {
            console.warn(`[Storage] Failed to clear storage`, e);
        }
    }
};
