import { ManyaDB } from '../../infrastructure/db/manyaDB';

/**
 * Redux Middleware to sync user changes to IndexedDB automatically.
 */
export const persistenceMiddleware = store => next => action => {
  const result = next(action);
  
  // if the action is modifying the user...
  if (action?.type?.startsWith('user/') && action.type !== 'user/initialize/pending') {
      const state = store.getState();
      if (!state.user.isLoading && state.user.data) {
          // Fire and forget save to IndexedDB
          ManyaDB.saveUser(state.user.data).catch(console.error);
      }
  }
  return result;
};
