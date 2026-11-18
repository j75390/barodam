import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import { won } from '@/lib/format';
import { arrivalText } from '@/domain/delivery';
import { wish } from '@/state/cart';
import { useUI } from '@/state/ui';
import { ProductImage } from './ProductImage';

interface Props {
  p: Product;
  /** ranking badge number */
  rank?: number;
  /** show points + low-stock lines (search results, brand pages) */
  detail?: boolean;
  /** extra line above the brand (ranking movement) */
  above?: React.ReactNode;
}

export function ProductCard({ p, rank, detail, above }: Props) {
  const wished = wish.useIds().includes(p.id);
  const ui = useUI();
  return (
    <div className="card">
      <Link to={`/products/${p.id}`} className="card-link" aria-label={`${p.name} 자세히 보기`}>
        <div className="pic" style={rank ? { position: 'relative' } : undefined}>
          {rank ? <span className="rk num">{rank}</span> : null}
          <ProductImage photo={p.photo} />
        </div>
        {above}
        <div className="brand">{p.brand}</div>
        <div className="name">{p.name}</div>
        <div className="price">
          {p.off ? <span className="off num">{p.off}%</span> : null}
          <span className="now num">{won(p.price)}</span>
          {p.off ? <span className="was num">{won(p.base)}</span> : null}
        </div>
        <div className="rate num">
          <b>★ {p.rating}</b> ({p.reviews.toLocaleString()})
        </div>
        {detail && (
          <>
            <div className="pts num">최대 {won(Math.floor(p.price * 0.01))} 적립</div>
            {p.stock < 15 && <div className="urg num">품절임박 · {p.stock}개 남음</div>}
          </>
        )}
        <div className="tags">
          {p.rocket && <span className="tag ship">{arrivalText(p)}</span>}
          {p.free && <span className="tag">무료배송</span>}
          {p.stock < 10 && <span className="tag hot num">{p.stock}개 남음</span>}
        </div>
      </Link>
      <button
        className="heart"
        aria-pressed={wished}
        aria-label={wished ? '찜 해제' : '찜하기'}
        onClick={() => ui.toast(wish.toggle(p.id) ? '찜 목록에 담았어요' : '찜을 해제했어요')}
      >
        <svg viewBox="0 0 24 24" strokeWidth="2">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        </svg>
      </button>
    </div>
  );
}
