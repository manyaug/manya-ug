/**
 * MANYA ERROR MAPPER  (Backend Layer)
 * ======================================
 * Normalizes errors from any backend adapter into a consistent shape.
 */

export const errorMapper = {
    map(error, context = '') {
        // Already a clean Manya error
        if (error?.code && error?.message) return error;

        const msg = error?.message || error?.error_description || String(error) || 'Unknown error';
        const code = error?.code || error?.status || 'UNKNOWN';

        return {
            code,
            message: msg,
            context,
            original: error
        };
    }
};
