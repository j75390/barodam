import type { CategoryId, Product } from '@/types';
import { createRandom } from '@/lib/random';
import { COLORED_TYPES, COLORS, TYPES, TYPE_ALIAS, type TypeDef } from './catalog';
import photos from './photos.json';

export interface PhotoEntry {
  f: string;
  type: string;
  name: string;
  brand: string;
  color: string;
}

const TYPE_TABLE: Record<string, TypeDef> = Object.fromEntries(TYPES.map((t) => [t[1], t]));

/** gen/p123.jpg → 123, cc/x007.jpg → 1007 (stable id: carts and orders never point at another product) */
export function idFromPhoto(f: string): number {
  const m = /(p|x)(\d+)\.jpg$/.exec(f);
  if (!m) return 0;
  return (m[1] === 'x' ? 1000 : 0) + Number(m[2]);
}

/** Builds one product from its photo entry. Pure and deterministic. */
export function buildProduct(ph: PhotoEntry): Product | null {
  const def = TYPE_TABLE[ph.type] ?? TYPE_TABLE[TYPE_ALIAS[ph.type]];
  const id = idFromPhoto(ph.f);
  if (!def || !id) return null;
  const [cat, , , [lo, hi]] = def;
  const r = createRandom(20261118 + id * 7919);

  const base = Math.round(r.between(lo, hi) / 100) * 100;
  const off = r.next() < 0.15 ? 0 : Math.round(r.between(5, 62));
  const price = Math.round((base * (1 - off / 100)) / 10) * 10;
  const shipRoll = r.next();
  const hasColors = (['fashion', 'shoes', 'bag'] as CategoryId[]).includes(cat) || COLORED_TYPES.has(ph.type);
  const colors = hasColors
    ? [...new Set([ph.color, ...r.shuffle(COLORS)].filter(Boolean))].slice(0, 2 + Math.floor(r.next() * 3))
    : null;
  const sizes = cat === 'fashion' ? ['S', 'M', 'L', 'XL'] : cat === 'shoes' && ph.type !== 'socks' ? ['240', '250', '260', '270', '280'] : null;

  const product: Product = {
    id,
    cat,
    type: ph.type,
    brand: ph.brand || ph.name.split(' ')[0],
    name: ph.name,
    photo: ph.f,
    hue: Math.floor(r.next() * 360),
    base,
    off,
    price,
    colors,
    sizes,
    soldOut: [],
    rating: Number(r.between(4.1, 4.95).toFixed(1)),
    reviews: Math.floor(Math.pow(r.next(), 2) * 9800) + 12,
    sold: Math.floor(r.next() * 5000) + 30,
    rocket: shipRoll < 0.55,
    dawn: shipRoll < 0.25,
    free: r.next() < 0.7 || price >= 19800,
    stock: Math.floor(r.between(3, 140)),
    trend: Math.floor(r.between(-4, 9)),
  };
  if (sizes) product.soldOut = sizes.filter(() => r.next() < 0.18);
  // never sell out every size
  if (sizes && product.soldOut.length === sizes.length) product.soldOut = product.soldOut.slice(1);
  return product;
}

export function buildCatalog(entries: PhotoEntry[]): Product[] {
  const seen = new Set<number>();
  const out: Product[] = [];
  for (const e of entries) {
    const p = buildProduct(e);
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

export const PRODUCTS: Product[] = buildCatalog(photos.items as PhotoEntry[]);
export const RESERVED: Record<string, string> = photos.reserved;

const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
export const productById = (id: number): Product | undefined => BY_ID.get(id);

export const BRANDS: string[] = [...new Set(PRODUCTS.map((p) => p.brand))];
export const productsByBrand = (b: string): Product[] => PRODUCTS.filter((p) => p.brand === b);
