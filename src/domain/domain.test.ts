import { orderState, trackingLog, canCancel } from './orderState';
import { lineTotals, couponAmount, clampPoints, grade } from './pricing';
import type { Coupon, Product } from '@/types';

const MIN = 60000;
const T0 = Date.UTC(2026, 10, 19, 3, 0, 0);

describe('orderState', () => {
  it('moves through the steps over time', () => {
    expect(orderState({ at: T0 }, T0).k).toBe('paid');
    expect(orderState({ at: T0 }, T0 + 2 * MIN).k).toBe('ready');
    expect(orderState({ at: T0 }, T0 + 5 * MIN).k).toBe('ship');
    expect(orderState({ at: T0 }, T0 + 11 * MIN).k).toBe('done');
  });
  it('cancel and confirm override the timeline', () => {
    expect(orderState({ at: T0, cancelledAt: T0 + MIN }, T0 + 20 * MIN).k).toBe('cancel');
    expect(orderState({ at: T0, confirmedAt: T0 + MIN }, T0).k).toBe('confirmed');
  });
  it('only allows cancelling before shipping', () => {
    expect(canCancel(orderState({ at: T0 }, T0 + 2 * MIN))).toBe(true);
    expect(canCancel(orderState({ at: T0 }, T0 + 5 * MIN))).toBe(false);
  });
  it('tracking log is newest first', () => {
    const log = trackingLog({ at: T0 }, T0 + 5 * MIN);
    expect(log[0].what).toBe('간선상차');
    expect(log.at(-1)!.what).toBe('결제완료');
  });
});

const prod = (over: Partial<Product>): Product => ({
  id: 1, cat: 'fashion', type: 'tee', brand: 'b', name: 'n', photo: 'gen/p001.jpg', hue: 0, base: 20000, off: 10, price: 18000,
  colors: null, sizes: null, soldOut: [], rating: 4.5, reviews: 1, sold: 1, rocket: true, dawn: false, free: false, stock: 10, trend: 0, ...over,
});
const coupon = (over: Partial<Coupon>): Coupon => ({ id: 'c', name: 'c', type: 'rate', val: 15, min: 10000, max: 10000, got: 0, exp: Infinity, used: null, ...over });

describe('pricing', () => {
  it('charges shipping under the free-shipping minimum unless every item ships free', () => {
    expect(lineTotals([{ p: prod({ price: 10000 }), qty: 1 }]).ship).toBe(3000);
    expect(lineTotals([{ p: prod({ price: 10000 }), qty: 2 }]).ship).toBe(0);
    expect(lineTotals([{ p: prod({ price: 10000, free: true }), qty: 1 }]).ship).toBe(0);
  });
  it('applies percentage coupons with a cap, rounded down to 10원', () => {
    const lines = [{ p: prod({ price: 21960 }), qty: 1 }];
    expect(couponAmount(coupon({}), lines, 0)).toBe(3290);
    expect(couponAmount(coupon({}), [{ p: prod({ price: 200000 }), qty: 1 }], 0)).toBe(10000);
  });
  it('rejects coupons whose conditions are not met', () => {
    expect(couponAmount(coupon({ min: 50000 }), [{ p: prod({}), qty: 1 }], 0)).toBe(-1);
    expect(couponAmount(coupon({ cat: 'food', min: 0 }), [{ p: prod({}), qty: 1 }], 0)).toBe(-1);
  });
  it('clamps points to 1,000+ in 10원 units within balance and payable', () => {
    expect(clampPoints(999, 5000, 9000)).toBe(0);
    expect(clampPoints(5000, 3005, 9000)).toBe(3000);
    expect(clampPoints(5000, 5000, 2345)).toBe(2340);
  });
  it('grades members by spend', () => {
    expect(grade(0).name).toBe('일반');
    expect(grade(300000).name).toBe('실버');
    expect(grade(1200000).next).toBeNull();
  });
});
