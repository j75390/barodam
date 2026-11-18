import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { productById } from '@/data/products';
import { local } from '@/lib/storage';
import { wish } from '@/state/cart';
import { useUser } from '@/state/backendContext';
import { ProductImage } from './ProductImage';

/** Mobile bottom tab bar. */
export function TabBar() {
  const user = useUser();
  const loc = useLocation();
  const nav = useNavigate();
  const cur = loc.pathname === '/' ? 'home' : loc.pathname.startsWith('/mypage/wish') ? 'wish' : /^\/(mypage|login|signup)/.test(loc.pathname) ? 'my' : '';
  const go = (n: string) => {
    if (n === 'home') nav('/');
    else if (n === 'cat') {
      nav('/');
      setTimeout(() => document.getElementById('caticons')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    } else if (n === 'search') {
      window.scrollTo({ top: 0 });
      document.getElementById('q')?.focus();
    } else if (n === 'wish') nav(user ? '/mypage/wish' : '/login?next=/mypage/wish');
    else nav(user ? '/mypage' : '/login');
  };
  const item = (n: string, label: string, d: string) => (
    <button key={n} aria-current={cur === n ? 'page' : undefined} onClick={() => go(n)}>
      <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: d }} />
      {label}
    </button>
  );
  return (
    <nav className="tabbar" aria-label="하단 메뉴">
      {item('home', '홈', '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>')}
      {item('cat', '카테고리', '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>')}
      {item('search', '검색', '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>')}
      {item('wish', '찜', '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>')}
      {item('my', '마이', '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>')}
    </nav>
  );
}

/** Right-side rail (wide screens): recently viewed products, wishlist count, back to top. */
export function Rail() {
  const user = useUser();
  const loc = useLocation();
  const wishIds = wish.useIds();
  const [page, setPage] = useState(0);
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    setIds(local.get<number[]>('bd_recent', []).filter((i) => productById(i)));
  }, [loc.pathname]);
  const per = 3;
  const pages = Math.max(1, Math.ceil(ids.length / per));
  const pg = Math.min(page, pages - 1);
  return (
    <div className="rail">
      <div className="rb">
        최근 본 상품
        <div className="rv2">
          {ids.length ? (
            ids.slice(pg * per, pg * per + per).map((i) => {
              const p = productById(i)!;
              return (
                <Link key={i} to={`/products/${i}`} title={p.name}>
                  <ProductImage photo={p.photo} />
                </Link>
              );
            })
          ) : (
            <span className="hint" style={{ fontWeight: 400 }}>없음</span>
          )}
        </div>
        {ids.length > per && (
          <div className="pg">
            <button onClick={() => setPage(Math.max(0, pg - 1))} aria-label="이전">‹</button>
            <span className="num">{pg + 1}/{pages}</span>
            <button onClick={() => setPage(Math.min(pages - 1, pg + 1))} aria-label="다음">›</button>
          </div>
        )}
      </div>
      <Link className="rb" to={user ? '/mypage/wish' : '/login?next=/mypage/wish'} style={{ textDecoration: 'none', color: 'var(--ink)' }}>
        찜 <b className="num" style={{ color: 'var(--accent)' }}>{wishIds.length}</b>
      </Link>
      <button className="top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>TOP ↑</button>
    </div>
  );
}

export function ScrollTopButton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  if (!show) return null;
  return <button className="totop" aria-label="맨 위로" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>;
}

/** Scrolls to top on page navigation. */
export function ScrollReset() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}
