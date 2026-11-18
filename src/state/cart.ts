import type { CartLine } from '@/types';
import { createPersistentStore } from './createStore';

/** Lines saved by the previous version used `sel`; normalize on load. */
type LegacyLine = CartLine & { sel?: boolean };

const store = createPersistentStore<LegacyLine[]>('bd_cart', []);
store.set((lines) => lines.map(({ sel, ...l }) => ({ ...l, selected: l.selected ?? sel ?? true })));

export const lineKey = (id: number, color: string | null, size: string | null) => `${id}|${color ?? ''}|${size ?? ''}`;

export const cart = {
  useLines: store.useStore,
  get: store.get,
  subscribe: store.subscribe,
  replace: (lines: CartLine[]) => store.set(lines),
  add(id: number, color: string | null, size: string | null, qty: number) {
    const key = lineKey(id, color, size);
    store.set((lines) => {
      const ex = lines.find((l) => l.key === key);
      return ex ? lines.map((l) => (l.key === key ? { ...l, qty: l.qty + qty, selected: true } : l)) : [...lines, { key, id, color, size, qty, selected: true }];
    });
  },
  setQty(key: string, qty: number) {
    store.set((lines) => lines.map((l) => (l.key === key ? { ...l, qty: Math.max(1, qty) } : l)));
  },
  toggle(key: string, selected: boolean) {
    store.set((lines) => lines.map((l) => (l.key === key ? { ...l, selected } : l)));
  },
  selectAll(selected: boolean) {
    store.set((lines) => lines.map((l) => ({ ...l, selected })));
  },
  remove(keys: string[]) {
    const ks = new Set(keys);
    store.set((lines) => lines.filter((l) => !ks.has(l.key)));
  },
};

const wishStore = createPersistentStore<number[]>('bd_wish', []);
export const wish = {
  useIds: wishStore.useStore,
  get: wishStore.get,
  subscribe: wishStore.subscribe,
  replace: (ids: number[]) => wishStore.set(ids),
  has: (id: number) => wishStore.get().includes(id),
  toggle(id: number): boolean {
    const on = !wishStore.get().includes(id);
    wishStore.set((ids) => (on ? [...ids, id] : ids.filter((x) => x !== id)));
    return on;
  },
};
