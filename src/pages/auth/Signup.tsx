import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import type { User } from '@/types';
import { TERMS } from '@/data/info';
import { formatPhone, won } from '@/lib/format';
import { checkPassword, EMAIL_RE, ID_RE, isPasswordOk, PHONE_RE } from '@/lib/validators';
import { useBackend, useUser } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import { CouponTicket } from '@/components/CouponTicket';
import { usePageTitle } from '@/components/usePageTitle';
import { safeNext } from './safeNext';

const TERM_ROWS: [keyof typeof TERMS, string, boolean][] = [
  ['tos', '[필수] 이용약관 동의', true],
  ['privacy', '[필수] 개인정보 수집·이용 동의', true],
  ['age', '[필수] 만 14세 이상입니다', true],
  ['mkt', '[선택] 마케팅 정보 수신 (+2,000원)', false],
];

export default function Signup() {
  usePageTitle('회원가입');
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next'));
  const user = useUser();
  const [joined, setJoined] = useState<User | null>(null);
  // Signing up also signs in, and the session change re-renders synchronously (before any state update lands).
  // A ref is read directly at render time, so the "already a member" redirect is skipped while joining.
  const joining = useRef(false);
  if (joined) return <Welcome user={joined} next={next} />;
  if (user && !joining.current) return <Navigate to="/mypage" replace />;
  return <SignupForm next={next} onStart={() => (joining.current = true)} onFail={() => (joining.current = false)} onDone={setJoined} />;
}

function SignupForm({ next, onStart, onFail, onDone }: { next: string | null; onStart: () => void; onFail: () => void; onDone: (u: User) => void }) {
  const be = useBackend();
  const ui = useUI();
  const [v, setV] = useState({ id: '', pw: '', pw2: '', name: '', email: '', phone: '' });
  const [checkedId, setCheckedId] = useState('');
  const [idHint, setIdHint] = useState<[string, boolean | null]>(['영문 소문자·숫자 4~16자', null]);
  const [agree, setAgree] = useState<Record<string, boolean>>({ tos: false, privacy: false, age: false, mkt: false });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v, val: string) => setV((x) => ({ ...x, [k]: val }));
  const rule = checkPassword(v.pw);
  const hintCls = (ok: boolean | null) => `hint${ok === true ? ' ok' : ok === false ? ' bad' : ''}`;

  const checkId = async (): Promise<boolean> => {
    if (!ID_RE.test(v.id)) {
      setIdHint(['영문 소문자로 시작하는 4~16자로 입력해 주세요', false]);
      return false;
    }
    if (await be.isIdTaken(v.id)) {
      setIdHint(['이미 쓰고 있는 아이디예요', false]);
      setCheckedId('');
      return false;
    }
    setCheckedId(v.id);
    setIdHint(['쓸 수 있는 아이디예요', true]);
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bad = (m: string) => { setErr(m); return; };
    setErr(null);
    if (!ID_RE.test(v.id)) return bad('아이디를 영문 소문자로 시작하는 4~16자로 입력해 주세요.');
    if (checkedId !== v.id && !(await checkId())) return bad('아이디 중복확인을 해 주세요.');
    if (!isPasswordOk(v.pw)) return bad('비밀번호는 영문과 숫자를 섞어 8~20자로 만들어 주세요.');
    if (v.pw.includes(v.id)) return bad('비밀번호에 아이디를 넣을 수 없어요.');
    if (v.pw !== v.pw2) return bad('비밀번호 확인이 맞지 않아요.');
    if (v.name.trim().length < 2) return bad('이름을 2자 이상 입력해 주세요.');
    if (!EMAIL_RE.test(v.email.trim())) return bad('이메일 형식이 맞지 않아요.');
    if (!PHONE_RE.test(v.phone)) return bad('휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.');
    if (!(agree.tos && agree.privacy && agree.age)) return bad('필수 약관에 모두 동의해 주세요.');
    setBusy(true);
    onStart();
    const r = await be.signUp({ id: v.id, password: v.pw, name: v.name.trim(), email: v.email.trim(), phone: v.phone, marketing: agree.mkt });
    setBusy(false);
    if (!r.ok) {
      onFail();
      return bad(r.error);
    }
    onDone(r.value);
  };

  const allOn = Object.values(agree).every(Boolean);
  return (
    <main className="wrap" id="page">
      <div className="auth">
        <h1 className="ptitle">회원가입</h1>
        <div className="note" style={{ margin: '0 0 4px' }}>가입하면 <b>15% 할인 쿠폰 + 무료배송 쿠폰 + 적립금 3,000원</b>을 바로 드려요.</div>
        <form noValidate onSubmit={submit}>
          <label className="fld"><span>아이디</span>
            <div className="with">
              <input className="inp" autoComplete="username" placeholder="영문 소문자로 시작, 4~16자" maxLength={16} value={v.id}
                onChange={(e) => { set('id', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')); setCheckedId(''); setIdHint(['영문 소문자·숫자 4~16자, 중복확인을 눌러 주세요', null]); }} />
              <button type="button" className="btn ghost" onClick={() => void checkId()}>중복확인</button>
            </div>
            <small className={hintCls(idHint[1])}>{idHint[0]}</small>
          </label>
          <label className="fld"><span>비밀번호</span>
            <input className="inp" type="password" autoComplete="new-password" placeholder="영문+숫자 8~20자" maxLength={20} value={v.pw} onChange={(e) => set('pw', e.target.value)} />
            <small className={hintCls(v.pw ? rule.len && rule.mix && rule.noSpace : null)}>
              {v.pw ? `${rule.len ? '✓' : '✗'} 8~20자  ${rule.mix ? '✓' : '✗'} 영문+숫자  ${rule.noSpace ? '✓' : '✗'} 공백 없음` : '영문과 숫자를 섞어 8~20자'}
            </small>
          </label>
          <label className="fld"><span>비밀번호 확인</span>
            <input className="inp" type="password" autoComplete="new-password" maxLength={20} value={v.pw2} onChange={(e) => set('pw2', e.target.value)} />
            {v.pw2 && <small className={hintCls(v.pw === v.pw2)}>{v.pw === v.pw2 ? '비밀번호가 같아요' : '비밀번호가 달라요'}</small>}
          </label>
          <label className="fld"><span>이름</span><input className="inp" autoComplete="name" maxLength={20} value={v.name} onChange={(e) => set('name', e.target.value)} /></label>
          <label className="fld"><span>이메일</span><input className="inp" type="email" autoComplete="email" placeholder="example@example.com" value={v.email} onChange={(e) => set('email', e.target.value)} /></label>
          <label className="fld"><span>휴대폰 번호</span><input className="inp num" inputMode="numeric" autoComplete="tel" placeholder="010-0000-0000" value={v.phone} onChange={(e) => set('phone', formatPhone(e.target.value))} /></label>
          <div className="terms">
            <label className="ck all"><input type="checkbox" checked={allOn} onChange={(e) => setAgree({ tos: e.target.checked, privacy: e.target.checked, age: e.target.checked, mkt: e.target.checked })} /> 전체 동의 (선택 항목 포함)</label>
            {TERM_ROWS.map(([k, label]) => (
              <div className="t" key={k}>
                <label className="ck"><input type="checkbox" checked={agree[k]} onChange={(e) => setAgree((a) => ({ ...a, [k]: e.target.checked }))} /> {label}</label>
                <button type="button" className="lnk" onClick={() => void ui.info(TERMS[k][0], <p style={{ whiteSpace: 'pre-line' }}>{TERMS[k][1]}</p>)}>보기</button>
              </div>
            ))}
          </div>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn primary wide" disabled={busy}>{busy ? '가입하는 중…' : '가입하기'}</button>
        </form>
        <div className="auth-links"><span className="hint">이미 회원이세요?</span><Link className="lnk" to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>로그인</Link></div>
      </div>
    </main>
  );
}

function Welcome({ user, next }: { user: User; next: string | null }) {
  const nav = useNavigate();
  return (
    <main className="wrap" id="page">
      <div className="auth">
        <div className="done">
          <div className="ok">✓</div>
          <h1 className="ptitle" style={{ margin: 0 }}>가입을 환영해요!</h1>
          <p className="rate" style={{ fontSize: 14 }}>{user.name}님께 가입 혜택을 드렸어요.</p>
          <div style={{ width: '100%', textAlign: 'left' }}>
            {user.coupons.map((c) => <CouponTicket key={c.id} c={c} />)}
            <div className="addr"><div className="t">적립금</div><div className="num" style={{ fontSize: 18, fontWeight: 800 }}>{won(user.points)}</div></div>
          </div>
          <button className="btn primary wide" onClick={() => nav(next ?? '/')}>{next ? '하던 일 계속하기' : '쇼핑 시작하기'}</button>
          <Link className="lnk" to="/mypage">마이페이지 보기</Link>
        </div>
      </div>
    </main>
  );
}
