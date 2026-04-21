import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client;

if (!supabaseUrl || !supabaseAnonKey) {
    // Silently handle missing keys for local development without spamming the console
    
    // Return a Safe Proxy to prevent fatal crashes
    client = {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signInWithPassword: async () => ({ data: null, error: { message: "Local Environment missing Supabase Keys. Check your .env file or refresh the server." } }),
            signUp: async () => ({ data: null, error: { message: "Keys missing." } }),
            signOut: async () => ({ error: null }),
            updateUser: async ({ password }) => ({ data: { user: { id: 'mock-hero' } }, error: null })
        },
        from: (table) => ({
            select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: "Offline Proxy" } }) }) }),
            upsert: async () => ({ data: null, error: null }),
            insert: async () => ({ data: null, error: null })
        }),
        rpc: async () => ({ data: null, error: null })
    };
} else {
    try {
        client = createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
        console.error("❌ [Supabase] Initialization failed:", err);
        client = null;
    }
}

export const supabase = client;
