/**
 * MANYA STORAGE SERVICE
 * =====================
 * Abstracts persistent storage access. 
 * Currently wraps localStorage, but designed to be swapped with 
 * a .NET MAUI WebView bridge for native mobile storage in the future.
 */

export const storageService = {
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn(`[Storage] Failed to get item: ${key}`, e);
            return null;
        }
    },

    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn(`[Storage] Failed to set item: ${key}`, e);
        }
    },

    removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn(`[Storage] Failed to remove item: ${key}`, e);
        }
    },

    clear() {
        try {
            localStorage.clear();
        } catch (e) {
            console.warn(`[Storage] Failed to clear storage`, e);
        }
    }
};
