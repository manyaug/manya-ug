/**
 * MANYA AUTH SERVICE  (Backend Layer)
 * =====================================
 * Handles all authentication flows.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  ANDROID DEVELOPER — AUTH STRATEGY                                          │
 * │                                                                              │
 * │  Auth is ALWAYS online. The flow is:                                         │
 * │                                                                              │
 * │  1. User opens app → check for stored session (JWT in Keystore)              │
 * │  2. If session exists + not expired → go straight to app (offline-ready)    │
 * │  3. If no session or expired → show login screen                            │
 * │  4. Login hits Supabase Auth → on success:                                  │
 * │       a. Store JWT + refresh_token in Android Keystore                      │
 * │       b. Store uid in SharedPreferences                                      │
 * │       c. Call seedFromCloud(uid) to populate local SQLite from Supabase     │
 * │       d. App is now fully offline-capable                                   │
 * │                                                                              │
 * │  Android implementation: implement window.ManyaBackend.auth = {              │
 * │    signUp(email, password, metadata) → Promise<{uid, email}>                │
 * │    signIn(email, password)           → Promise<{uid, email}>                │
 * │    signOut()                         → Promise<void>                        │
 * │    getSession()                      → Promise<{uid, email} | null>         │
 * │    updatePassword(newPassword)       → Promise<void>                        │
 * │    resetPasswordForEmail(email)      → Promise<void>                        │
 * │  }                                                                           │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * JWT Lifecycle:
 *   - Access token:  expires in 1 hour (Supabase default)
 *   - Refresh token: long-lived, stored in Keystore, used to get new access token
 *   - When offline:  use cached uid from SharedPreferences (session already valid)
 *   - When online:   background token refresh via Supabase Kotlin SDK
 */

import { supabase } from '../remote/supabaseClient.js';
import { storageService } from '../storage/storageService.js';

const isAndroid = () =>
    typeof window !== 'undefined' && typeof window.ManyaBackend !== 'undefined';

export const authService = {
    _uidCache: null,

    /**
     * Get the current active user's UID.
     * Web:     Reads from Supabase session or localStorage fallback.
     * Android: Reads from window.ManyaBackend.auth.getSession() or kv store.
     */
    async getUserId() {
        if (this._uidCache && this._uidCache !== 'null' && this._uidCache !== 'undefined') {
            return this._uidCache;
        }

        try {
            if (isAndroid()) {
                const session = await window.ManyaBackend.auth.getSession();
                const uid = session?.uid || null;
                if (uid) this._uidCache = uid;
                return uid;
            }

            const { data: { session } } = await supabase.auth.getSession();
            let uid = session?.user?.id || storageService.getItem('manya_session_id') || null;
            if (uid === 'null' || uid === 'undefined') uid = null;
            if (uid) this._uidCache = uid;
            return uid;
        } catch (e) {
            let uid = storageService.getItem('manya_session_id') || null;
            if (uid === 'null' || uid === 'undefined') uid = null;
            return uid;
        }
    },

    /**
     * Sign up a new user (REQUIRES INTERNET).
     * Creates account in Supabase Auth.
     * After success: seedFromCloud is triggered by the app.
     */
    async signUp(email, password, metadata = {}) {
        this._uidCache = null;
        if (isAndroid()) {
            return window.ManyaBackend.auth.signUp(email, password, metadata);
        }
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
        if (error) throw error;
        return data.user;
    },

    /**
     * Sign in an existing user (REQUIRES INTERNET on first sign-in per session).
     * On success: stores session, triggers SQLite seeding.
     */
    async signIn(email, password) {
        this._uidCache = null;
        if (isAndroid()) {
            const user = await window.ManyaBackend.auth.signIn(email, password);
            if (user?.uid) storageService.setItem('manya_session_id', user.uid);
            return user;
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const uid = data.user?.id;
        if (uid) storageService.setItem('manya_session_id', uid);
        return data.user;
    },

    /**
     * Sign out and clear all local session data.
     */
    async signOut() {
        this._uidCache = null;
        storageService.removeItem('manya_session_id');
        if (isAndroid()) {
            return window.ManyaBackend.auth.signOut();
        }
        await supabase.auth.signOut();
    },

    /**
     * Send a password reset email (REQUIRES INTERNET).
     */
    async resetPassword(email) {
        if (isAndroid()) {
            return window.ManyaBackend.auth.resetPasswordForEmail(email);
        }
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        return { data, error };
    },

    /**
     * Update the current user's password (REQUIRES INTERNET).
     */
    async updatePassword(newPassword) {
        if (isAndroid()) {
            return window.ManyaBackend.auth.updatePassword(newPassword);
        }
        const { data, error } = await supabase.auth.updateUser({ password: newPassword });
        return { data, error };
    },

    /**
     * Clear UID cache (call on logout or user switch).
     */
    clearCache() {
        this._uidCache = null;
    }
};
