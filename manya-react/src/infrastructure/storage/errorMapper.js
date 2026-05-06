// src/infrastructure/storage/errorMapper.js

export class StorageError extends Error {
  constructor(message, type, originalError = null) {
    super(message);
    this.name = 'StorageError';
    this.type = type; // 'NotFound', 'Permission', 'Network', 'Conflict', 'Unknown'
    this.originalError = originalError;
  }
}

export const errorMapper = {
  map(error, context = '') {
    if (error instanceof StorageError) return error;

    let type = 'Unknown';
    let message = error.message || 'An unknown storage error occurred';

    // Supabase / PostgREST errors
    if (error.code) {
      if (error.code === 'PGRST116') type = 'NotFound';
      else if (error.code.startsWith('42')) type = 'Permission';
      else if (error.code.startsWith('23')) type = 'Conflict';
    }

    // HTTP / Network errors
    if (message.includes('fetch') || message.includes('network')) {
      type = 'Network';
    }

    if (message.includes('404') || message.includes('not found')) {
      type = 'NotFound';
    }

    return new StorageError(`${context}: ${message}`, type, error);
  }
};
