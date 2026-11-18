import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import type { PayMethod, Payment } from '@/types';
import { TERMS } from '@/data/info';
import { lineTotals } from '@/domain/pricing';
import { formatPhone, won } from '@/lib/format';
import { EMAIL_RE, PHONE_RE, ZIP_RE } from '@/lib/validators';
import { session } from '@/lib/storage';
import { cart } from '@/state/cart';
import { useBackend, useUser } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import { CHECKOUT_KEY } from '@/components/CartDrawer';
import { PayRows } from '@/components/orderParts';
import { ProductImage } from '@/components/ProductImage';
import { usePageTitle } from '@/components/usePageTitle';
import { BANKS, MEMOS, PAY_METHODS, toOrderItems, useCheckoutLines, virtualAccount } from './useCheckoutLines';

/** Non-member checkout: buyer + shipping info and a 4-digit order password for later lookup. */
export default function GuestCheckout() {
  usePageTitle('비회원 주문서');
  const user = useUser();
  const be = useBackend();
  const ui = useUI();
  const nav = useNavigate();
  const { draft, lines } = useCheckoutLines();
  const [v, setV] = useState({ nm: '', ph: '', em: '', to: '', tph: '', zip: '', a1: '', a2: '', opw: '', opw2: '' });
  const [same, setSame] = useState(true);
  const [memo, setMemo] = useState(MEMOS[0]);
  const [pay, setPay] = useState<PayMethod>('card');
  const [ag1, setAg1] = useState(false);
  const [ag2, setAg2] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/checkout" replace />;
  if (!lines.length) {
    return <main className="wrap" id="page"><div className="empty-box">주문할 상품이 없어요<br /><Link className="lnk" to="/">쇼핑하러 가기</Link></div></main>;
  }
  const { sub, disc, ship } = lineTotals(lines);
  const set = (k: keyof typeof v, val: string) => setV((x) => {
    const n = { ...x, [k]: val };
    if (same && (k === 'nm' || k === 'ph')) {
      n.to = n.nm;
      n.tph = n.ph;
    }
    return n;
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const to = same ? v.nm : v.to, tph = same ? v.ph : v.tph;
    const m = v.nm.trim().length < 2 ? '주문자 이름을 입력해 주세요.' : !PHONE_RE.test(v.ph) ? '휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.' : !EMAIL_RE.test(v.em.trim()) ? '이메일 형식이 맞지 않아요.'
      : to.trim().length < 2 ? '받는 분 이름을 입력해 주세요.' : !PHONE_RE.test(tph) ? '받는 분 연락처를 확인해 주세요.' : !ZIP_RE.test(v.zip) ? '우편번호 5자리를 입력해 주세요.' : v.a1.trim().length < 5 ? '주소를 입력해 주세요.' : !v.a2.trim() ? '상세 주소를 입력해 주세요.'
      : !/^\d{4}$/.test(v.opw) ? '주문 비밀번호를 숫자 4자리로 정해 주세요.' : v.opw !== v.opw2 ? '주문 비밀번호 확인이 맞지 않아요.' : !(ag1 && ag2) ? '필수 항목에 동의해 주세요.' : null;
    if (m) return setErr(m);
    const payment: Payment = { m: pay, d: '' };
    if (pay === 'bank') payment.acct = virtualAccount(BANKS[0]);
    setBusy(true);
    ui.open({ title: '결제 중', render: () => <div className="done" style={{ padding: 20 }}><div className="spin" /><b>결제하고 있어요</b><p>창을 닫지 말고 잠시만 기다려 주세요</p></div> });
    await new Promise((r) => setTimeout(r, 1200));
    const r = await be.placeGuestOrder({
      items: toOrderItems(lines), sub, disc, ship, pay: payment, memo,
      addr: { to: to.trim(), phone: tph, zip: v.zip, a1: v.a1.trim(), a2: v.a2.trim() },
      buyer: { name: v.nm.trim(), phone: v.ph, email: v.em.trim() }, password: v.opw,
    });
    ui.close();
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    if (draft?.src === 'cart') cart.remove(lines.map((l) => l.key));
    session.remove(CHECKOUT_KEY);
    nav(`/guest-orders/${r.value.no}?done=1`, { replace: true });
  };
  return (
    <main className="wrap" id="page">
      <div className="crumb"><Link to="/">홈</Link> › 비회원 주문서</div>
      <h1 className="ptitle">비회원 주문서</h1>
      <div className="note" style={{ margin: '0 0 12px' }}>회원으로 주문하면 <b>15% 쿠폰과 적립금</b>을 받을 수 있어요. <Link className="lnk" to="/login?next=/checkout">로그인</Link> · <Link className="lnk" to="/signup?next=/checkout">회원가입</Link></div>
      <form noValidate onSubmit={submit}>
        <div className="co">
          <div>
            <div className="box">
              <h3>주문자</h3>
              <div className="grid2">
                <label className="fld"><span>이름</span><input className="inp" autoComplete="name" maxLength={20} value={v.nm} onChange={(e) => set('nm', e.target.value)} /></label>
                <label className="fld"><span>휴대폰 번호</span><input className="inp num" inputMode="numeric" autoComplete="tel" placeholder="010-0000-0000" value={v.ph} onChange={(e) => set('ph', formatPhone(e.target.value))} /></label>
              </div>
              <label className="fld"><span>이메일 (주문 안내용)</span><input className="inp" type="email" autoComplete="email" value={v.em} onChange={(e) => set('em', e.target.value)} /></label>
            </div>
            <div className="box">
              <h3 className="rowb" style={{ margin: 0 }}>배송지 <label className="ck" style={{ fontWeight: 400 }}><input type="checkbox" checked={same} onChange={(e) => { setSame(e.target.checked); if (e.target.checked) setV((x) => ({ ...x, to: x.nm, tph: x.ph })); }} /> 주문자와 같아요</label></h3>
              <div className="grid2">
                <label className="fld"><span>받는 분</span><input className="inp" maxLength={20} value={same ? v.nm : v.to} disabled={same} onChange={(e) => set('to', e.target.value)} /></label>
                <label className="fld"><span>연락처</span><input className="inp num" inputMode="numeric" value={same ? v.ph : v.tph} disabled={same} onChange={(e) => set('tph', formatPhone(e.target.value))} /></label>
              </div>
              <label className="fld"><span>우편번호</span><input className="inp num" inputMode="numeric" maxLength={5} placeholder="5자리" value={v.zip} onChange={(e) => set('zip', e.target.value.replace(/\D/g, ''))} /></label>
              <label className="fld"><span>주소</span><input className="inp" autoComplete="address-line1" placeholder="도로명 주소" value={v.a1} onChange={(e) => set('a1', e.target.value)} /></label>
              <label className="fld"><span>상세 주소</span><input className="inp" autoComplete="address-line2" placeholder="동·호수" value={v.a2} onChange={(e) => set('a2', e.target.value)} /></label>
              <label className="fld"><span>배송 요청사항</span><select className="inp" value={memo} onChange={(e) => setMemo(e.target.value)}>{MEMOS.map((m) => <option key={m}>{m}</option>)}</select></label>
            </div>
            <div className="box">
              <h3>주문 상품 <span className="hint num">{lines.length}개</span></h3>
              {lines.map((l) => (
                <div className="coline" key={l.key}>
                  <div className="pic"><ProductImage photo={l.p.photo} /></div>
                  <div><div style={{ fontWeight: 600 }}>{l.p.name}</div><div className="hint num">{[l.color, l.size && `사이즈 ${l.size}`].filter(Boolean).join(' · ') || '기본'} · {l.qty}개</div></div>
                  <div className="num" style={{ fontWeight: 800 }}>{won(l.p.price * l.qty)}</div>
                </div>
              ))}
            </div>
            <div className="box"><h3>결제 수단</h3><div className="pays">{PAY_METHODS.map(([k, l]) => <label key={k}><input type="radio" name="pay" checked={pay === k} onChange={() => setPay(k as PayMethod)} />{l}</label>)}</div></div>
            <div className="box">
              <h3>주문 비밀번호</h3>
              <p className="hint" style={{ margin: 0 }}>비회원 주문조회에 쓰여요. 숫자 4자리로 정해 주세요.</p>
              <div className="grid2">
                <label className="fld"><span>비밀번호</span><input className="inp num" type="password" inputMode="numeric" maxLength={4} autoComplete="new-password" value={v.opw} onChange={(e) => set('opw', e.target.value.replace(/\D/g, ''))} /></label>
                <label className="fld"><span>비밀번호 확인</span><input className="inp num" type="password" inputMode="numeric" maxLength={4} autoComplete="new-password" value={v.opw2} onChange={(e) => set('opw2', e.target.value.replace(/\D/g, ''))} /></label>
              </div>
            </div>
          </div>
          <div className="side">
            <div className="box paysum">
              <h3>결제 금액</h3>
              <PayRows o={{ sub, disc, cpAmt: 0, cp: null, usePts: 0, ship, total: sub + ship }} />
              <label className="ck" style={{ marginTop: 14, alignItems: 'flex-start' }}><input type="checkbox" checked={ag1} onChange={(e) => setAg1(e.target.checked)} /> <span>[필수] 비회원 구매를 위한 개인정보 수집·이용에 동의해요 <button type="button" className="lnk" onClick={() => void ui.info(TERMS.privacy[0], <p style={{ whiteSpace: 'pre-line' }}>{TERMS.privacy[1]}</p>)}>보기</button></span></label>
              <label className="ck" style={{ marginTop: 8, alignItems: 'flex-start' }}><input type="checkbox" checked={ag2} onChange={(e) => setAg2(e.target.checked)} /> <span>[필수] 주문 상품, 가격, 배송 정보를 확인했어요</span></label>
              {err && <p className="err" role="alert">{err}</p>}
              <button className="btn primary wide" disabled={busy}>{won(sub + ship)} 결제하기</button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
