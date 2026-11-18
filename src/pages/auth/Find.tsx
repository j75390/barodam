import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fmtDate } from '@/lib/format';
import { isPasswordOk } from '@/lib/validators';
import { useBackend } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import { usePageTitle } from '@/components/usePageTitle';

/** 아이디 찾기 / 비밀번호 재설정 */
export default function Find() {
  const { tab = 'id' } = useParams();
  const isPw = tab === 'pw';
  usePageTitle(isPw ? '비밀번호 재설정' : '아이디 찾기');
  const nav = useNavigate();
  return (
    <main className="wrap" id="page">
      <div className="auth">
        <h1 className="ptitle">{isPw ? '비밀번호 재설정' : '아이디 찾기'}</h1>
        <div className="ptabs" role="tablist">
          <button role="tab" aria-selected={!isPw} onClick={() => nav('/find/id')}>아이디 찾기</button>
          <button role="tab" aria-selected={isPw} onClick={() => nav('/find/pw')}>비밀번호 재설정</button>
        </div>
        {isPw ? <ResetPassword key="pw" /> : <FindId key="id" />}
        <div className="auth-links"><Link className="lnk" to="/login">로그인</Link><Link className="lnk" to="/signup">회원가입</Link></div>
      </div>
    </main>
  );
}

function FindId() {
  const be = useBackend();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [found, setFound] = useState<{ id: string; joined: number } | null>(null);
  return (
    <form noValidate onSubmit={async (e) => {
      e.preventDefault();
      setErr(null);
      setFound(null);
      const r = await be.findId(name.trim(), email.trim());
      if (r.ok) setFound(r.value);
      else setErr(r.error);
    }}>
      <label className="fld"><span>이름</span><input className="inp" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="fld"><span>가입한 이메일</span><input className="inp" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      {found && <div className="note" style={{ fontSize: 14 }}>가입한 아이디는 <b className="num">{found.id}</b> 예요. (가입일 {fmtDate(found.joined)})</div>}
      <button className="btn primary wide">아이디 찾기</button>
    </form>
  );
}

function ResetPassword() {
  const be = useBackend();
  const ui = useUI();
  const nav = useNavigate();
  const [step, setStep] = useState<'verify' | 'set'>('verify');
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  if (step === 'verify') {
    return (
      <form noValidate onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        const r = await be.verifyForReset(id.trim(), email.trim());
        if (r.ok) setStep('set');
        else setErr(r.error);
      }}>
        <label className="fld"><span>아이디</span><input className="inp" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} /></label>
        <label className="fld"><span>가입한 이메일</span><input className="inp" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn primary wide">본인 확인</button>
      </form>
    );
  }
  return (
    <form noValidate onSubmit={async (e) => {
      e.preventDefault();
      setErr(null);
      if (!isPasswordOk(pw)) return setErr('영문과 숫자를 섞어 8~20자로 만들어 주세요.');
      if (pw !== pw2) return setErr('비밀번호 확인이 맞지 않아요.');
      const r = await be.resetPassword(id.trim(), email.trim(), pw);
      if (!r.ok) return setErr(r.error);
      ui.toast('비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요');
      nav('/login');
    }}>
      <h2 style={{ fontSize: 17, margin: '16px 0 0' }}>새 비밀번호</h2>
      <label className="fld"><span>새 비밀번호</span><input className="inp" type="password" autoComplete="new-password" maxLength={20} placeholder="영문+숫자 8~20자" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      <label className="fld"><span>새 비밀번호 확인</span><input className="inp" type="password" autoComplete="new-password" maxLength={20} value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn primary wide">비밀번호 바꾸기</button>
    </form>
  );
}
