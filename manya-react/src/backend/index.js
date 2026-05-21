/**
 * MANYA BACKEND — Barrel Export
 * ================================
 * Single import point for all backend services.
 *
 * Usage in the web app:
 *   import { syncService } from '../backend';
 *   import { ManyaDB } from '../backend';
 *   import { storageFacade } from '../backend';
 *
 * Android developer: the files in this folder are the ones you replace.
 * The rest of the web app (components, engines, views) never changes.
 */

export { authService }       from './auth/authService.js';
export { ManyaDB }           from './db/manyaDB.js';
export { storageFacade }     from './storage/storageFacade.js';
export { storageService }    from './storage/storageService.js';
export { errorMapper }       from './storage/errorMapper.js';
export { syncService }       from './sync/syncService.js';
export { rewardService }     from './services/rewardService.js';
export { telemetryService }  from './services/telemetryService.js';
export { audioService }      from './audio/audioService.js';
export { supabase }          from './remote/supabaseClient.js';
