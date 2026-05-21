/**
 * MANYA SUPABASE CLIENT  (Backend Layer — Remote)
 * ==================================================
 * Initializes the Supabase client for ONLINE AUTH ONLY.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  IMPORTANT FOR ANDROID DEVELOPER                                             │
 * │                                                                              │
 * │  Supabase is used ONLY for:                                                  │
 * │    1. User sign-up  (create account)                                         │
 * │    2. User sign-in  (verify credentials, get JWT)                            │
 * │    3. Password reset (email flow)                                            │
 * │                                                                              │
 * │  ALL OTHER DATA (profiles, progress, answers, vault, badges, chests…)        │
 * │  is handled via the LOCAL SQLite database on the device.                     │
 * │                                                                              │
 * │  On first login: pull cloud data → seed SQLite (see syncService.seedFromCloud)│
 * │  While offline:  use SQLite only                                             │
 * │  When online:    background sync flushes sync_queue to Supabase              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * Android implementation:
 *   Replace this file's exports with window.ManyaBackend.auth.*
 *   The supabase object below should be replaced by native calls to
 *   Android's Supabase Kotlin SDK (or Ktor-based REST client).
 *
 * Supabase tables that ANDROID DOES NOT touch locally:
 *   auth.users   ← managed entirely by Supabase Auth service (cloud only)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client;

if (!supabaseUrl || !supabaseAnonKey) {
    // Safe offline proxy for local development / Android mode (no env vars)
    client = {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signInWithPassword: async () => ({
                data: null,
                error: { message: 'No Supabase keys. Running in offline/Android mode.' }
            }),
            signUp: async () => ({ data: null, error: { message: 'No Supabase keys.' } }),
            signOut: async () => ({ error: null }),
            updateUser: async ({ password }) => ({ data: { user: { id: 'local-hero' } }, error: null }),
            resetPasswordForEmail: async () => ({ data: null, error: { message: 'No Supabase keys.' } })
        },
        from: (table) => ({
            select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'Offline Proxy' } }) }) }),
            upsert: async () => ({ data: null, error: null }),
            insert: async () => ({ data: null, error: null }),
            update: async () => ({ data: null, error: null }),
        }),
        rpc: async () => ({ data: null, error: null })
    };
} else {
    try {
        client = createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
        console.error('❌ [Supabase] Initialization failed:', err);
        client = null;
    }
}

export const supabase = client;
