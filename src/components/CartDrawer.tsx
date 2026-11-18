import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productById } from '@/data/products';
import { FREE_SHIPPING_MIN } from '@/data/catalog';
import { lineTotals } from '@/domain/pricing';
import { arrivalText } from '@/domain/delivery';
import { won } from '@/lib/format';
import { session } from '@/lib/storage';
import { cart } from '@/state/cart';
import { useUser } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import { ProductImage } from './ProductImage';

export interface CheckoutDraft {
  src: 'cart' | 'direct';
  lines: { key: string; id: number; color: string | null; size: string | null; qty: number }[];
}
export const CHECKOUT_KEY = 'bd_co';

export function CartDrawer({ onClose }: { onClose: () => void }) {
  const lines = cart.useLines();
  const user = useUser();
  const ui = useUI();
  const nav = useNavigate();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const rows = lines.map((l) => ({ ...l, p: productById(l.id) })).filter((r): r is typeof r & { p: NonNullable<typeof r.p> } => !!r.p);
  const sel = rows.filter((r) => r.selected);
  const { sub, disc, ship } = lineTotals(sel);
  const allOn = rows.length > 0 && rows.every((r) => r.selected);

  const order = () => {
    session.set(CHECKOUT_KEY, { src: 'cart', lines: sel.map(({ key, id, color, size, qty }) => ({ key, id, color, size, qty })) } satisfies CheckoutDraft);
    onClose();
    if (!user) {
      ui.toast('주문하려면 로그인해 주세요');
      nav('/login?next=/checkout');
    } else nav('/checkout');
  };

  return (
    <div id="overlay">
      <div className="scrim" style={{ justifyContent: 'flex-end', padding: 0 }} onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="cTitle">
        <header>
          <h2 id="cTitle">장바구니 <span className="hint num" style={{ fontFamily: 'var(--f-body)' }}>{rows.length}</span></h2>
          <button ref={closeRef} className="close" style={{ position: 'static' }} aria-label="닫기" onClick={onClose}>✕</button>
        </header>
        <div className="body">
          {rows.length ? (
            <>
              <div className="rowb" style={{ margin: 0 }}>
                <label className="ck"><input type="checkbox" checked={allOn} onChange={(e) => cart.selectAll(e.target.checked)} /> 전체 선택 ({sel.length}/{rows.length})</label>
                <button
                  className="lnk"
                  onClick={async () => {
                    if (!sel.length) return ui.toast('지울 상품을 골라 주세요');
                    if (await ui.confirm('선택 삭제', `선택한 ${sel.length}개 상품을 장바구니에서 뺄까요?`, '삭제')) cart.remove(sel.map((r) => r.key));
                  }}
                >선택 삭제</button>
              </div>
              <div className="freebar">
                {sub >= FREE_SHIPPING_MIN ? '무료배송 조건을 채웠어요' : <><b className="num">{won(FREE_SHIPPING_MIN - sub)}</b> 더 담으면 무료배송</>}
                <div className="track"><i style={{ width: `${Math.min(100, (sub / FREE_SHIPPING_MIN) * 100)}%` }} /></div>
              </div>
              {rows.map((r) => (
                <div className="line" key={r.key} style={{ gridTemplateColumns: '20px 64px minmax(0,1fr) auto' }}>
                  <input type="checkbox" checked={r.selected} aria-label={`${r.p.name} 선택`} onChange={(e) => cart.toggle(r.key, e.target.checked)} style={{ width: 17, height: 17, accentColor: 'var(--accent)', marginTop: 22 }} />
                  <button className="pic" style={{ cursor: 'pointer', border: 0, padding: 0 }} onClick={() => { onClose(); nav(`/products/${r.id}`); }} aria-label={`${r.p.name} 보기`}>
                    <ProductImage photo={r.p.photo} />
                  </button>
                  <div>
                    <div className="ln">{r.p.name}</div>
                    <div className="op">{r.color ? `${r.color} · ` : ''}{r.size ? `사이즈 ${r.size} · ` : ''}{arrivalText(r.p)}</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
                      <div className="qty">
                        <button aria-label="줄이기" onClick={() => cart.setQty(r.key, r.qty - 1)}>−</button>
                        <span className="num">{r.qty}</span>
                        <button aria-label="늘리기" onClick={() => (r.qty >= r.p.stock ? ui.toast(`재고가 ${r.p.stock}개 남았어요`) : cart.setQty(r.key, r.qty + 1))}>+</button>
                      </div>
                      <button className="rm" onClick={() => cart.remove([r.key])}>삭제</button>
                    </div>
                  </div>
                  <div className="now num" style={{ fontSize: 14 }}>{won(r.p.price * r.qty)}</div>
                </div>
              ))}
            </>
          ) : (
            <div className="done">
              <div style={{ fontSize: 15, fontWeight: 700 }}>장바구니가 비어 있어요</div>
              <div className="rate">마음에 드는 상품을 담아 보세요</div>
            </div>
          )}
        </div>
        {rows.length > 0 && (
          <footer>
            <div className="sum"><span>상품 금액</span><span className="num">{won(sub + disc)}</span></div>
            <div className="sum"><span>할인</span><span className="num" style={{ color: 'var(--accent)' }}>−{won(disc)}</span></div>
            <div className="sum"><span>배송비</span><span className="num">{ship ? won(ship) : '무료'}</span></div>
            <div className="sum total"><span>결제 예정 금액</span><span className="num">{won(sub + ship)}</span></div>
            <button className="btn primary" disabled={!sel.length} onClick={order}>
              {sel.length ? `${sel.length}개 상품 ${won(sub + ship)} 주문하기` : '주문할 상품을 골라 주세요'}
            </button>
            {!user && <div className="hint" style={{ textAlign: 'center' }}>주문하려면 로그인이 필요해요 (비회원 구매도 가능)</div>}
          </footer>
        )}
      </aside>
    </div>
  );
}
