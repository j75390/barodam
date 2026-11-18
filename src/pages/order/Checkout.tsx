import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import type { Address, PayMethod, Payment } from '@/types';
import { couponAmount, clampPoints, earnRate, lineTotals } from '@/domain/pricing';
import { arrivalText } from '@/domain/delivery';
import { won } from '@/lib/format';
import { session } from '@/lib/storage';
import { cart } from '@/state/cart';
import { useBackend, useUser } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import { CHECKOUT_KEY } from '@/components/CartDrawer';
import { AddressCard, PayRows, openAddressForm } from '@/components/orderParts';
import { ProductImage } from '@/components/ProductImage';
import { usePageTitle } from '@/components/usePageTitle';
import { BANKS, CARDS, MEMOS, PAY_METHODS, toOrderItems, useCheckoutLines, virtualAccount } from './useCheckoutLines';

export default function Checkout() {
  usePageTitle('주문서');
  const user = useUser();
  const be = useBackend();
  const ui = useUI();
  const nav = useNavigate();
  const { draft, lines } = useCheckoutLines();
  const [addrId, setAddrId] = useState<string | null>(null);
  const [memo, setMemo] = useState(MEMOS[0]);
  const [memoCustom, setMemoCustom] = useState('');
  const [couponId, setCouponId] = useState('');
  const [ptsInput, setPtsInput] = useState('0');
  const [pts, setPts] = useState(0);
  const [pay, setPay] = useState<PayMethod>('card');
  const [cardCo, setCardCo] = useState(CARDS[0]);
  const [inst, setInst] = useState('일시불');
  const [bank, setBank] = useState(BANKS[0]);
  const [tel, setTel] = useState('SKT');
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/login?next=/checkout" replace />;
  if (!lines.length) {
    return (
      <main className="wrap" id="page">
        <div className="crumb"><Link to="/">홈</Link> › 주문서</div>
        <div className="empty-box">주문할 상품이 없어요<br /><Link className="lnk" to="/">쇼핑하러 가기</Link></div>
      </main>
    );
  }

  const { sub, disc, ship } = lineTotals(lines);
  const addr: Address | undefined = user.addrs.find((a) => a.id === addrId) ?? user.addrs.find((a) => a.def) ?? user.addrs[0];
  const coupons = user.coupons.filter((c) => !c.used && c.exp > Date.now());
  const coupon = coupons.find((c) => c.id === couponId) ?? null;
  const cpAmt = Math.max(0, couponAmount(coupon, lines, ship));
  const usePts = Math.min(pts, Math.max(0, sub + ship - cpAmt));
  const total = sub - cpAmt - usePts + ship;
  const earn = Math.floor(total * earnRate(pay));

  const changeAddress = async () => {
    if (!user.addrs.length) {
      const a = await openAddressForm(ui, be, user);
      if (a) setAddrId(a.id);
      return;
    }
    let picked = addr?.id ?? null;
    const okPicked = await ui.open({
      title: '배송지 선택',
      render: (close) => (
        <>
          <h3>배송지 선택</h3>
          <div className="radios" style={{ marginTop: 10 }}>
            {user.addrs.map((a) => (
              <label className="rcard" key={a.id}>
                <input type="radio" name="ad" defaultChecked={a.id === addr?.id} onChange={() => (picked = a.id)} />
                <div><b>{a.label || a.to}</b>{a.def && <span className="def" style={{ fontSize: 11, color: 'var(--ship)' }}> 기본</span>}<div className="x">{a.to} · {a.phone}<br />({a.zip}) {a.a1} {a.a2}</div></div>
              </label>
            ))}
          </div>
          <button className="lnk" style={{ marginTop: 10 }} onClick={() => { close(false); void openAddressForm(ui, be, user).then((a) => a && setAddrId(a.id)); }}>+ 새 배송지 추가</button>
          <div className="ctas"><button className="btn" onClick={() => close(false)}>취소</button><button className="btn primary" onClick={() => close(true)}>이 주소로 배송</button></div>
        </>
      ),
    });
    if (okPicked && picked) setAddrId(picked);
  };

  const submit = async () => {
    setErr(null);
    if (!addr) return setErr('배송지를 추가해 주세요.');
    if (!agree) return setErr('구매 진행 동의에 체크해 주세요.');
    const short = lines.find((l) => l.qty > l.p.stock);
    if (short) return setErr(`'${short.p.name}' 재고가 부족해요.`);
    const payment: Payment = { m: pay, d: pay === 'card' ? `${cardCo} · ${inst}` : pay === 'bank' ? bank : pay === 'phone' ? tel : '' };
    if (pay === 'bank') payment.acct = virtualAccount(bank);
    setBusy(true);
    ui.open({ title: '결제 중', render: () => <div className="done" style={{ padding: 20 }}><div className="spin" /><b>결제하고 있어요</b><p>창을 닫지 말고 잠시만 기다려 주세요</p></div> });
    await new Promise((r) => setTimeout(r, 1200));
    const r = await be.placeOrder({
      items: toOrderItems(lines), sub, disc, ship, couponId: coupon && cpAmt > 0 ? coupon.id : null, couponAmount: cpAmt, usePoints: usePts,
      pay: payment, addr: { label: addr.label, to: addr.to, phone: addr.phone, zip: addr.zip, a1: addr.a1, a2: addr.a2 },
      memo: memo === '__' ? memoCustom.trim() : memo,
    });
    ui.close();
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    if (draft?.src === 'cart') cart.remove(lines.map((l) => l.key));
    session.remove(CHECKOUT_KEY);
    nav(`/orders/complete/${r.value.no}`, { replace: true });
  };

  return (
    <main className="wrap" id="page">
      <div className="crumb"><Link to="/">홈</Link> › 장바구니 › 주문서</div>
      <h1 className="ptitle">주문서</h1>
      <div className="co">
        <div>
          <div className="box"><h3>주문자</h3><div className="kv"><dt>이름</dt><dd>{user.name}</dd><dt>연락처</dt><dd className="num">{user.phone}</dd><dt>이메일</dt><dd>{user.email}</dd></div></div>
          <div className="box">
            <h3 className="rowb" style={{ margin: '0 0 10px' }}>배송지 <button className="btn sm ghost" onClick={changeAddress}>{user.addrs.length ? '변경' : '추가'}</button></h3>
            {addr ? <AddressCard a={addr} /> : <div className="empty-box" style={{ padding: 20 }}>배송지를 추가해 주세요</div>}
            <label className="fld"><span>배송 요청사항</span>
              <select className="inp" value={memo} onChange={(e) => setMemo(e.target.value)}>{MEMOS.map((m) => <option key={m}>{m}</option>)}<option value="__">직접 입력</option></select>
            </label>
            {memo === '__' && <input className="inp" placeholder="요청사항을 적어 주세요 (50자)" maxLength={50} style={{ marginTop: 6 }} value={memoCustom} onChange={(e) => setMemoCustom(e.target.value)} aria-label="배송 요청사항 직접 입력" />}
          </div>
          <div className="box">
            <h3>주문 상품 <span className="hint num">{lines.length}개</span></h3>
            {lines.map((l) => (
              <div className="coline" key={l.key}>
                <div className="pic"><ProductImage photo={l.p.photo} /></div>
                <div><div style={{ fontWeight: 600 }}>{l.p.name}</div><div className="hint num">{[l.color, l.size && `사이즈 ${l.size}`].filter(Boolean).join(' · ') || '기본'} · {l.qty}개 · {arrivalText(l.p)}</div></div>
                <div className="num" style={{ fontWeight: 800 }}>{won(l.p.price * l.qty)}</div>
              </div>
            ))}
          </div>
          <div className="box">
            <h3>할인</h3>
            <label className="fld" style={{ marginTop: 0 }}><span>쿠폰 <span className="hint num">사용 가능 {coupons.filter((c) => couponAmount(c, lines, ship) > 0).length}장</span></span>
              <select className="inp" value={couponId} onChange={(e) => setCouponId(e.target.value)}>
                <option value="">쿠폰 선택 안 함</option>
                {coupons.map((c) => { const a = couponAmount(c, lines, ship); const why = c.type === 'ship' && a === 0 ? '(이미 무료배송)' : '(조건 미달)'; return <option key={c.id} value={c.id} disabled={a <= 0}>{c.name} {a > 0 ? `(−${won(a)})` : why}</option>; })}
              </select>
            </label>
            <label className="fld"><span>적립금 <span className="hint num">보유 {won(user.points)}</span></span>
              <div className="with">
                <input className="inp num" inputMode="numeric" value={ptsInput} onChange={(e) => setPtsInput(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => { const v = Number(ptsInput) || 0; if (v && v < 1000) ui.toast('적립금은 1,000원부터 쓸 수 있어요'); const c = clampPoints(v, user.points, sub + ship - cpAmt); setPts(c); setPtsInput(String(c)); }} />
                <button type="button" className="btn ghost" onClick={() => { const c = clampPoints(user.points, user.points, sub + ship - cpAmt); if (!c) ui.toast('적립금은 1,000원부터 쓸 수 있어요'); setPts(c); setPtsInput(String(c)); }}>모두 사용</button>
              </div>
              <small className="hint">1,000원 이상부터 10원 단위로 쓸 수 있어요</small>
            </label>
          </div>
          <div className="box">
            <h3>결제 수단</h3>
            <div className="pays">{PAY_METHODS.map(([k, l]) => <label key={k}><input type="radio" name="pay" checked={pay === k} onChange={() => setPay(k as PayMethod)} />{l}</label>)}</div>
            <div style={{ marginTop: 10 }}>
              {pay === 'card' && (
                <div className="grid2">
                  <label className="fld" style={{ margin: 0 }}><span>카드사</span><select className="inp" value={cardCo} onChange={(e) => setCardCo(e.target.value)}>{CARDS.map((c) => <option key={c}>{c}</option>)}</select></label>
                  <label className="fld" style={{ margin: 0 }}><span>할부</span><select className="inp" value={inst} onChange={(e) => setInst(e.target.value)}>{['일시불', '2개월 (무이자)', '3개월 (무이자)', '6개월'].map((x) => <option key={x}>{x}</option>)}</select></label>
                </div>
              )}
              {pay === 'bank' && <><label className="fld" style={{ margin: 0 }}><span>입금 은행</span><select className="inp" value={bank} onChange={(e) => setBank(e.target.value)}>{BANKS.map((b) => <option key={b}>{b}</option>)}</select></label><p className="hint">주문 후 가상계좌가 발급돼요. 다음 날 자정까지 입금해 주세요.</p></>}
              {pay === 'baro' && <p className="hint">바로페이로 결제하면 0.5% 추가 적립돼요</p>}
              {pay === 'phone' && <label className="fld" style={{ margin: 0 }}><span>통신사</span><select className="inp" value={tel} onChange={(e) => setTel(e.target.value)}>{['SKT', 'KT', 'LG U+', '알뜰폰'].map((t) => <option key={t}>{t}</option>)}</select></label>}
            </div>
            <div className="note">무이자 할부는 5만원 이상 결제 시 적용돼요. 무통장 입금은 주문 다음 날 자정까지 입금해 주세요.</div>
          </div>
        </div>
        <div className="side">
          <div className="box paysum">
            <h3>결제 금액</h3>
            <PayRows o={{ sub, disc, cpAmt, cp: coupon?.name ?? null, usePts, ship, total }} />
            <div className="sum"><span>구매확정 시 적립</span><span className="num plus">+{won(earn)}</span></div>
            <label className="ck" style={{ marginTop: 14, alignItems: 'flex-start' }}><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> <span>주문 상품, 가격, 배송 정보를 확인했으며 구매 진행에 동의해요 (필수)</span></label>
            {err && <p className="err" role="alert">{err}</p>}
            <button className="btn primary wide" disabled={busy} onClick={submit}>{won(total)} 결제하기</button>
          </div>
        </div>
      </div>
    </main>
  );
}
