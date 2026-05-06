import { supabase } from '../remote/supabaseClient.js';
import { errorMapper } from './errorMapper.js';

/**
 * URI Parser helper
 * uri format: scheme:/path?query
 */
const parseUri = (uri) => {
  const match = uri.match(/^([a-z]+):(.*)$/i);
  if (!match) throw new Error(`Invalid Storage URI: ${uri}`);
  return { scheme: match[1], path: match[2] };
};

/** LocalStorage adapter */
const localAdapter = {
  get(key) {
    const val = localStorage.getItem(key);
    try { return JSON.parse(val); } catch(e) { return val; }
  },
  put(key, val) {
    const str = typeof val === 'string' ? val : JSON.stringify(val);
    localStorage.setItem(key, str);
  },
  delete(key) {
    localStorage.removeItem(key);
  },
};

/** File adapter – handles static assets and file API */
const fileAdapter = {
  resolveUrl(path) {
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return path; // Use as-is if absolute from root
    return `/api/files/${path}`;
  },
  async get(path, { asStream = false } = {}) {
    const url = this.resolveUrl(path);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`File fetch failed: ${resp.status} ${resp.statusText}`);
    return asStream ? resp.body : resp.json();
  },
  async put(path, payload, { asStream = false } = {}) {
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

/** DB adapter – wraps Supabase client */
const dbAdapter = {
  async get(path) {
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
          // Support operators like col=ilike:val or col=gt:5
          if (value.includes(':')) {
            const [op, val] = value.split(':');
            if (['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in'].includes(op)) {
              query = query[op](key, val);
              return;
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
    const { error, data } = await supabase.from(table).update(patchObj).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async upsert(path, payload, options = {}) {
    const table = path.replace(/^\//, '').split('/')[0];
    const { error, data } = await supabase.from(table).upsert(payload, options).select();
    if (error) throw error;
    return data;
  },
  async delete(path) {
    const parts = path.split('/').filter(Boolean);
    const table = parts[0];
    const id = parts[1];
    if (!id) throw new Error('DB DELETE requires an ID in the URI');
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

/**
 * STORAGE FACADE
 * ============================================================
 * Unified API for local storage, remote files, and database.
 */
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

  async patch(uri, patchObj, options = {}) {
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
