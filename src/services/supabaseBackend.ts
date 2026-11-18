import type { Address, Coupon, Inquiry, Order, PointLog, Review, User } from '@/types';
import { local, session } from '@/lib/storage';
import { ok, fail, type Backend, type GuestOrder, type PublicInquiry, type PublicReview, type Result } from './backend';
import { authEmail, koreanError, setKeepLogin, supabase } from './supabaseClient';

/* Row shapes returned by PostgREST (see supabase/schema.sql). */
interface ProfileRow { id: string; login_id: string; name: string; email: string; phone: string; marketing: boolean; joined: number; points: number; recent: number[]; used_codes: string[] }
interface AddressRow { id: string; label: string; to_name: string; phone: string; zip: string; a1: string; a2: string; def: boolean }
interface CouponRow extends Omit<Coupon, 'max' | 'cat'> { max: number | null; cat: Coupon['cat'] | null }
interface OrderRow { no: string; at: number; body: Omit<Order, 'no' | 'at'>; cancelled_at: number | null; confirmed_at: number | null }
interface OrderJson extends Omit<Order, 'cancelledAt' | 'confirmedAt'> { cancelledAt: number | null; confirmedAt: number | null }
interface ReviewRow extends Review { uid: string }
interface InquiryRow extends Inquiry { uid: string }

const toAddress = (r: AddressRow): Address => ({ id: r.id, label: r.label, to: r.to_name, phone: r.phone, zip: r.zip, a1: r.a1, a2: r.a2, def: r.def });
const toCoupon = ({ max, cat, ...c }: CouponRow): Coupon => ({ ...c, ...(max != null && { max }), ...(cat && { cat }) });
/** Order JSON from the server uses null for "not yet"; the UI types use an absent field. */
function fromJson<T extends Order>(j: OrderJson): T {
  const { cancelledAt, confirmedAt, ...o } = j;
  return { ...o, ...(cancelledAt ? { cancelledAt } : {}), ...(confirmedAt ? { confirmedAt } : {}) } as T;
}
const toOrder = (r: OrderRow): Order => fromJson({ ...r.body, no: r.no, at: r.at, cancelledAt: r.cancelled_at, confirmedAt: r.confirmed_at });
const strip = <T extends { uid: string }>({ uid: _u, ...rest }: T) => rest;

const GUEST = 'bd_gorders_sb';
type GuestCache = Record<string, { o: GuestOrder; pw: string }>;

/**
 * Backend backed by Supabase (Postgres + Auth). Same contract as the browser-only backend:
 * screens read a synchronous snapshot of the signed-in member and every write goes through the server,
 * where Row Level Security and SQL functions enforce the rules.
 */
export function createSupabaseBackend(): Backend & { ready: Promise<void> } {
  const sb = supabase();
  const listeners = new Set<() => void>();
  let snapshot: User | null = null;
  let uid: string | null = null;
  const emit = () => listeners.forEach((l) => l());

  async function load(): Promise<User | null> {
    const { data: s } = await sb.auth.getSession();
    uid = s.session?.user.id ?? null;
    if (!uid) {
      snapshot = null;
      emit();
      return null;
    }
    const [p, cps, pl, ad, od, rv, qa] = await Promise.all([
      sb.from('profiles').select('*').eq('id', uid).single<ProfileRow>(),
      sb.from('coupons').select('id,name,type,val,min,max,cat,got,exp,used').order('got', { ascending: false }).returns<CouponRow[]>(),
      sb.from('point_logs').select('t,amt,why,bal').order('t', { ascending: false }).limit(300).returns<PointLog[]>(),
      sb.from('addresses').select('*').order('created').returns<AddressRow[]>(),
      sb.from('orders').select('no,at,body,cancelled_at,confirmed_at').order('at', { ascending: false }).returns<OrderRow[]>(),
      sb.from('reviews').select('*').eq('uid', uid).order('t', { ascending: false }).returns<ReviewRow[]>(),
      sb.from('inquiries').select('*').eq('uid', uid).order('t', { ascending: false }).returns<InquiryRow[]>(),
    ]);
    if (p.error || !p.data) {
      snapshot = null;
      emit();
      return null;
    }
    const u = p.data;
    snapshot = {
      id: u.login_id, name: u.name, email: u.email, phone: u.phone, joined: u.joined, marketing: u.marketing, points: u.points,
      plog: pl.data ?? [], coupons: (cps.data ?? []).map(toCoupon), addrs: (ad.data ?? []).map(toAddress), orders: (od.data ?? []).map(toOrder),
      reviews: (rv.data ?? []).map(strip), qna: (qa.data ?? []).map(strip), recent: u.recent, usedCodes: u.used_codes,
    };
    emit();
    return snapshot;
  }

  /** Calls one of our SQL functions; their exceptions carry user-facing messages. */
  async function rpc<T>(fn: string, args: Record<string, unknown>, reload = true): Promise<Result<T>> {
    const { data, error } = await sb.rpc(fn, args);
    if (error) return fail(koreanError(error.message));
    if (reload) await load();
    return ok(data as T);
  }
  const needUser = <T,>(): Result<T> | null => (snapshot ? null : fail('로그인이 필요해요.'));
  const checkPassword = async (password: string) =>
    !!snapshot && !(await sb.auth.signInWithPassword({ email: authEmail(snapshot.id), password })).error;

  let recentTimer: ReturnType<typeof setTimeout> | undefined;
  const saveRecent = (list: number[]) => {
    local.set('bd_recent', list);
    if (!snapshot) return;
    snapshot = { ...snapshot, recent: list };
    emit();
    clearTimeout(recentTimer);
    recentTimer = setTimeout(() => void sb.rpc('set_recent', { p_recent: list }), 800);
  };

  sb.auth.onAuthStateChange((event, s) => {
    // Supabase recommends not awaiting client calls inside this callback.
    if (event === 'SIGNED_OUT' && snapshot) setTimeout(() => void load(), 0);
    if (event === 'SIGNED_IN' && s?.user.id !== uid) setTimeout(() => void load(), 0);
  });

  const guests = () => session.get<GuestCache>(GUEST, {});
  const remember = (o: GuestOrder, pw: string) => session.set(GUEST, { ...guests(), [o.no]: { o, pw } });

  const backend: Backend & { ready: Promise<void> } = {
    kind: 'supabase',
    ready: load().then(() => undefined, () => undefined),
    currentUser: () => snapshot,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    async signUp(i) {
      const [taken, emailTaken] = await Promise.all([
        sb.rpc('is_id_taken', { p_id: i.id }),
        sb.rpc('is_email_taken', { p_email: i.email }),
      ]);
      if (taken.error) return fail(koreanError(taken.error.message));
      if (taken.data) return fail('이미 쓰고 있는 아이디예요.');
      if (emailTaken.data) return fail('이미 가입된 이메일이에요. 아이디 찾기를 이용해 주세요.');
      setKeepLogin(false);
      const { error } = await sb.auth.signUp({
        email: authEmail(i.id),
        password: i.password,
        options: { data: { login_id: i.id.toLowerCase(), name: i.name, email: i.email, phone: i.phone, marketing: i.marketing } },
      });
      if (error) return fail(koreanError(error.message));
      const u = await load();
      if (!u) return fail('가입은 됐지만 로그인하지 못했어요. 로그인 화면에서 다시 시도해 주세요.');
      const rec = local.get<number[]>('bd_recent', []);
      if (rec.length) saveRecent(rec.slice(0, 40));
      return ok(u);
    },

    async signIn(id, password, keep) {
      setKeepLogin(keep);
      const { error } = await sb.auth.signInWithPassword({ email: authEmail(id), password });
      if (error) return fail(koreanError(error.message));
      const u = await load();
      if (!u) return fail('회원 정보를 불러오지 못했어요.');
      const rec = local.get<number[]>('bd_recent', []);
      const merged = [...new Set([...u.recent, ...rec])].slice(0, 40);
      if (merged.length !== u.recent.length) saveRecent(merged);
      return ok(snapshot ?? u);
    },
    async signOut() {
      await sb.auth.signOut({ scope: 'local' });
      uid = null;
      snapshot = null;
      emit();
    },
    async isIdTaken(id) {
      const { data } = await sb.rpc('is_id_taken', { p_id: id });
      return !!data;
    },
    async findId(name, email) {
      const { data, error } = await sb.rpc('find_login_id', { p_name: name, p_email: email });
      if (error) return fail(koreanError(error.message));
      return data ? ok(data as { id: string; joined: number }) : fail('입력한 정보와 일치하는 회원이 없어요.');
    },
    async verifyForReset(id, email) {
      const { data } = await sb.rpc('verify_reset', { p_id: id, p_email: email });
      return data ? ok(true) : fail('아이디와 이메일이 일치하는 회원이 없어요.');
    },
    async resetPassword(id, email, password) {
      const r = await rpc<null>('reset_password', { p_id: id, p_email: email, p_password: password }, false);
      return r.ok ? ok(true) : r;
    },
    async changePassword(current, next) {
      if (!(await checkPassword(current))) return fail('현재 비밀번호가 맞지 않아요.');
      const { error } = await sb.auth.updateUser({ password: next });
      return error ? fail(koreanError(error.message)) : ok(true);
    },
    async updateProfile(p) {
      const r = await rpc<null>('update_profile', { p_name: p.name, p_email: p.email, p_phone: p.phone, p_marketing: p.marketing });
      return r.ok ? ok(true) : r;
    },
    async withdraw(password) {
      if (!(await checkPassword(password))) return fail('비밀번호가 맞지 않아요.');
      const r = await rpc<null>('delete_account', {}, false);
      if (!r.ok) return r;
      await backend.signOut();
      return ok(true);
    },

    async saveAddress(a) {
      const no = needUser<Address>();
      if (no) return no;
      const row = { label: a.label, to_name: a.to, phone: a.phone, zip: a.zip, a1: a.a1, a2: a.a2, def: a.def || !snapshot!.addrs.length };
      if (row.def) await sb.from('addresses').update({ def: false }).eq('uid', uid!).eq('def', true);
      const q = a.id ? sb.from('addresses').update(row).eq('id', a.id) : sb.from('addresses').insert(row);
      const { data, error } = await q.select().single<AddressRow>();
      if (error || !data) return fail(koreanError(error?.message));
      await load();
      return ok(toAddress(data));
    },
    async removeAddress(id) {
      const wasDefault = snapshot?.addrs.find((a) => a.id === id)?.def;
      await sb.from('addresses').delete().eq('id', id);
      const rest = snapshot?.addrs.filter((a) => a.id !== id) ?? [];
      if (wasDefault && rest.length) await sb.from('addresses').update({ def: true }).eq('id', rest[0].id);
      await load();
    },
    async setDefaultAddress(id) {
      await sb.from('addresses').update({ def: false }).eq('uid', uid!).eq('def', true);
      await sb.from('addresses').update({ def: true }).eq('id', id);
      await load();
    },

    registerCouponCode: (code) => rpc<string>('register_coupon', { p_code: code }),

    async placeOrder(i) {
      const r = await rpc<OrderJson>('place_order', {
        p: { items: i.items, sub: i.sub, disc: i.disc, ship: i.ship, couponId: i.couponId, couponAmount: i.couponAmount, usePoints: i.usePoints, pay: i.pay, addr: i.addr, memo: i.memo },
      });
      return r.ok ? ok(fromJson<Order>(r.value)) : r;
    },
    async cancelOrder(no) {
      const r = await rpc<null>('cancel_order', { p_no: no });
      return r.ok ? ok(true) : r;
    },
    confirmOrder: (no) => rpc<number>('confirm_order', { p_no: no }),

    async writeReview({ orderNo, k, star, txt }) {
      const r = await rpc<null>('write_review', { p_no: orderNo, p_k: k, p_star: star, p_txt: txt });
      return r.ok ? ok(true) : r;
    },
    async deleteReview(id) {
      await sb.from('reviews').delete().eq('id', id);
      await load();
    },
    async reviewsFor(pid) {
      const { data } = await sb.from('reviews').select('*').eq('pid', pid).order('t', { ascending: false }).limit(200).returns<ReviewRow[]>();
      return (data ?? []).map((r): PublicReview => ({ ...strip(r), mine: r.uid === uid }));
    },

    async ask(q) {
      const r = await rpc<null>('ask', { p_pid: q.pid, p_cat: q.cat, p_title: q.title, p_body: q.body });
      return r.ok ? ok(true) : r;
    },
    async deleteInquiry(id) {
      await sb.from('inquiries').delete().eq('id', id);
      await load();
    },
    async inquiriesFor(pid) {
      const { data } = await sb.from('inquiries').select('*').eq('pid', pid).order('t', { ascending: false }).limit(200).returns<InquiryRow[]>();
      return (data ?? []).map((q): PublicInquiry => ({ ...strip(q), mine: q.uid === uid }));
    },

    addRecent(pid) {
      const base = snapshot?.recent ?? local.get<number[]>('bd_recent', []);
      saveRecent([pid, ...base.filter((x) => x !== pid)].slice(0, 40));
    },
    clearRecent() {
      saveRecent([]);
    },

    async placeGuestOrder(i) {
      const { password, ...sheet } = i;
      const r = await rpc<OrderJson & Pick<GuestOrder, 'buyer'>>('place_guest_order', { p: sheet, p_password: password }, false);
      if (!r.ok) return r;
      const o = fromJson<GuestOrder>(r.value);
      remember(o, password);
      return ok(o);
    },
    async lookupGuestOrder(no, password) {
      const r = await rpc<OrderJson & Pick<GuestOrder, 'buyer'>>('lookup_guest_order', { p_no: no, p_password: password }, false);
      if (!r.ok) return r;
      const o = fromJson<GuestOrder>(r.value);
      remember(o, password);
      return ok(o);
    },
    getGuestOrder(no) {
      return guests()[no]?.o ?? null;
    },
    async cancelGuestOrder(no) {
      const g = guests()[no];
      if (!g) return fail('주문을 찾을 수 없어요.');
      const r = await rpc<OrderJson & Pick<GuestOrder, 'buyer'>>('cancel_guest_order', { p_no: no, p_password: g.pw }, false);
      if (!r.ok) return r;
      remember(fromJson<GuestOrder>(r.value), g.pw);
      return ok(true);
    },
  };
  return backend;
}
