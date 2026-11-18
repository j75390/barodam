/**
 * Deterministic pseudo-random generator (mulberry32 variant).
 * Products are generated from their photo id, so the same product always gets the
 * same price, rating and options on every visit and every device.
 */
export function createRandom(seed: number) {
  let s = seed | 0;
  const next = (): number => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (a: number, b: number) => a + next() * (b - a),
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    /** Fisher–Yates shuffle (stable across JS engines, unlike sort(() => r - .5)) */
    shuffle: <T,>(arr: readonly T[]): T[] => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

/** Small linear congruential generator used for per-product review/compare data. */
export function lcg(seed: number) {
  let k = seed;
  return () => {
    k = (k * 9301 + 49297) % 233280;
    return k / 233280;
  };
}

/** Stable 32-bit hash of a string (for brand colors etc.). */
export function hashString(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
