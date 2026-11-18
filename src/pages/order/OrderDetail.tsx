import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { orderState } from '@/domain/orderState';
import { optionText, payName } from '@/domain/orderText';
import { fmtDateTime, won } from '@/lib/format';
import { useBackend, useUser } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import { openInquiryForm, openReviewForm } from '@/components/Dialogs';
import { ItemImage, OrderActions, OrderSteps, PayRows, TrackList, stateClass } from '@/components/orderParts';
import { usePageTitle } from '@/components/usePageTitle';

/** Order detail with live delivery tracking (status advances over time). */
export default function OrderDetail() {
  usePageTitle('주문 상세');
  const { no } = useParams();
  const user = useUser();
  const be = useBackend();
  const ui = useUI();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  if (!user) return <Navigate to={`/login?next=/orders/${no}`} replace />;
  const o = user.orders.find((x) => x.no === no);
  if (!o) {
    return (
      <main className="wrap" id="page">
        <div className="crumb"><Link to="/">홈</Link> › 주문 상세</div>
        <div className="empty-box">주문을 찾을 수 없어요<br /><Link className="lnk" to="/mypage/orders">주문 목록으로</Link></div>
      </main>
    );
  }
  const s = orderState(o);
  return (
    <main className="wrap" id="page">
      <div className="crumb"><Link to="/">홈</Link> › <Link to="/mypage">마이페이지</Link> › <Link to="/mypage/orders">주문·배송</Link> › 주문 상세</div>
      <h1 className="ptitle">주문 상세</h1>
      <div className="box">
        <div className="rowb" style={{ margin: 0 }}><div><b className="num">{fmtDateTime(o.at)} 주문</b> <span className="hint num">주문번호 {o.no}</span></div><span className={`st ${stateClass(s)}`}>{s.label}</span></div>
        <OrderSteps o={o} />
      </div>
      <div className="ocard" style={{ marginTop: 12 }}>
        {o.items.map((it, k) => (
          <div className="oi" key={k}>
            <Link className="pic" to={`/products/${it.pid}`}><ItemImage it={it} /></Link>
            <div><Link className="nm" to={`/products/${it.pid}`} style={{ color: 'inherit', textDecoration: 'none' }}>{it.name}</Link><div className="op num">{optionText(it)} · {it.qty}개 · {won(it.price * it.qty)}</div></div>
            <div className="acts">
              {k === 0 && <OrderActions o={o} s={s} />}
              {(s.k === 'done' || s.k === 'confirmed') && !user.reviews.some((r) => r.oid === o.no && r.k === k) && <button className="btn sm ghost" onClick={() => void openReviewForm(ui, be, o, k)}>리뷰 쓰기</button>}
            </div>
          </div>
        ))}
      </div>
      {s.k !== 'cancel' ? (
        <div className="box">
          <h3>배송 조회</h3>
          <dl className="kv" style={{ marginBottom: 10 }}><dt>택배사</dt><dd>바로담 택배</dd><dt>운송장 번호</dt><dd className="num">{s.i >= 2 ? o.inv : '상품 준비 후 발급돼요'}</dd></dl>
          <TrackList o={o} />
        </div>
      ) : (
        <div className="box"><h3>취소 정보</h3><dl className="kv"><dt>취소 일시</dt><dd className="num">{fmtDateTime(o.cancelledAt!)}</dd><dt>환불 금액</dt><dd className="num"><b>{won(o.total)}</b> ({payName(o.pay)})</dd></dl></div>
      )}
      <div className="box"><h3>배송지</h3><dl className="kv"><dt>받는 분</dt><dd>{o.addr.to}</dd><dt>연락처</dt><dd className="num">{o.addr.phone}</dd><dt>주소</dt><dd className="num">({o.addr.zip}) {o.addr.a1} {o.addr.a2}</dd><dt>요청사항</dt><dd>{o.memo || '없음'}</dd></dl></div>
      <div className="box paysum">
        <h3>결제 정보</h3>
        <PayRows o={o} />
        <div className="sum" style={{ marginTop: 8 }}><span>결제 수단</span><span>{payName(o.pay)}</span></div>
        {o.pay.m === 'bank' && <div className="sum"><span>입금 계좌</span><span className="num">{o.pay.acct}</span></div>}
        <div className="sum"><span>적립 {o.confirmedAt ? '완료' : '예정'}</span><span className="num">{won(o.earn)}</span></div>
      </div>
      <div className="rowb">
        <Link className="btn ghost" style={{ textDecoration: 'none', color: 'inherit' }} to="/mypage/orders">주문 목록</Link>
        <button className="btn ghost" onClick={() => void openInquiryForm(ui, be, { cat: '주문/결제', title: `주문번호 ${o.no} 문의` })}>이 주문 문의하기</button>
      </div>
    </main>
  );
}
