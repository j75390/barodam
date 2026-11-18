import { useSyncExternalStore } from 'react';
import { local } from '@/lib/storage';

/** Minimal external store persisted to localStorage, read with useSyncExternalStore. */
export function createPersistentStore<T>(key: string, initial: T) {
  let state: T = local.get<T>(key, initial);
  const listeners = new Set<() => void>();
  const store = {
    get: () => state,
    set(next: T | ((prev: T) => T)) {
      state = typeof next === 'function' ? (next as (p: T) => T)(state) : next;
      local.set(key, state);
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
  // keep tabs in sync
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === key) {
        state = local.get<T>(key, initial);
        listeners.forEach((l) => l());
      }
    });
  }
  const useStore = () => useSyncExternalStore(store.subscribe, store.get, store.get);
  return { ...store, useStore };
}
