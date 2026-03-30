import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client;

if (!supabaseUrl || !supabaseAnonKey) {
    // Silently handle missing keys for local development without spamming the console
    
    // Return a Safe Proxy to prevent "Cannot read property 'from' of undefined" crashes
    client = new Proxy({}, {
        get: (target, prop) => {
            return () => ({
                from: () => ({
                    select: () => ({
                        eq: () => Promise.resolve({ data: [], error: { message: `Supabase not configured. Missing: ${!supabaseUrl ? 'URL' : 'Key'}` } })
                    })
                })
            });
        }
    });
} else {
    try {
        client = createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
        console.error("❌ [Supabase] Initialization failed:", err);
        client = null;
    }
}

export const supabase = client;
