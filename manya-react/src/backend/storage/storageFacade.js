/**
 * MANYA STORAGE FACADE  (Backend Layer — Central Hub)
 * =====================================================
 * The unified data router for the entire Manya web app.
 * All data access goes through this single interface.
 *
 * URI Schemes:
 *   local:/key              → Key-value store (localStorage / Android SharedPreferences)
 *   file:/path/to/file.json → Static JSON/HTML asset (CDN / Android internal storage)
 *   db:/tableName?filters   → Structured database (Supabase / Android SQLite)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  ANDROID DEVELOPER — STORAGE FACADE ROUTING                                 │
 * │                                                                              │
 * │  This file is the ONLY place the web app decides WHERE data comes from.     │
 * │  When running inside the Android WebView:                                   │
 * │                                                                              │
 * │  Scheme  →  Android Implementation                                          │
 * │  ────────────────────────────────────────────────                            │
 * │  local:  →  window.ManyaBackend.kv.get/set/remove                           │
 * │  file:   →  window.ManyaBackend.files.readJson(path) or readText(path)      │
 * │  db:     →  window.ManyaBackend.db.get/insert/upsert/patch/delete           │
 * │              (backed by SQLite on-device)                                   │
 * │                                                                              │
 * │  The web app NEVER changes these URI patterns. They are the contract.       │
 * │  Android just provides the implementation underneath.                       │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * DB URI Query Param Examples:
 *   db:/profiles/USER_UUID                           → get single profile by id
 *   db:/user_answers?uid=USER_UUID&limit=10          → get last 10 answers
 *   db:/concept_mastery?uid=X&subject=math           → get mastery for math
 *   db:/user_vault?uid=X&artifact_id=Y&single=maybe  → get or null (maybeSingle)
 */

import { supabase } from '../remote/supabaseClient.js';
import { errorMapper } from './errorMapper.js';
import { CDN_BASE } from '../../config/constants.js';

const isAndroid = () =>
    typeof window !== 'undefined' && typeof window.ManyaBackend !== 'undefined';

// ── URI Parser ────────────────────────────────────────────────────────────────
const parseUri = (uri) => {
    const match = uri.match(/^([a-z]+):(.*)$/i);
    if (!match) throw new Error(`Invalid Storage URI: ${uri}`);
    return { scheme: match[1], path: match[2] };
};

// ── LOCAL STORAGE ADAPTER ─────────────────────────────────────────────────────
const localAdapter = {
    get(key) {
        if (isAndroid()) {
            const val = window.ManyaBackend.kv.get(key);
            try { return JSON.parse(val); } catch (e) { return val; }
        }
        const val = localStorage.getItem(key);
        try { return JSON.parse(val); } catch (e) { return val; }
    },
    put(key, val) {
        const str = typeof val === 'string' ? val : JSON.stringify(val);
        if (isAndroid()) return window.ManyaBackend.kv.set(key, str);
        localStorage.setItem(key, str);
    },
    delete(key) {
        if (isAndroid()) return window.ManyaBackend.kv.remove(key);
        localStorage.removeItem(key);
    },
};

// ── FILE ADAPTER ──────────────────────────────────────────────────────────────
// Handles static assets: JSON question files, HTML stories, curriculum JSON, etc.
const fileAdapter = {
    resolveUrl(path) {
        if (isAndroid()) {
            // Android: resolve via native file system
            return window.ManyaBackend.files.getAssetUrl(path);
        }
        if (path.startsWith('http')) return path;
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        if (cleanPath.startsWith('content/')) return `${CDN_BASE}${cleanPath}`;
        if (path.startsWith('/')) return path;
        return `/api/files/${path}`;
    },
    async get(path, { asStream = false } = {}) {
        if (isAndroid()) {
            // Android: use native file reading (returns parsed JSON automatically)
            return window.ManyaBackend.files.readJson(path);
        }
        const url = this.resolveUrl(path);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`File fetch failed: ${resp.status} ${resp.statusText}`);
        if (asStream) return resp.body;

        const buffer = await resp.arrayBuffer();
        const arr = new Uint8Array(buffer);
        let decoder = new TextDecoder('utf-8');
        if (arr.length >= 2) {
            if (arr[0] === 0xFE && arr[1] === 0xFF) decoder = new TextDecoder('utf-16be');
            else if (arr[0] === 0xFF && arr[1] === 0xFE) decoder = new TextDecoder('utf-16le');
        }
        const text = decoder.decode(arr);
        const cleanText = text.replace(/^\ufeff/, '').trim();
        return JSON.parse(cleanText);
    },
    async put(path, payload, { asStream = false } = {}) {
        if (isAndroid()) {
            // Android: write to internal storage
            return window.ManyaBackend.files.writeJson(path, payload);
        }
        const url = this.resolveUrl(path);
        const resp = await fetch(url, {
            method: 'PUT',
            body: asStream ? payload : JSON.stringify(payload),
            headers: asStream ? {} : { 'Content-Type': 'application/json' },
        });
        if (!resp.ok) throw new Error(`File put failed: ${resp.status}`);
        return true;
    },
};

// ── DATABASE ADAPTER ──────────────────────────────────────────────────────────
// Handles all structured data operations.
// Web: Supabase (PostgreSQL in the cloud)
// Android: window.ManyaBackend.db.* (SQLite on-device)
const dbAdapter = {
    /**
     * Parse the URI's query params into an Android-friendly query object.
     * Example:
     *   input:  "/user_answers?uid=abc&limit=10&order=answered_at:desc"
     *   output: { table: 'user_answers', filters: { user_id: 'abc' }, limit: 10, orderBy: 'answered_at', orderDir: 'desc' }
     */
    _parseQueryToAndroid(path) {
        const url = new URL(path, 'http://manya.internal');
        const parts = url.pathname.split('/').filter(Boolean);
        const table = parts[0];
        const id = parts[1];

        const query = { table, filters: {}, limit: null, orderBy: null, orderDir: 'asc', single: false };

        if (id && id !== 'undefined' && id !== 'null') {
            query.id = id;
            query.single = true;
        } else {
            url.searchParams.forEach((value, key) => {
                if (key === 'limit') query.limit = parseInt(value);
                else if (key === 'order') {
                    const [col, dir] = value.split(':');
                    query.orderBy = col; query.orderDir = dir || 'asc';
                } else if (key === 'single') {
                    query.single = value === 'true' ? true : (value === 'maybe' ? 'maybe' : false);
                } else if (key === 'uid') {
                    query.filters['user_id'] = value;
                } else if (key === 'or') {
                    query.orFilter = value;
                } else {
                    // Operators: col=ilike:val or col=gt:5
                    if (value.includes(':')) {
                        const [op, val] = value.split(':');
                        const validOps = ['eq','neq','gt','gte','lt','lte','like','ilike','is','in'];
                        if (validOps.includes(op)) {
                            query.filters[`${key}:${op}`] = val;
                            return;
                        }
                    }
                    query.filters[key] = value;
                }
            });
        }
        return query;
    },

    async get(path) {
        if (isAndroid()) {
            const query = this._parseQueryToAndroid(path);
            return window.ManyaBackend.db.get(query.table, query);
        }

        // ── Web: Supabase path ──
        const url = new URL(path, 'http://facade.internal');
        const parts = url.pathname.split('/').filter(Boolean);
        const table = parts[0];
        const id = parts[1];
        let query = supabase.from(table).select('*');
        if (id && id !== 'undefined' && id !== 'null') {
            query = query.eq('id', id).single();
        } else {
            url.searchParams.forEach((value, key) => {
                if (key === 'limit') query = query.limit(parseInt(value));
                else if (key === 'order') {
                    const [col, dir] = value.split(':');
                    query = query.order(col, { ascending: dir !== 'desc' });
                } else if (key === 'single') {
                    if (value === 'true') query = query.single();
                    else if (value === 'maybe') query = query.maybeSingle();
                } else if (key === 'uid') query = query.eq('user_id', value);
                else if (key === 'or') query = query.or(value);
                else {
                    if (value.includes(':')) {
                        const [op, val] = value.split(':');
                        if (['eq','neq','gt','gte','lt','lte','like','ilike','is','in'].includes(op)) {
                            query = query[op](key, val); return;
                        }
                    }
                    query = query.eq(key, value);
                }
            });
        }
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async insert(path, payload) {
        const table = path.replace(/^\//, '').split('/')[0];
        if (isAndroid()) {
            return window.ManyaBackend.db.insert(table, payload);
        }
        const { error, data } = await supabase.from(table).insert(payload).select().single();
        if (error) throw error;
        return data;
    },

    async patch(path, patchObj) {
        const url = new URL(path, 'http://facade.internal');
        const parts = url.pathname.split('/').filter(Boolean);
        const table = parts[0];
        const id = parts[1];
        if (!id) throw new Error('DB PATCH requires an ID in the URI');
        if (isAndroid()) {
            return window.ManyaBackend.db.patch(table, id, patchObj);
        }
        const { error, data } = await supabase.from(table).update(patchObj).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    async upsert(path, payload, options = {}) {
        const table = path.replace(/^\//, '').split('/')[0];
        if (isAndroid()) {
            return window.ManyaBackend.db.upsert(table, payload, options);
        }
        const { error, data } = await supabase.from(table).upsert(payload, options).select();
        if (error) throw error;
        return data;
    },

    async delete(path) {
        const parts = path.split('/').filter(Boolean);
        const table = parts[0];
        const id = parts[1];
        if (!id) throw new Error('DB DELETE requires an ID in the URI');
        if (isAndroid()) {
            return window.ManyaBackend.db.delete(table, id);
        }
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        return true;
    },
};

// ── STORAGE FACADE (Public API) ───────────────────────────────────────────────
export const storageFacade = {
    async get(uri, options = {}) {
        try {
            const { scheme, path } = parseUri(uri);
            switch (scheme) {
                case 'local': return localAdapter.get(path);
                case 'file': return await fileAdapter.get(path, options);
                case 'db': return await dbAdapter.get(path);
                default: throw new Error(`Unsupported storage scheme: ${scheme}`);
            }
        } catch (e) { throw errorMapper.map(e, `GET ${uri}`); }
    },

    async put(uri, payload, options = {}) {
        try {
            const { scheme, path } = parseUri(uri);
            switch (scheme) {
                case 'local': return localAdapter.put(path, payload);
                case 'file': return await fileAdapter.put(path, payload, options);
                case 'db': return await dbAdapter.upsert(path, payload, options);
                default: throw new Error(`Unsupported storage scheme: ${scheme}`);
            }
        } catch (e) { throw errorMapper.map(e, `PUT ${uri}`); }
    },

    async patch(uri, patchObj) {
        try {
            const { scheme, path } = parseUri(uri);
            if (scheme === 'db') return await dbAdapter.patch(path, patchObj);
            throw new Error(`PATCH not supported for ${scheme}`);
        } catch (e) { throw errorMapper.map(e, `PATCH ${uri}`); }
    },

    async delete(uri) {
        try {
            const { scheme, path } = parseUri(uri);
            switch (scheme) {
                case 'local': return localAdapter.delete(path);
                case 'db': return await dbAdapter.delete(path);
                default: throw new Error(`DELETE not supported for ${scheme}`);
            }
        } catch (e) { throw errorMapper.map(e, `DELETE ${uri}`); }
    },
};
