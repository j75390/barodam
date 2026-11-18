import type { Product } from '@/types';
import { DAYS, fmtMonthDay } from '@/lib/format';

/** Arrival label for cards: 내일(목) 새벽 도착 / 내일(목) 도착 / 11/21(토) 도착 예정 */
export function arrivalText(p: Pick<Product, 'rocket' | 'dawn'>, now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + (p.rocket ? 1 : 3));
  const w = DAYS[d.getDay()];
  if (p.dawn) return `내일(${w}) 새벽 도착`;
  if (p.rocket) return `내일(${w}) 도착`;
  return `${d.getMonth() + 1}/${d.getDate()}(${w}) 도착 예정`;
}

/** Product page delivery promise with the 14:00 same-day cutoff. */
export function deliveryPromise(p: Pick<Product, 'rocket'>, now = new Date()) {
  const cut = new Date(now);
  cut.setHours(14, 0, 0, 0);
  const beforeCutoff = now < cut;
  const msLeft = Math.max(0, cut.getTime() - now.getTime());
  const d = new Date(now);
  d.setDate(d.getDate() + (p.rocket ? (beforeCutoff ? 1 : 2) : 3));
  return {
    beforeCutoff,
    hoursLeft: Math.floor(msLeft / 36e5),
    minutesLeft: Math.floor((msLeft % 36e5) / 6e4),
    date: fmtMonthDay(d),
  };
}
