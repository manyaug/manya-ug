/**
 * LEGACY SHIM — DO NOT EDIT
 * All backend logic has moved to src/backend/
 * This file re-exports from the canonical backend location
 * so existing imports across the app continue to work unchanged.
 */
export { storageFacade } from '../../backend/storage/storageFacade.js';
export { errorMapper } from '../../backend/storage/errorMapper.js';
