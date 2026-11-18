// Server-side rule check against the live Supabase project.
// Creates a throw-away member, exercises orders / coupons / points / guest orders,
// tries the attacks the database must refuse, then deletes the member again.
//   node tools/server-check.mjs
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/services/supabaseClient.ts', import.meta.url), 'utf8');
const URL_ = process.env.VITE_SUPABASE_URL || src.match(/'(https:\/\/[a-z0-9]+\.supabase\.co)'/)[1];
const KEY = process.env.VITE_SUPABASE_ANON_KEY || src.match(/'(eyJ[^']+)'/)[1];

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `  (${detail})` : ''}`);
};
async function call(path, { token, method = 'POST', body } = {}) {
  const res = await fetch(URL_ + path, {
    method,
    headers: { apikey: KEY, 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
const rpc = (fn, args, token) => call(`/rest/v1/rpc/${fn}`, { token, body: args });
const item = (qty, price) => ({ pid: 25, name: '테스트 상품', photo: 'gen/p025.jpg', type: 'tee', hue: 0, color: null, size: null, qty, price, base: price * 2 });
const sheet = (extra) => ({ items: [item(2, 8530)], sub: 17060, disc: 17060, ship: 3000, pay: { m: 'card', d: '테스트' }, addr: { to: '테스트', phone: '010-0000-0000', zip: '00000', a1: '테스트', a2: '' }, memo: '', ...extra });

const id = `chk${Date.now() % 1e8}`;
const password = 'check1234a';
let token = null;
try {
  // ── sign-up ──
  const su = await call('/auth/v1/signup', { body: { email: `${id}@member.barodam.kro.kr`, password, data: { login_id: id, name: '점검', email: `${id}@example.com`, phone: '010-0000-0000', marketing: true } } });
  token = su.data?.access_token;
  check('가입하면 바로 로그인된다', !!token);
  const me = await call('/rest/v1/profiles?select=points', { token, method: 'GET' });
  check('가입 적립금 3,000 + 마케팅 동의 2,000 = 5,000원', me.data?.[0]?.points === 5000, `${me.data?.[0]?.points}`);
  const cps = await call('/rest/v1/coupons?select=id,name', { token, method: 'GET' });
  check('가입 쿠폰 3장이 발급된다', cps.data?.length === 3);
  check('같은 아이디는 다시 쓸 수 없다', (await rpc('is_id_taken', { p_id: id })).data === true);

  // ── order with coupon + points, then cancel ──
  const rate = cps.data.find((c) => c.name.includes('15%'));
  const o = await rpc('place_order', { p: sheet({ couponId: rate.id, couponAmount: 2550, usePoints: 5000 }) }, token);
  check('쿠폰·적립금 주문 금액 = 17,060 − 2,550 − 5,000 + 3,000', o.data?.total === 12510, `${o.data?.total}`);
  const again = await rpc('place_order', { p: sheet({ couponId: rate.id, couponAmount: 2550, usePoints: 0 }) }, token);
  check('이미 쓴 쿠폰은 다시 쓸 수 없다', again.status >= 400, again.data?.message);
  const cancel = await rpc('cancel_order', { p_no: o.data.no }, token);
  const after = await call('/rest/v1/profiles?select=points', { token, method: 'GET' });
  check('주문 취소 시 적립금이 돌아온다', cancel.status < 300 && after.data?.[0]?.points === 5000, `${after.data?.[0]?.points}`);
  const cp2 = await call(`/rest/v1/coupons?select=used&id=eq.${rate.id}`, { token, method: 'GET' });
  check('주문 취소 시 쿠폰이 돌아온다', cp2.data?.[0]?.used === null);

  // ── attacks the database must refuse ──
  check('가진 것보다 많은 적립금은 쓸 수 없다', (await rpc('place_order', { p: sheet({ couponId: null, couponAmount: 0, usePoints: 999999 }) }, token)).status >= 400);
  check('상품 금액을 조작한 주문은 거절된다', (await rpc('place_order', { p: sheet({ sub: 100, couponId: null, couponAmount: 0, usePoints: 0 }) }, token)).status >= 400);
  check('쿠폰 없이 할인 금액만 넣으면 거절된다', (await rpc('place_order', { p: sheet({ couponId: null, couponAmount: 10000, usePoints: 0 }) }, token)).status >= 400);
  const patch = await call('/rest/v1/profiles?id=not.is.null', { token, method: 'PATCH', body: { points: 999999 } });
  check('적립금을 테이블에서 직접 고칠 수 없다', patch.status >= 400);
  const fakeCoupon = await call('/rest/v1/coupons', { token, body: { name: '가짜', type: 'won', val: 99999, exp: 9e12 } });
  check('쿠폰을 직접 만들 수 없다', fakeCoupon.status >= 400);
  check('로그인하지 않으면 회원 정보를 읽을 수 없다', (await call('/rest/v1/profiles?select=*', { method: 'GET' })).status >= 400);
  check('로그인하지 않으면 주문을 볼 수 없다', (await call('/rest/v1/orders?select=no', { method: 'GET' })).status >= 400);
  check('로그인하지 않으면 회원 주문 함수를 부를 수 없다', (await rpc('place_order', { p: sheet({}) })).status >= 400);
  check('같은 쿠폰 코드는 한 번만 등록된다', (await rpc('register_coupon', { p_code: 'BARODAM' }, token)).status < 300 && (await rpc('register_coupon', { p_code: 'barodam' }, token)).status >= 400);

  // ── guest order ──
  const g = await rpc('place_guest_order', { p: { ...sheet({}), buyer: { name: '비회원', phone: '010-0000-0000', email: 'guest@example.com' } }, p_password: 'pw1234' });
  check('비회원 주문은 주문 비밀번호가 틀리면 조회되지 않는다', (await rpc('lookup_guest_order', { p_no: g.data?.no, p_password: 'wrong' })).status >= 400);
  check('비회원 주문은 맞는 비밀번호로 취소된다', (await rpc('cancel_guest_order', { p_no: g.data?.no, p_password: 'pw1234' })).data?.cancelledAt > 0);
} finally {
  if (token) {
    const del = await rpc('delete_account', {}, token);
    check('탈퇴하면 계정과 데이터가 지워진다', del.status < 300 && (await rpc('is_id_taken', { p_id: id })).data === false);
  }
}
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
