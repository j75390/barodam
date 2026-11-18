import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { Product } from '@/types';
import { CATS, catName, COLOR_HEX, TYPE_LABEL } from '@/data/catalog';
import { PRODUCTS } from '@/data/products';
import { won } from '@/lib/format';
import { ProductCard } from '@/components/ProductCard';
import { POPULAR_KEYWORDS } from '@/components/SearchBox';
import { usePageTitle } from '@/components/usePageTitle';

const SORTS: [string, string][] = [['rank', '바로담 랭킹순'], ['low', '낮은가격순'], ['high', '높은가격순'], ['sold', '판매량순'], ['new', '최신순'], ['rev', '리뷰 많은순']];
const SORT_KEY: Record<string, (p: Product) => number> = {
  rank: (p) => -(p.rating * Math.log(p.reviews + 2) + p.sold / 800 + (p.rocket ? 1 : 0)),
  low: (p) => p.price, high: (p) => -p.price, sold: (p) => -p.sold, new: (p) => -p.id, rev: (p) => -p.reviews,
};
const PER_PAGE = 40;
const FLAGS: [string, string][] = [['rocket', '🚚 내일 도착'], ['free', '무료배송'], ['r4', '별점 4.5 이상'], ['deal', '30% 이상 할인']];

/** Search results and category listing with facet filters (state lives in the URL so results are shareable). */
export default function Results({ mode }: { mode: 'search' | 'category' }) {
  const { cat = 'all' } = useParams();
  const [sp, setSp] = useSearchParams();
  const q = mode === 'search' ? (sp.get('q') ?? '').trim() : '';
  const list = (k: string) => sp.getAll(k);
  const types = list('type'), brands = list('brand'), colors = list('color');
  const min = sp.get('min') ?? '', max = sp.get('max') ?? '';
  const sort = sp.get('sort') ?? 'rank';
  const page = Math.max(1, Number(sp.get('page') ?? 1));
  const flag = (k: string) => sp.get(k) === '1';
  const [moreOpen, setMoreOpen] = useState<Record<string, boolean>>({});
  const [priceIn, setPriceIn] = useState({ min, max });

  const update = (fn: (n: URLSearchParams) => void, keepPage = false) => {
    const n = new URLSearchParams(sp);
    fn(n);
    if (!keepPage) n.delete('page');
    setSp(n);
  };
  const toggleIn = (k: string, v: string) => update((n) => {
    const cur = n.getAll(k);
    n.delete(k);
    (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).forEach((x) => n.append(k, x));
  });

  const base = useMemo(() => {
    let L = PRODUCTS.filter((p) => cat === 'all' || p.cat === cat);
    if (q) {
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      L = L.filter((p) => {
        const t = `${p.name} ${p.brand} ${catName(p.cat)} ${TYPE_LABEL[p.type] ?? ''}`.toLowerCase();
        return words.every((w) => t.includes(w));
      });
    }
    return L;
  }, [cat, q]);

  const apply = (skip?: 't' | 'b' | 'c') =>
    base.filter((p) =>
      (skip === 't' || !types.length || types.includes(p.type)) &&
      (skip === 'b' || !brands.length || brands.includes(p.brand)) &&
      (skip === 'c' || !colors.length || (p.colors ?? []).some((c) => colors.includes(c))) &&
      (!min || p.price >= Number(min)) && (!max || p.price <= Number(max)) &&
      (!flag('rocket') || p.rocket) && (!flag('free') || p.free) && (!flag('r4') || p.rating >= 4.5) && (!flag('deal') || p.off >= 30));
  const facet = (L: Product[], fn: (p: Product) => string[]) => {
    const m = new Map<string, number>();
    L.forEach((p) => fn(p).forEach((v) => m.set(v, (m.get(v) ?? 0) + 1)));
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const results = apply().sort((a, b) => SORT_KEY[sort](a) - SORT_KEY[sort](b));
  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const pg = Math.min(page, pages);
  const tF = facet(apply('t'), (p) => [p.type]);
  const bF = facet(apply('b'), (p) => [p.brand]);
  const cF = facet(apply('c'), (p) => p.colors ?? []);
  const related = q
    ? [...new Set([...tF.slice(0, 4).map(([t]) => `${q} ${(TYPE_LABEL[t] ?? '').split('·')[0]}`), ...bF.slice(0, 3).map(([b]) => `${b} ${q}`)])].slice(0, 7)
    : tF.slice(0, 8).map(([t]) => TYPE_LABEL[t]);
  const title = q ? `'${q}' 검색결과` : flag('deal') && cat === 'all' ? '오늘의 특가' : catName(cat) || '전체';
  usePageTitle(title);

  const chips: [string, string, string][] = [
    ...types.map((t): [string, string, string] => ['type', t, TYPE_LABEL[t] ?? t]),
    ...brands.map((b): [string, string, string] => ['brand', b, b]),
    ...colors.map((c): [string, string, string] => ['color', c, c]),
    ...FLAGS.filter(([k]) => flag(k)).map(([k, l]): [string, string, string] => [k, '1', l.replace('🚚 ', '')]),
    ...(min || max ? [['price', '', `${min ? won(Number(min)) : ''}~${max ? won(Number(max)) : ''}`] as [string, string, string]] : []),
  ];
  const removeChip = (k: string, v: string) => update((n) => {
    if (k === 'price') { n.delete('min'); n.delete('max'); setPriceIn({ min: '', max: '' }); return; }
    if (['type', 'brand', 'color'].includes(k)) {
      const cur = n.getAll(k).filter((x) => x !== v);
      n.delete(k);
      cur.forEach((x) => n.append(k, x));
    } else n.delete(k);
  });

  const group = (label: string, key: 'type' | 'brand' | 'color', items: [string, number][], selected: string[], limit = 8) =>
    items.length ? (
      <div className="fg">
        <h4>{label}</h4>
        {items.slice(0, moreOpen[key] ? 99 : limit).map(([v, n]) => (
          <label key={v}>
            <input type="checkbox" checked={selected.includes(v)} onChange={() => toggleIn(key, v)} />
            {key === 'color' && <span className="swatch" style={{ background: COLOR_HEX[v] ?? '#ccc' }} />}
            {key === 'type' ? TYPE_LABEL[v] ?? v : v}
            <span className="c num">{n}</span>
          </label>
        ))}
        {items.length > limit && !moreOpen[key] && <button className="lnk" onClick={() => setMoreOpen((m) => ({ ...m, [key]: true }))}>+ 더보기</button>}
      </div>
    ) : null;

  return (
    <main className="wrap" id="page">
      <div className="crumb"><Link to="/">홈</Link> › {q ? '검색' : <Link to="/category/all">카테고리</Link>} › {title}</div>
      <div className="srp">
        <details className="fside" open={typeof window === 'undefined' || window.innerWidth > 820}>
          <summary>필터 {chips.length > 0 && <span className="num" style={{ color: 'var(--accent)' }}>{chips.length}</span>}<span>▾</span></summary>
          <div className="fg">
            <h4>배송·혜택</h4>
            {FLAGS.map(([k, l]) => (
              <label key={k}><input type="checkbox" checked={flag(k)} onChange={(e) => update((n) => (e.target.checked ? n.set(k, '1') : n.delete(k)))} /> {l}</label>
            ))}
          </div>
          {cat === 'all' && !q && (
            <div className="fg"><h4>카테고리</h4>{CATS.filter((c) => c.id !== 'all').map((c) => <label key={c.id}><Link className="lnk" style={{ textDecoration: 'none', color: 'var(--ink)' }} to={`/category/${c.id}`}>{c.name}</Link></label>)}</div>
          )}
          {group(q ? '카테고리' : '세부 카테고리', 'type', tF, types)}
          {group('브랜드', 'brand', bF, brands, 6)}
          {cF.length > 0 && group('색상', 'color', cF, colors, 10)}
          <div className="fg">
            <h4>가격</h4>
            <form className="pr" onSubmit={(e) => { e.preventDefault(); update((n) => { priceIn.min ? n.set('min', priceIn.min) : n.delete('min'); priceIn.max ? n.set('max', priceIn.max) : n.delete('max'); }); }}>
              <input className="inp num" inputMode="numeric" placeholder="최소" aria-label="최소 가격" value={priceIn.min} onChange={(e) => setPriceIn((x) => ({ ...x, min: e.target.value.replace(/\D/g, '') }))} />
              <span>~</span>
              <input className="inp num" inputMode="numeric" placeholder="최대" aria-label="최대 가격" value={priceIn.max} onChange={(e) => setPriceIn((x) => ({ ...x, max: e.target.value.replace(/\D/g, '') }))} />
              <button className="btn sm" style={{ gridColumn: '1/-1', marginTop: 6 }}>가격 적용</button>
            </form>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
              {([[0, 20000], [20000, 50000], [50000, 100000], [100000, 0]] as const).map(([a, b]) => (
                <button key={a} className="lnk" onClick={() => { setPriceIn({ min: a ? String(a) : '', max: b ? String(b) : '' }); update((n) => { a ? n.set('min', String(a)) : n.delete('min'); b ? n.set('max', String(b)) : n.delete('max'); }); }}>
                  {a ? won(a) : ''}~{b ? won(b) : ''}
                </button>
              ))}
            </div>
          </div>
        </details>

        <div>
          <div className="sec-head" style={{ margin: 0 }}><div><h1 className="ptitle" style={{ margin: 0 }}>{title}</h1></div><span className="count num">상품 {results.length.toLocaleString()}개</span></div>
          {related.length > 0 && <div className="rel"><b>연관</b>{related.map((r) => <Link key={r} to={`/search?q=${encodeURIComponent(r)}`}>{r}</Link>)}</div>}
          {chips.length > 0 && (
            <div className="applied">
              {chips.map(([k, v, l]) => <button key={k + v} onClick={() => removeChip(k, v)}>{l} ✕</button>)}
              <button className="lnk" onClick={() => { setPriceIn({ min: '', max: '' }); setSp(q ? { q } : {}); }}>전체 해제</button>
            </div>
          )}
          <div className="bar"><div className="sort">{SORTS.map(([k, l]) => <button key={k} aria-pressed={sort === k} onClick={() => update((n) => n.set('sort', k))}>{l}</button>)}</div></div>
          {results.length ? (
            <>
              <div className="grid">
                {results.slice((pg - 1) * PER_PAGE, pg * PER_PAGE).map((p, i) => <ProductCard key={p.id} p={p} detail rank={sort === 'rank' && pg === 1 && i < 10 ? i + 1 : undefined} />)}
              </div>
              {pages > 1 && (
                <nav className="pager" aria-label="페이지">
                  {pg > 1 && <button aria-label="이전 페이지" onClick={() => update((n) => n.set('page', String(pg - 1)), true)}>‹</button>}
                  {Array.from({ length: pages }, (_, i) => i + 1).filter((n) => Math.abs(n - pg) < 5).map((n) => (
                    <button key={n} aria-current={n === pg ? 'page' : undefined} onClick={() => update((x) => x.set('page', String(n)), true)}>{n}</button>
                  ))}
                  {pg < pages && <button aria-label="다음 페이지" onClick={() => update((n) => n.set('page', String(pg + 1)), true)}>›</button>}
                </nav>
              )}
            </>
          ) : (
            <div className="empty-box">
              조건에 맞는 상품이 없어요.<br />필터를 줄이거나 다른 검색어로 찾아보세요.
              <div className="rel" style={{ justifyContent: 'center', marginTop: 12 }}>{POPULAR_KEYWORDS.slice(0, 6).map((x) => <Link key={x} to={`/search?q=${encodeURIComponent(x)}`}>{x}</Link>)}</div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
