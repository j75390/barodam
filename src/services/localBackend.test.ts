import { createLocalBackend } from './localBackend';
import type { PlaceOrderInput } from './backend';

const signUpInput = { id: 'tester01', password: 'abc12345', name: '테스터', email: 't@example.com', phone: '010-1234-5678', marketing: false };

const orderInput = (couponId: string | null, couponAmount: number, usePoints: number): PlaceOrderInput => ({
  items: [{ pid: 25, name: '티셔츠', photo: 'gen/p025.jpg', type: 'tee', hue: 0, color: '베이지', size: 'M', qty: 1, price: 21960, base: 48800 }],
  sub: 21960, disc: 26840, ship: 0, couponId, couponAmount, usePoints,
  pay: { m: 'card', d: '바로카드 · 일시불' },
  addr: { to: '테스터', phone: '010-1234-5678', zip: '12345', a1: '서울시 바로구 담길 12', a2: '101호' },
  memo: '문 앞에 놓아 주세요',
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('local backend', () => {
  it('signs up with welcome coupons and points, then signs in', async () => {
    const be = createLocalBackend();
    const r = await be.signUp(signUpInput);
    expect(r.ok).toBe(true);
    expect(be.currentUser()?.coupons).toHaveLength(3);
    expect(be.currentUser()?.points).toBe(3000);
    await be.signOut();
    expect(be.currentUser()).toBeNull();
    expect((await be.signIn('tester01', 'wrongpass1', false)).ok).toBe(false);
    expect((await be.signIn('TESTER01', 'abc12345', false)).ok).toBe(true);
  });

  it('rejects duplicate ids and emails', async () => {
    const be = createLocalBackend();
    await be.signUp(signUpInput);
    expect((await be.signUp(signUpInput)).ok).toBe(false);
    expect((await be.signUp({ ...signUpInput, id: 'other01' })).ok).toBe(false);
  });

  it('locks the account after five wrong passwords', async () => {
    const be = createLocalBackend();
    await be.signUp(signUpInput);
    await be.signOut();
    for (let i = 0; i < 5; i++) await be.signIn('tester01', 'nope12345', false);
    const r = await be.signIn('tester01', 'abc12345', false);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('5번 틀려');
  });

  it('uses and refunds coupons and points on cancel', async () => {
    const be = createLocalBackend();
    await be.signUp(signUpInput);
    const coupon = be.currentUser()!.coupons.find((c) => c.type === 'rate')!;
    const placed = await be.placeOrder(orderInput(coupon.id, 3290, 3000));
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.value.total).toBe(21960 - 3290 - 3000);
    expect(be.currentUser()!.points).toBe(0);
    expect(be.currentUser()!.coupons.find((c) => c.id === coupon.id)!.used).not.toBeNull();

    expect((await be.cancelOrder(placed.value.no)).ok).toBe(true);
    expect(be.currentUser()!.points).toBe(3000);
    expect(be.currentUser()!.coupons.find((c) => c.id === coupon.id)!.used).toBeNull();
  });

  it('keeps guest orders behind order number + password', async () => {
    const be = createLocalBackend();
    const { coupon: _c, ...rest } = { coupon: null, ...orderInput(null, 0, 0) };
    const { couponId: _a, couponAmount: _b, usePoints: _d, ...guestBase } = rest;
    const r = await be.placeGuestOrder({ ...guestBase, buyer: { name: '김바로', phone: '010-9999-8888', email: 'g@example.com' }, password: '4321' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    sessionStorage.clear();
    expect(be.getGuestOrder(r.value.no)).toBeNull();
    expect((await be.lookupGuestOrder(r.value.no, '1111')).ok).toBe(false);
    expect((await be.lookupGuestOrder(r.value.no, '4321')).ok).toBe(true);
    expect(be.getGuestOrder(r.value.no)?.buyer.name).toBe('김바로');
  });

  it('registers coupon codes once', async () => {
    const be = createLocalBackend();
    await be.signUp(signUpInput);
    expect((await be.registerCouponCode('winter10')).ok).toBe(true);
    expect((await be.registerCouponCode('WINTER10')).ok).toBe(false);
    expect((await be.registerCouponCode('NOPE')).ok).toBe(false);
  });
});
