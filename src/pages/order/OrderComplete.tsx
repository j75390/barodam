import { Link, Navigate, useParams } from 'react-router-dom';
import { productById } from '@/data/products';
import { arrivalText } from '@/domain/delivery';
import { payName } from '@/domain/orderText';
import { fmtDate, won } from '@/lib/format';
import { useUser } from '@/state/backendContext';
import { PayRows } from '@/components/orderParts';
import { usePageTitle } from '@/components/usePageTitle';

export default function OrderComplete() {
  usePageTitle('주문 완료');
  const { no } = useParams();
  const user = useUser();
  if (!user) return <Navigate to={`/login?next=/orders/complete/${no}`} replace />;
  const o = user.orders.find((x) => x.no === no);
  if (!o) return <Navigate to="/mypage/orders" replace />;
  const first = productById(o.items[0].pid);
  return (
    <main className="wrap" id="page">
      <div className="auth" style={{ maxWidth: 560 }}>
        <div className="done">
          <div className="ok">✓</div>
          <h1 className="ptitle" style={{ margin: 0 }}>주문이 완료됐어요</h1>
          <div className="num hint">주문번호 {o.no}</div>
        </div>
        {o.pay.m === 'bank' && (
          <div className="note" style={{ fontSize: 14, color: 'var(--ink)' }}>
            <b>입금 계좌</b> {o.pay.acct}<br /><b>입금 금액</b> {won(o.total)} · <b>기한</b> {fmtDate(o.at + 864e5)} 23:59
          </div>
        )}
        <div className="box paysum" style={{ marginTop: 14 }}><PayRows o={o} /></div>
        <div className="box">
          <dl className="kv">
            <dt>배송지</dt><dd>{o.addr.to} · {o.addr.a1} {o.addr.a2}</dd>
            <dt>도착 예정</dt><dd>{first ? arrivalText(first) : '상품 준비 후 안내'}</dd>
            <dt>결제 수단</dt><dd>{payName(o.pay)}</dd>
          </dl>
        </div>
        <div className="ctas">
          <Link className="btn" style={{ textAlign: 'center', textDecoration: 'none', color: 'inherit' }} to={`/orders/${o.no}`}>주문 상세 보기</Link>
          <Link className="btn primary" style={{ textAlign: 'center', textDecoration: 'none' }} to="/">쇼핑 계속하기</Link>
        </div>
        <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>주문 내역과 배송 현황은 마이페이지에서 확인할 수 있어요.</p>
      </div>
    </main>
  );
}
