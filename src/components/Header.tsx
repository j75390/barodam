import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CATS, catName, TYPE_LABEL } from '@/data/catalog';
import { PRODUCTS } from '@/data/products';
import { cart, wish } from '@/state/cart';
import { useBackend, useUser } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import { BrandEmblem } from './BrandLogo';
import { SearchBox } from './SearchBox';

function UtilBar() {
  const user = useUser();
  const be = useBackend();
  const ui = useUI();
  const nav = useNavigate();
  return (
    <div className="util">
      <div className="wrap">
        <span className="promo">첫 구매 <b>15% 쿠폰</b> · 19,800원 이상 무료배송</span>
        <span className="links">
          {user ? (
            <>
              <b>{user.name}님</b>
              <Link to="/mypage/orders">주문배송</Link>
              <Link to="/mypage">마이페이지</Link>
              <button onClick={async () => { await be.signOut(); ui.toast('로그아웃했어요'); nav('/'); }}>로그아웃</button>
            </>
          ) : (
            <>
              <Link to="/login">로그인</Link>
              <Link to="/signup">회원가입</Link>
              <Link to="/mypage/orders">주문배송</Link>
            </>
          )}
          <a href="/help" target="_blank" rel="noopener">고객센터</a>
        </span>
      </div>
    </div>
  );
}

function MegaMenu() {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState('fashion');
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname, loc.search]);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const ps = PRODUCTS.filter((p) => p.cat === at);
  const types = [...new Set(ps.map((p) => p.type))];
  const brands = [...new Set(ps.map((p) => p.brand))].slice(0, 8);
  const hover = matchMedia('(hover: hover)').matches;
  return (
    <div
      ref={ref}
      style={{ position: 'relative', display: 'flex', alignSelf: 'stretch' }}
      onMouseEnter={() => { if (hover) { clearTimeout(timer.current); setOpen(true); } }}
      onMouseLeave={() => { if (hover) timer.current = window.setTimeout(() => setOpen(false), 120); }}
    >
      <button className="catbtn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        <span>카테고리</span>
      </button>
      {open && (
        <div className="mega">
          <div className="l">
            {CATS.filter((c) => c.id !== 'all').map((c) => (
              <button key={c.id} className={c.id === at ? 'on' : ''} onMouseOver={() => setAt(c.id)} onClick={() => setAt(c.id)}>
                {c.name}<span>›</span>
              </button>
            ))}
          </div>
          <div className="r">
            <h5>{catName(at)} <Link to={`/category/${at}`} style={{ fontSize: 12, color: 'var(--muted)' }}>전체보기 ›</Link></h5>
            {types.map((t) => <Link key={t} to={`/category/${at}?type=${t}`}>{TYPE_LABEL[t]}</Link>)}
            <div className="b">
              {brands.map((b) => (
                <Link key={b} to={`/brands/${encodeURIComponent(b)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <BrandEmblem brand={b} size={18} />{b}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Header({ onOpenCart }: { onOpenCart: () => void }) {
  const user = useUser();
  const lines = cart.useLines();
  const wishIds = wish.useIds();
  const nav = useNavigate();
  const loc = useLocation();
  const qs = new URLSearchParams(loc.search);
  const cartCount = lines.reduce((a, l) => a + l.qty, 0);
  const curCat = loc.pathname === '/' ? 'all' : (/^\/category\/([^/]+)/.exec(loc.pathname)?.[1] ?? '');
  return (
    <>
      <UtilBar />
      <header className="top">
        <div className="wrap">
          <Link className="logo" to="/" aria-label="바로담 처음으로">바로<b>담</b></Link>
          <MegaMenu />
          <SearchBox key={loc.pathname === '/search' ? qs.get('q') ?? '' : 'x'} initial={loc.pathname === '/search' ? qs.get('q') ?? '' : ''} />
          <button className="iconbtn me" aria-label="마이페이지" onClick={() => nav(user ? '/mypage' : '/login')}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
            <span className="lbl">{user ? '마이' : '로그인'}</span>
          </button>
          <button className="iconbtn" aria-label="찜한 상품 보기" onClick={() => nav(user ? '/mypage/wish' : '/login?next=/mypage/wish')}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
            <span className="lbl">찜</span>
            {wishIds.length > 0 && <span className="badge num">{wishIds.length}</span>}
          </button>
          <button className="iconbtn" aria-label="장바구니 열기" onClick={onOpenCart}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M3 4h2l2.2 11h10.6L20 7H6.2" /><circle cx="9" cy="19.5" r="1.4" /><circle cx="17" cy="19.5" r="1.4" /></svg>
            <span className="lbl">장바구니</span>
            {cartCount > 0 && <span className="badge num">{cartCount}</span>}
          </button>
        </div>
        <nav className="cats" aria-label="카테고리">
          <div className="wrap">
            {CATS.map((c) => (
              <button key={c.id} aria-pressed={curCat === c.id} onClick={() => nav(c.id === 'all' ? '/' : `/category/${c.id}`)}>{c.name}</button>
            ))}
            <NavLink className="navx" to="/ranking">랭킹</NavLink>
            <NavLink className="navx" to="/brands">브랜드</NavLink>
            <NavLink className="navx" to="/category/all?deal=1" style={{ color: 'var(--ink)' }}>특가</NavLink>
          </div>
        </nav>
      </header>
    </>
  );
}
