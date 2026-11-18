import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Address, Order, OrderItem, OrderState, User } from '@/types';
import { productById } from '@/data/products';
import { ORDER_STEPS, STEP_MINUTES, orderState, trackingLog, canCancel } from '@/domain/orderState';
import { optionText } from '@/domain/orderText';
import { fmtDateTime, formatPhone, won } from '@/lib/format';
import { PHONE_RE, ZIP_RE } from '@/lib/validators';
import { cart } from '@/state/cart';
import { useBackend } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import { useOpenCart } from '@/state/cartDrawer';
import type { Backend } from '@/services/backend';
import { ProductImage } from './ProductImage';
import { openReviewForm } from './Dialogs';

export const stateClass = (s: OrderState) => (s.k === 'cancel' ? 'cancel' : s.k === 'done' || s.k === 'confirmed' ? 'ok' : 'go');

export function OrderSteps({ o }: { o: Order }) {
  const s = orderState(o);
  if (s.k === 'cancel') return null;
  return (
    <div className="steps">
      {ORDER_STEPS.map((n, k) => (
        <div key={n} className={k <= s.i ? 'on' : ''}>
          {n}
          {k <= s.i && <small className="num">{fmtDateTime(o.at + STEP_MINUTES[k] * 60000).slice(5)}</small>}
        </div>
      ))}
    </div>
  );
}

export function PayRows({ o }: { o: Pick<Order, 'sub' | 'disc' | 'cpAmt' | 'cp' | 'usePts' | 'ship' | 'total'> }) {
  return (
    <>
      <div className="sum"><span>상품 금액</span><span className="num">{won(o.sub + o.disc)}</span></div>
      {o.disc > 0 && <div className="sum"><span>상품 할인</span><span className="num minus">−{won(o.disc)}</span></div>}
      {o.cpAmt > 0 && <div className="sum"><span>쿠폰 ({o.cp})</span><span className="num minus">−{won(o.cpAmt)}</span></div>}
      {o.usePts > 0 && <div className="sum"><span>적립금 사용</span><span className="num minus">−{won(o.usePts)}</span></div>}
      <div className="sum"><span>배송비</span><span className="num">{o.ship ? won(o.ship) : '무료'}</span></div>
      <div className="sum total"><span>총 결제 금액</span><span className="num">{won(o.total)}</span></div>
    </>
  );
}

export function TrackList({ o }: { o: Order }) {
  return (
    <ul className="track num">
      {trackingLog(o).map((e) => (
        <li key={e.t + e.what}>
          <span>{fmtDateTime(e.t).slice(5)}</span>
          <div><b>{e.what}</b>{e.place && ` · ${e.place}`}<div className="hint">{e.desc}</div></div>
        </li>
      ))}
    </ul>
  );
}

export function ItemImage({ it }: { it: OrderItem }) {
  return <ProductImage photo={productById(it.pid)?.photo ?? it.photo} />;
}

/** One order card with per-item actions (cancel, track, confirm, review, reorder). */
export function OrderCard({ o, user, onChanged }: { o: Order; user: User; onChanged?: () => void }) {
  const s = orderState(o);
  const nav = useNavigate();
  return (
    <div className="ocard">
      <div className="oh">
        <div><b className="num">{fmtDateTime(o.at).slice(0, 10)} 주문</b> <span className="no num">주문번호 {o.no}</span></div>
        <Link to={`/orders/${o.no}`}>주문 상세 ›</Link>
      </div>
      <div className={`st ${stateClass(s)}`}>{s.label}{s.k === 'ship' ? ' · 내일 도착 예정' : ''}</div>
      {o.items.map((it, k) => (
        <div className="oi" key={k}>
          <button className="pic" style={{ border: 0, padding: 0 }} onClick={() => nav(`/products/${it.pid}`)} aria-label={`${it.name} 보기`}><ItemImage it={it} /></button>
          <div><Link className="nm" to={`/products/${it.pid}`} style={{ color: 'inherit', textDecoration: 'none' }}>{it.name}</Link><div className="op num">{optionText(it)} · {it.qty}개 · {won(it.price * it.qty)}</div></div>
          <div className="acts">
            {k === 0 && <OrderActions o={o} s={s} onChanged={onChanged} />}
            {(s.k === 'done' || s.k === 'confirmed') && !user.reviews.some((r) => r.oid === o.no && r.k === k) && <ReviewButton o={o} k={k} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewButton({ o, k }: { o: Order; k: number }) {
  const be = useBackend();
  const ui = useUI();
  return <button className="btn sm ghost" onClick={() => void openReviewForm(ui, be, o, k)}>리뷰 쓰기</button>;
}

export function OrderActions({ o, s, onChanged }: { o: Order; s: OrderState; onChanged?: () => void }) {
  const be = useBackend();
  const ui = useUI();
  const openCart = useOpenCart();
  const cancel = async () => {
    if (!canCancel(orderState(o))) return ui.toast('이미 배송이 시작돼 취소할 수 없어요');
    if (!(await ui.confirm('주문 취소', `주문번호 ${o.no}\n결제 금액 ${won(o.total)}을 취소할까요?\n사용한 쿠폰과 적립금은 돌려드려요.`, '주문 취소', '닫기'))) return;
    const r = await be.cancelOrder(o.no);
    ui.toast(r.ok ? '주문을 취소했어요' : r.error);
    onChanged?.();
  };
  const confirm = async () => {
    if (!(await ui.confirm('구매 확정', `구매를 확정하면 적립금 ${won(o.earn)}을 드려요.\n확정 후에는 반품 접수가 어려워요.`, '구매 확정'))) return;
    const r = await be.confirmOrder(o.no);
    ui.toast(r.ok ? `적립금 ${won(r.value)}을 드렸어요` : r.error);
    onChanged?.();
  };
  const reorder = () => {
    o.items.forEach((i) => productById(i.pid) && cart.add(i.pid, i.color, i.size, i.qty));
    ui.toast('장바구니에 다시 담았어요');
    openCart();
  };
  return (
    <>
      {(s.k === 'paid' || s.k === 'ready') && <button className="btn sm ghost" onClick={cancel}>주문 취소</button>}
      {(s.k === 'ship' || s.k === 'done' || s.k === 'confirmed') && <Link className="btn sm ghost" style={{ textAlign: 'center', textDecoration: 'none', color: 'inherit' }} to={`/orders/${o.no}`}>배송 조회</Link>}
      {s.k === 'done' && <button className="btn sm primary" onClick={confirm}>구매 확정</button>}
      {(s.k === 'confirmed' || s.k === 'cancel') && <button className="btn sm ghost" onClick={reorder}>재구매</button>}
    </>
  );
}

/** Address create/edit dialog. Resolves with the saved address (or null when cancelled). */
export function openAddressForm(ui: ReturnType<typeof useUI>, be: Backend, user: User, a?: Address): Promise<Address | null> {
  let saved: Address | null = null;
  return ui
    .open({
      title: a ? '배송지 수정' : '새 배송지',
      render: (close) => (
        <AddressForm
          a={a}
          user={user}
          onCancel={() => close(false)}
          onSave={async (v) => {
            const r = await be.saveAddress({ ...v, id: a?.id });
            if (!r.ok) return r.error;
            saved = r.value;
            ui.toast('배송지를 저장했어요');
            close(true);
            return null;
          }}
        />
      ),
    })
    .then(() => saved);
}

function AddressForm({ a, user, onCancel, onSave }: { a?: Address; user: User; onCancel: () => void; onSave: (v: Omit<Address, 'id'>) => Promise<string | null> }) {
  const [v, setV] = useState({ label: a?.label ?? '', to: a?.to ?? user.name, phone: a?.phone ?? user.phone, zip: a?.zip ?? '', a1: a?.a1 ?? '', a2: a?.a2 ?? '' });
  const [def, setDef] = useState(!user.addrs.length || !!a?.def);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof v, val: string) => setV((x) => ({ ...x, [k]: val }));
  return (
    <form noValidate onSubmit={async (e) => {
      e.preventDefault();
      const m = v.to.trim().length < 2 ? '받는 분 이름을 입력해 주세요.' : !PHONE_RE.test(v.phone) ? '연락처를 010-0000-0000 형식으로 입력해 주세요.' : !ZIP_RE.test(v.zip) ? '우편번호 5자리를 입력해 주세요.' : v.a1.trim().length < 5 ? '주소를 입력해 주세요.' : !v.a2.trim() ? '상세 주소를 입력해 주세요.' : null;
      if (m) return setErr(m);
      const r = await onSave({ ...v, label: v.label.trim(), to: v.to.trim(), a1: v.a1.trim(), a2: v.a2.trim(), def });
      if (r) setErr(r);
    }}>
      <h3>{a ? '배송지 수정' : '새 배송지'}</h3>
      <label className="fld"><span>배송지 이름</span><input className="inp" maxLength={10} placeholder="예: 우리집, 회사" value={v.label} onChange={(e) => set('label', e.target.value)} /></label>
      <div className="grid2">
        <label className="fld"><span>받는 분</span><input className="inp" maxLength={20} value={v.to} onChange={(e) => set('to', e.target.value)} /></label>
        <label className="fld"><span>연락처</span><input className="inp num" inputMode="numeric" value={v.phone} onChange={(e) => set('phone', formatPhone(e.target.value))} /></label>
      </div>
      <label className="fld"><span>우편번호</span><input className="inp num" inputMode="numeric" maxLength={5} placeholder="5자리" value={v.zip} onChange={(e) => set('zip', e.target.value.replace(/\D/g, ''))} /></label>
      <label className="fld"><span>주소</span><input className="inp" autoComplete="address-line1" placeholder="도로명 주소" value={v.a1} onChange={(e) => set('a1', e.target.value)} /></label>
      <label className="fld"><span>상세 주소</span><input className="inp" autoComplete="address-line2" placeholder="동·호수" value={v.a2} onChange={(e) => set('a2', e.target.value)} /></label>
      <label className="ck" style={{ marginTop: 12 }}><input type="checkbox" checked={def} onChange={(e) => setDef(e.target.checked)} /> 기본 배송지로 저장</label>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="ctas"><button type="button" className="btn" onClick={onCancel}>취소</button><button className="btn primary">저장</button></div>
    </form>
  );
}

export function AddressCard({ a }: { a: Pick<Address, 'label' | 'to' | 'phone' | 'zip' | 'a1' | 'a2'> & { def?: boolean } }) {
  return (
    <div className="addr" style={{ margin: 0 }}>
      <div className="t">{a.label || a.to}{a.def && <span className="def">기본 배송지</span>}</div>
      <div>{a.to} · <span className="num">{a.phone}</span></div>
      <div className="num">({a.zip}) {a.a1} {a.a2}</div>
    </div>
  );
}
