import type { Address, Coupon, Order, User } from '@/types';
import { hashSecret } from '@/lib/hash';
import { local, session } from '@/lib/storage';
import { makeOrderNo, maskId, uid } from '@/lib/format';
import { orderState, canCancel, isDelivered } from '@/domain/orderState';
import { earnRate } from '@/domain/pricing';
import { ok, fail, type Backend, type GuestOrder, type PublicInquiry, type PublicReview } from './backend';

/** Stored account = public user aggregate + credentials. Never leaves this browser. */
interface StoredUser extends User {
  salt: string;
  hash: string;
  fail?: number;
  lockUntil?: number;
  lastLogin?: number;
}
interface StoredGuestOrder extends GuestOrder {
  salt: string;
  hash: string;
}

const K = { users: 'bd_users', keep: 'bd_keep', sess: 'bd_sess', recent: 'bd_recent', guest: 'bd_gorders', guestAuth: 'bd_gauth' };
const DAY = 864e5;
const COUPON_CODES: Record<string, Omit<Coupon, 'id' | 'got' | 'exp' | 'used'>> = {
  WELCOME2026: { name: '웰컴 코드 5,000원', type: 'won', val: 5000, min: 30000 },
  WINTER10: { name: '겨울 10% 할인', type: 'rate', val: 10, max: 20000, min: 20000 },
  BARODAM: { name: '바로담 3,000원', type: 'won', val: 3000, min: 15000 },
};

function strip(u: StoredUser): User {
  const { salt: _s, hash: _h, fail: _f, lockUntil: _l, lastLogin: _ll, ...pub } = u;
  return pub;
}

export function createLocalBackend(): Backend {
  let users: Record<string, StoredUser> = migrate(local.get<Record<string, StoredUser>>(K.users, {}));
  let me: string | null = session.get<string | null>(K.sess, null) ?? local.get<string | null>(K.keep, null);
  if (me && !users[me]) me = null;
  const listeners = new Set<() => void>();
  let snapshot: User | null = me ? strip(users[me]) : null;

  const persist = () => {
    local.set(K.users, users);
    snapshot = me && users[me] ? strip(users[me]) : null;
    listeners.forEach((l) => l());
  };
  const cur = (): StoredUser | null => (me ? users[me] ?? null : null);
  const points = (u: StoredUser, amt: number, why: string) => {
    u.points += amt;
    u.plog.unshift({ t: Date.now(), amt, why, bal: u.points });
  };
  const giveCoupon = (u: StoredUser, c: Omit<Coupon, 'id' | 'got' | 'exp' | 'used'>) =>
    u.coupons.unshift({ id: uid(), got: Date.now(), exp: Date.now() + 30 * DAY, used: null, ...c });

  const setSession = (id: string | null, keep: boolean) => {
    me = id;
    if (id) {
      session.set(K.sess, id);
      if (keep) local.set(K.keep, id);
      else local.remove(K.keep);
    } else {
      session.remove(K.sess);
      local.remove(K.keep);
    }
  };

  const backend: Backend = {
    kind: 'local',
    currentUser: () => snapshot,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    async signUp(i) {
      const id = i.id.toLowerCase();
      if (users[id] || id === 'admin') return fail('이미 쓰고 있는 아이디예요.');
      if (Object.values(users).some((u) => u.email === i.email)) return fail('이미 가입된 이메일이에요. 아이디 찾기를 이용해 주세요.');
      const salt = uid();
      const u: StoredUser = {
        id, name: i.name, email: i.email, phone: i.phone, marketing: i.marketing, joined: Date.now(),
        points: 0, plog: [], coupons: [], addrs: [], orders: [], reviews: [], qna: [], recent: [], usedCodes: [], shopping: { cart: [], wish: [], follows: [] },
        salt, hash: await hashSecret(i.password, salt),
      };
      giveCoupon(u, { name: '신규가입 15% 할인', type: 'rate', val: 15, max: 10000, min: 10000 });
      giveCoupon(u, { name: '첫 주문 배송비 무료', type: 'ship', val: 3000, min: 0 });
      giveCoupon(u, { name: '겨울 아우터 5,000원', type: 'won', val: 5000, min: 50000, cat: 'fashion' });
      points(u, 3000, '회원가입 축하 적립금');
      if (u.marketing) points(u, 2000, '마케팅 수신 동의 적립금');
      u.recent = local.get<number[]>(K.recent, []).slice(0, 40);
      users[id] = u;
      setSession(id, false);
      persist();
      return ok(strip(u));
    },

    async signIn(rawId, password, keep) {
      const id = rawId.trim().toLowerCase();
      const u = users[id];
      if (u?.lockUntil && u.lockUntil > Date.now())
        return fail(`비밀번호를 5번 틀려 ${Math.ceil((u.lockUntil - Date.now()) / 60000)}분 동안 로그인할 수 없어요. 비밀번호 재설정을 이용해 주세요.`);
      if (!u || (await hashSecret(password, u.salt)) !== u.hash) {
        if (u) {
          u.fail = (u.fail ?? 0) + 1;
          if (u.fail >= 5) {
            u.lockUntil = Date.now() + 5 * 60000;
            u.fail = 0;
          }
          local.set(K.users, users);
          return fail(`아이디 또는 비밀번호가 맞지 않아요. (${u.fail || 5}/5)`);
        }
        return fail('아이디 또는 비밀번호가 맞지 않아요.');
      }
      u.fail = 0;
      u.lastLogin = Date.now();
      const rec = local.get<number[]>(K.recent, []);
      u.recent = [...new Set([...u.recent, ...rec])].slice(0, 40);
      setSession(id, keep);
      persist();
      return ok(strip(u));
    },

    async signOut() {
      setSession(null, false);
      persist();
    },
    async isIdTaken(id) {
      return !!users[id.toLowerCase()] || id.toLowerCase() === 'admin';
    },
    async findId(name, email) {
      const u = Object.values(users).find((x) => x.name === name && x.email === email);
      return u ? ok({ id: maskId(u.id), joined: u.joined }) : fail('입력한 정보와 일치하는 회원이 없어요.');
    },
    async verifyForReset(id, email) {
      const u = users[id.toLowerCase()];
      return u && u.email === email ? ok(true) : fail('아이디와 이메일이 일치하는 회원이 없어요.');
    },
    async resetPassword(id, email, password) {
      const u = users[id.toLowerCase()];
      if (!u || u.email !== email) return fail('아이디와 이메일이 일치하는 회원이 없어요.');
      u.salt = uid();
      u.hash = await hashSecret(password, u.salt);
      u.fail = 0;
      u.lockUntil = 0;
      persist();
      return ok(true);
    },
    async changePassword(current, next) {
      const u = cur();
      if (!u) return fail('로그인이 필요해요.');
      if ((await hashSecret(current, u.salt)) !== u.hash) return fail('현재 비밀번호가 맞지 않아요.');
      u.salt = uid();
      u.hash = await hashSecret(next, u.salt);
      persist();
      return ok(true);
    },
    async updateProfile(patch) {
      const u = cur();
      if (!u) return fail('로그인이 필요해요.');
      if (Object.values(users).some((x) => x !== u && x.email === patch.email)) return fail('이미 다른 회원이 쓰고 있는 이메일이에요.');
      Object.assign(u, patch);
      persist();
      return ok(true);
    },
    async withdraw(password) {
      const u = cur();
      if (!u) return fail('로그인이 필요해요.');
      if ((await hashSecret(password, u.salt)) !== u.hash) return fail('비밀번호가 맞지 않아요.');
      delete users[u.id];
      setSession(null, false);
      persist();
      return ok(true);
    },

    async saveAddress(a) {
      const u = cur();
      if (!u) return fail('로그인이 필요해요.');
      if (a.def) u.addrs.forEach((x) => (x.def = false));
      let saved: Address;
      const existing = a.id ? u.addrs.find((x) => x.id === a.id) : undefined;
      if (existing) {
        Object.assign(existing, a, { def: a.def || existing.def });
        saved = existing;
      } else {
        saved = { ...a, id: uid(), def: a.def || !u.addrs.length };
        u.addrs.push(saved);
      }
      if (!u.addrs.some((x) => x.def)) u.addrs[0].def = true;
      persist();
      return ok(saved);
    },
    async removeAddress(id) {
      const u = cur();
      if (!u) return;
      u.addrs = u.addrs.filter((a) => a.id !== id);
      if (u.addrs.length && !u.addrs.some((a) => a.def)) u.addrs[0].def = true;
      persist();
    },
    async setDefaultAddress(id) {
      const u = cur();
      if (!u) return;
      u.addrs.forEach((a) => (a.def = a.id === id));
      persist();
    },

    async registerCouponCode(raw) {
      const u = cur();
      if (!u) return fail('로그인이 필요해요.');
      const code = raw.trim().toUpperCase();
      const c = COUPON_CODES[code];
      if (!c) return fail('없는 쿠폰 코드예요.');
      if (u.usedCodes.includes(code)) return fail('이미 등록한 코드예요.');
      u.usedCodes.push(code);
      giveCoupon(u, c);
      persist();
      return ok(c.name);
    },

    async placeOrder(i) {
      const u = cur();
      if (!u) return fail('로그인이 필요해요.');
      if (i.usePoints > u.points) return fail('적립금이 부족해요.');
      const cp = i.couponId ? u.coupons.find((c) => c.id === i.couponId && !c.used && c.exp > Date.now()) : undefined;
      if (i.couponId && !cp) return fail('쓸 수 없는 쿠폰이에요.');
      const at = Date.now();
      const total = Math.max(0, i.sub - i.couponAmount - i.usePoints + i.ship);
      const o: Order = {
        no: makeOrderNo(at), at, items: i.items, sub: i.sub, disc: i.disc, cpAmt: i.couponAmount, cp: cp?.name ?? null, cpId: cp?.id ?? null,
        usePts: i.usePoints, ship: i.ship, total, earn: Math.floor(total * earnRate(i.pay.m)), pay: i.pay, addr: i.addr, memo: i.memo,
        inv: `5${Math.floor(Math.random() * 9e10) + 1e10}`,
      };
      if (cp) cp.used = at;
      if (i.usePoints) points(u, -i.usePoints, `주문 결제에 사용 (${o.no})`);
      u.orders.unshift(o);
      persist();
      return ok(o);
    },
    async cancelOrder(no) {
      const u = cur();
      const o = u?.orders.find((x) => x.no === no);
      if (!u || !o) return fail('주문을 찾을 수 없어요.');
      if (!canCancel(orderState(o))) return fail('이미 배송이 시작돼 취소할 수 없어요.');
      o.cancelledAt = Date.now();
      const c = o.cpId ? u.coupons.find((x) => x.id === o.cpId) : undefined;
      if (c) c.used = null;
      if (o.usePts) points(u, o.usePts, `주문취소 적립금 반환 (${o.no})`);
      persist();
      return ok(true);
    },
    async confirmOrder(no) {
      const u = cur();
      const o = u?.orders.find((x) => x.no === no);
      if (!u || !o) return fail('주문을 찾을 수 없어요.');
      if (orderState(o).k !== 'done') return fail('배송이 끝난 주문만 구매확정할 수 있어요.');
      o.confirmedAt = Date.now();
      points(u, o.earn, `구매확정 적립 (${o.no})`);
      persist();
      return ok(o.earn);
    },

    async writeReview({ orderNo, k, star, txt }) {
      const u = cur();
      const o = u?.orders.find((x) => x.no === orderNo);
      const it = o?.items[k];
      if (!u || !o || !it) return fail('주문을 찾을 수 없어요.');
      if (!isDelivered(orderState(o))) return fail('배송이 끝난 뒤에 쓸 수 있어요.');
      if (u.reviews.some((r) => r.oid === orderNo && r.k === k)) return fail('이미 상품평을 썼어요.');
      const opt = [it.color, it.size && `사이즈 ${it.size}`].filter(Boolean).join(' · ') || '기본';
      u.reviews.unshift({ id: uid(), oid: orderNo, k, pid: it.pid, name: it.name, opt, star, txt, t: Date.now(), who: maskId(u.id) });
      points(u, 500, '리뷰 작성 적립');
      persist();
      return ok(true);
    },
    async deleteReview(id) {
      const u = cur();
      if (!u) return;
      u.reviews = u.reviews.filter((r) => r.id !== id);
      persist();
    },
    async reviewsFor(pid) {
      const out: PublicReview[] = [];
      for (const x of Object.values(users)) for (const r of x.reviews) if (r.pid === pid) out.push({ ...r, mine: x.id === me });
      return out;
    },

    async ask(q) {
      const u = cur();
      if (!u) return fail('로그인이 필요해요.');
      u.qna.unshift({ id: uid(), ...q, t: Date.now(), who: maskId(u.id) });
      persist();
      return ok(true);
    },
    async deleteInquiry(id) {
      const u = cur();
      if (!u) return;
      u.qna = u.qna.filter((q) => q.id !== id);
      persist();
    },
    async inquiriesFor(pid) {
      const out: PublicInquiry[] = [];
      for (const x of Object.values(users)) for (const q of x.qna) if (q.pid === pid) out.push({ ...q, mine: x.id === me });
      return out;
    },

    saveShopping(s) {
      const u = cur();
      if (!u) return;
      u.shopping = s;
      local.set(K.users, users);
      snapshot = strip(u);
    },
    addRecent(pid) {
      local.set(K.recent, [pid, ...local.get<number[]>(K.recent, []).filter((x) => x !== pid)].slice(0, 40));
      const u = cur();
      if (u) {
        u.recent = [pid, ...u.recent.filter((x) => x !== pid)].slice(0, 40);
        persist();
      }
    },

    clearRecent() {
      local.set(K.recent, []);
      const u = cur();
      if (u) {
        u.recent = [];
        persist();
      }
    },

    async placeGuestOrder(i) {
      const salt = uid();
      const at = Date.now();
      const total = i.sub + i.ship;
      const o: StoredGuestOrder = {
        no: makeOrderNo(at), at, items: i.items, sub: i.sub, disc: i.disc, cpAmt: 0, cp: null, cpId: null, usePts: 0, ship: i.ship, total, earn: 0,
        pay: i.pay, addr: i.addr, memo: i.memo, buyer: i.buyer, inv: `5${Math.floor(Math.random() * 9e10) + 1e10}`,
        salt, hash: await hashSecret(i.password, salt),
      };
      local.set(K.guest, [o, ...local.get<StoredGuestOrder[]>(K.guest, [])].slice(0, 50));
      session.set(K.guestAuth, [...session.get<string[]>(K.guestAuth, []), o.no]);
      return ok(o);
    },
    async lookupGuestOrder(no, password) {
      const o = local.get<StoredGuestOrder[]>(K.guest, []).find((x) => x.no === no);
      if (!o || (await hashSecret(password, o.salt)) !== o.hash) return fail('주문번호 또는 주문 비밀번호가 맞지 않아요.');
      session.set(K.guestAuth, [...new Set([...session.get<string[]>(K.guestAuth, []), no])]);
      return ok(o);
    },
    getGuestOrder(no) {
      if (!session.get<string[]>(K.guestAuth, []).includes(no)) return null;
      return local.get<StoredGuestOrder[]>(K.guest, []).find((x) => x.no === no) ?? null;
    },
    async cancelGuestOrder(no) {
      const all = local.get<StoredGuestOrder[]>(K.guest, []);
      const o = all.find((x) => x.no === no);
      if (!o) return fail('주문을 찾을 수 없어요.');
      if (!canCancel(orderState(o))) return fail('이미 배송이 시작돼 취소할 수 없어요.');
      o.cancelledAt = Date.now();
      local.set(K.guest, all);
      return ok(true);
    },
  };
  return backend;
}

/** Accounts saved by the previous (vanilla JS) version used `used_codes`. */
function migrate(map: Record<string, StoredUser & { used_codes?: string[] }>): Record<string, StoredUser> {
  for (const u of Object.values(map)) {
    u.usedCodes ??= u.used_codes ?? [];
    delete u.used_codes;
    u.recent ??= [];
    u.shopping ??= { cart: [], wish: [], follows: [] };
  }
  return map;
}
