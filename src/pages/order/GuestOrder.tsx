import { useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { orderState, canCancel } from '@/domain/orderState';
import { optionText, payName } from '@/domain/orderText';
import { fmtDate, fmtDateTime, won } from '@/lib/format';
import { useBackend } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import { ItemImage, OrderSteps, PayRows, TrackList, stateClass } from '@/components/orderParts';
import { usePageTitle } from '@/components/usePageTitle';

/** Guest order view; only reachable after checkout or a successful number + password lookup in this tab. */
export default function GuestOrder() {
  usePageTitle('비회원 주문조회');
  const { no = '' } = useParams();
  const [sp] = useSearchParams();
  const be = useBackend();
  const ui = useUI();
  const [, refresh] = useState(0);
  const o = be.getGuestOrder(no);
  if (!o) return <Navigate to="/login?tab=guest" replace />;
  const s = orderState(o);
  const done = sp.get('done') === '1';
  const cancel = async () => {
    if (!canCancel(orderState(o))) return ui.toast('이미 배송이 시작돼 취소할 수 없어요');
    if (!(await ui.confirm('주문 취소', `주문번호 ${o.no}\n결제 금액 ${won(o.total)}을 취소할까요?`, '주문 취소', '닫기'))) return;
    const r = await be.cancelGuestOrder(o.no);
    ui.toast(r.ok ? '주문을 취소했어요' : r.error);
    refresh((x) => x + 1);
  };
  return (
    <main className="wrap" id="page">
      <div className="crumb"><Link to="/">홈</Link> › 비회원 주문조회</div>
      {done ? (
        <div className="box" style={{ textAlign: 'center' }}>
          <div className="done" style={{ padding: 10 }}>
            <div className="ok">✓</div>
            <h1 className="ptitle" style={{ margin: 0 }}>주문이 완료됐어요</h1>
            <div className="num" style={{ fontSize: 18, fontWeight: 800 }}>주문번호 {o.no}</div>
            <p className="hint">비회원 주문조회에 꼭 필요해요. 주문번호를 메모해 두세요.</p>
          </div>
        </div>
      ) : <h1 className="ptitle">비회원 주문조회</h1>}
      {o.pay.m === 'bank' && <div className="note" style={{ fontSize: 14, color: 'var(--ink)' }}><b>입금 계좌</b> {o.pay.acct} · <b>{won(o.total)}</b> · {fmtDate(o.at + 864e5)} 23:59까지</div>}
      <div className="box">
        <div className="rowb" style={{ margin: 0 }}><div><b className="num">{fmtDateTime(o.at)} 주문</b> <span className="hint num">주문번호 {o.no}</span></div><span className={`st ${stateClass(s)}`}>{s.label}</span></div>
        <OrderSteps o={o} />
      </div>
      <div className="ocard" style={{ marginTop: 12 }}>
        {o.items.map((it, k) => (
          <div className="oi" key={k}>
            <Link className="pic" to={`/products/${it.pid}`}><ItemImage it={it} /></Link>
            <div><Link className="nm" to={`/products/${it.pid}`} style={{ color: 'inherit', textDecoration: 'none' }}>{it.name}</Link><div className="op num">{optionText(it)} · {it.qty}개 · {won(it.price * it.qty)}</div></div>
            <div className="acts" />
          </div>
        ))}
        {(s.k === 'paid' || s.k === 'ready') && <div style={{ textAlign: 'right', marginTop: 8 }}><button className="btn sm ghost" onClick={cancel}>주문 취소</button></div>}
      </div>
      {s.k !== 'cancel' ? (
        <div className="box"><h3>배송 조회</h3><dl className="kv" style={{ marginBottom: 10 }}><dt>택배사</dt><dd>바로담 택배</dd><dt>운송장 번호</dt><dd className="num">{s.i >= 2 ? o.inv : '상품 준비 후 발급돼요'}</dd></dl><TrackList o={o} /></div>
      ) : (
        <div className="box"><h3>취소 정보</h3><dl className="kv"><dt>취소 일시</dt><dd className="num">{fmtDateTime(o.cancelledAt!)}</dd><dt>환불 금액</dt><dd className="num"><b>{won(o.total)}</b></dd></dl></div>
      )}
      <div className="box"><h3>주문자·배송지</h3><dl className="kv"><dt>주문자</dt><dd>{o.buyer.name} · <span className="num">{o.buyer.phone}</span></dd><dt>받는 분</dt><dd>{o.addr.to} · <span className="num">{o.addr.phone}</span></dd><dt>주소</dt><dd className="num">({o.addr.zip}) {o.addr.a1} {o.addr.a2}</dd><dt>요청사항</dt><dd>{o.memo}</dd></dl></div>
      <div className="box paysum"><h3>결제 정보</h3><PayRows o={o} /><div className="sum" style={{ marginTop: 8 }}><span>결제 수단</span><span>{payName(o.pay)}</span></div></div>
      <div className="note">회원으로 가입하면 다음 주문부터 쿠폰과 적립금을 받을 수 있어요. <Link className="lnk" to="/signup">회원가입</Link></div>
    </main>
  );
}
