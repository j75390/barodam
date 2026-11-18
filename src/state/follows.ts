import { createPersistentStore } from './createStore';

const store = createPersistentStore<string[]>('bd_follow', []);

/** Brands the visitor has "liked". */
export const follows = {
  useIds: store.useStore,
  toggle(brand: string): boolean {
    const on = !store.get().includes(brand);
    store.set((ids) => (on ? [...ids, brand] : ids.filter((b) => b !== brand)));
    return on;
  },
};
