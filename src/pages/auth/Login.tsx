import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useBackend, useUser } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import { local, session } from '@/lib/storage';
import { CHECKOUT_KEY } from '@/components/CartDrawer';
import { usePageTitle } from '@/components/usePageTitle';
import { safeNext } from './safeNext';

const IconUser = () => <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>;
const IconLock = () => <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
const IconDoc = () => <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>;

/** Login with member / guest (non-member order lookup and purchase) tabs. */
export default function Login() {
  usePageTitle('로그인');
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next'));
  const [tab, setTab] = useState<'m' | 'g'>(sp.get('tab') === 'guest' ? 'g' : 'm');
  const user = useUser();
  if (user && tab === 'm') return <Navigate to={next ?? '/'} replace />;
  return (
    <main className="wrap" id="page">
      <div className="auth2">
        <h1 className="sr">로그인</h1>
        <div className="atabs" role="tablist">
          <button role="tab" aria-selected={tab === 'm'} onClick={() => setTab('m')}>회원</button>
          <button role="tab" aria-selected={tab === 'g'} onClick={() => setTab('g')}>비회원</button>
        </div>
        {tab === 'm' ? <MemberLogin next={next} /> : <GuestLookup canBuy={next === '/checkout' || !!session.get(CHECKOUT_KEY, null)} />}
      </div>
    </main>
  );
}

function MemberLogin({ next }: { next: string | null }) {
  const be = useBackend();
  const ui = useUI();
  const nav = useNavigate();
  const saved = local.get<string>('bd_saveid', '');
  const [id, setId] = useState(saved);
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [saveId, setSaveId] = useState(!!saved);
  const [keep, setKeep] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signupHref = `/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  return (
    <>
      <form noValidate onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        if (!id.trim()) return setErr('아이디를 입력해 주세요.');
        if (!pw) return setErr('비밀번호를 입력해 주세요.');
        setBusy(true);
        const r = await be.signIn(id, pw, keep);
        setBusy(false);
        if (!r.ok) {
          setPw('');
          return setErr(r.error);
        }
        if (saveId) local.set('bd_saveid', id.trim().toLowerCase());
        else local.remove('bd_saveid');
        ui.toast(`${r.value.name}님, 반가워요!`);
        nav(next ?? '/', { replace: true });
      }}>
        <div className="igroup">
          <label className="ifield"><IconUser /><input autoFocus={!saved} autoComplete="username" placeholder="아이디" aria-label="아이디" value={id} onChange={(e) => setId(e.target.value)} /></label>
          <label className="ifield"><IconLock /><input autoFocus={!!saved} type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="비밀번호" aria-label="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" className="showpw" onClick={() => setShow((s) => !s)}>{show ? '비밀번호 숨기기' : '비밀번호 표시'}</button>
          </label>
        </div>
        <div className="rowb" style={{ marginTop: 12 }}>
          <label className="ck"><input type="checkbox" checked={saveId} onChange={(e) => setSaveId(e.target.checked)} /> 아이디 저장</label>
          <label className="ck"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> 로그인 상태 유지</label>
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn primary xl wide" disabled={busy}>{busy ? '로그인 중…' : '로그인'}</button>
      </form>
      <div className="alinks"><Link to="/find/id">아이디 찾기</Link><Link to="/find/pw">비밀번호 재설정</Link><Link to={signupHref}>회원가입</Link></div>
      <div className="abanner"><b>처음 오셨나요?</b> 지금 가입하면 <b className="acc">15% 할인 쿠폰 + 적립금 3,000원</b>을 바로 드려요 <Link to={signupHref}>가입하기 ›</Link></div>
    </>
  );
}

function GuestLookup({ canBuy }: { canBuy: boolean }) {
  const be = useBackend();
  const nav = useNavigate();
  const [no, setNo] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <form noValidate onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        const r = await be.lookupGuestOrder(no.trim(), pw);
        if (!r.ok) return setErr(r.error);
        nav(`/guest-orders/${r.value.no}`);
      }}>
        <div className="igroup">
          <label className="ifield"><IconDoc /><input inputMode="numeric" maxLength={14} placeholder="주문번호 (예: 261119-1234567)" aria-label="주문번호" value={no}
            onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 13); setNo(d.length > 6 ? `${d.slice(0, 6)}-${d.slice(6)}` : d); }} /></label>
          <label className="ifield"><IconLock /><input type="password" inputMode="numeric" maxLength={4} placeholder="주문 비밀번호 (숫자 4자리)" aria-label="주문 비밀번호" value={pw} onChange={(e) => setPw(e.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn primary xl wide">비회원 주문조회</button>
      </form>
      <p className="hint" style={{ textAlign: 'center', marginTop: 10 }}>주문번호는 주문 완료 화면에서 확인할 수 있어요.</p>
      {canBuy && (
        <>
          <div className="or">아직 주문 전이신가요?</div>
          <button className="btn xl wide" onClick={() => nav('/checkout/guest')}>비회원으로 구매하기</button>
          <p className="hint" style={{ textAlign: 'center' }}>비회원은 쿠폰·적립금 혜택을 받을 수 없어요.</p>
        </>
      )}
    </>
  );
}
