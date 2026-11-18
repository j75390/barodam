import type { Coupon, Product } from '@/types';
import { FREE_SHIPPING_MIN, SHIPPING_FEE } from '@/data/catalog';

export interface PricedLine {
  p: Product;
  qty: number;
}

export interface Totals {
  /** sum of sale prices */
  sub: number;
  /** total product discount (list − sale) */
  disc: number;
  ship: number;
}

export function lineTotals(lines: PricedLine[]): Totals {
  const sub = lines.reduce((a, l) => a + l.p.price * l.qty, 0);
  const disc = lines.reduce((a, l) => a + (l.p.base - l.p.price) * l.qty, 0);
  const ship = !lines.length || sub >= FREE_SHIPPING_MIN || lines.every((l) => l.p.free) ? 0 : SHIPPING_FEE;
  return { sub, disc, ship };
}

/**
 * Discount a coupon gives for these lines.
 * Returns -1 when the coupon's conditions (minimum amount / category) aren't met.
 */
export function couponAmount(c: Coupon | null | undefined, lines: PricedLine[], shipping: number): number {
  if (!c) return 0;
  const sub = lines.reduce((a, l) => a + l.p.price * l.qty, 0);
  if (c.min && sub < c.min) return -1;
  if (c.cat && !lines.some((l) => l.p.cat === c.cat)) return -1;
  const base = c.cat ? lines.filter((l) => l.p.cat === c.cat).reduce((a, l) => a + l.p.price * l.qty, 0) : sub;
  if (c.type === 'rate') return Math.min(c.max ?? Infinity, Math.floor((base * c.val) / 100 / 10) * 10);
  if (c.type === 'ship') return shipping;
  return Math.min(c.val, base);
}

/** Points can be used from 1,000 in units of 10, up to the balance and the payable amount. */
export function clampPoints(want: number, balance: number, payable: number): number {
  if (want < 1000) return 0;
  return Math.floor(Math.min(want, balance, Math.max(0, payable)) / 10) * 10;
}

/** Earned on purchase confirmation: 1% (바로페이 1.5%). */
export const earnRate = (method: string): number => (method === 'baro' ? 0.015 : 0.01);

/** Membership grade by total spend. */
export function grade(spent: number): { name: string; rate: number; next: [string, number] | null } {
  if (spent >= 1_000_000) return { name: '골드', rate: 3, next: null };
  if (spent >= 300_000) return { name: '실버', rate: 2, next: ['골드', 1_000_000 - spent] };
  return { name: '일반', rate: 1, next: ['실버', 300_000 - spent] };
}
