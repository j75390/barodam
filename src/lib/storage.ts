/**
 * Safe wrappers around Web Storage. Private windows or blocked site data can make the
 * accessors throw, so every read/write is guarded and falls back to the default.
 */
function make(area: () => Storage) {
  return {
    get<T>(key: string, fallback: T): T {
      try {
        const v = area().getItem(key);
        return v == null ? fallback : (JSON.parse(v) as T);
      } catch {
        return fallback;
      }
    },
    set(key: string, value: unknown): void {
      try {
        area().setItem(key, JSON.stringify(value));
      } catch {
        /* storage full or blocked: ignore */
      }
    },
    remove(key: string): void {
      try {
        area().removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

export const local = make(() => window.localStorage);
export const session = make(() => window.sessionStorage);
