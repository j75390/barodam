import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRODUCTS, BRANDS } from '@/data/products';
import { won } from '@/lib/format';
import { local } from '@/lib/storage';

export const POPULAR_KEYWORDS = ['패딩', '니트', '러닝화', '헤드폰', '텀블러', '머그', '백팩', '선크림', '한우', '감귤'];

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** Header search with recent / popular keywords and live product suggestions. */
export function SearchBox({ initial = '' }: { initial?: string }) {
  const nav = useNavigate();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>(() => local.get<string[]>('bd_recentq', []));
  const inputRef = useRef<HTMLInputElement>(null);

  const saveRecent = (term: string) => {
    const next = [term, ...recent.filter((x) => x !== term)].slice(0, 10);
    setRecent(next);
    local.set('bd_recentq', next);
  };
  const search = (term: string) => {
    const t = term.trim();
    setOpen(false);
    inputRef.current?.blur();
    if (!t) return nav('/category/all');
    setQ(t);
    saveRecent(t);
    nav(`/search?q=${encodeURIComponent(t)}`);
  };

  const trimmed = q.trim();
  const { hits, brands } = useMemo(() => {
    if (!trimmed) return { hits: [], brands: [] };
    const ql = trimmed.toLowerCase();
    return {
      hits: PRODUCTS.filter((p) => `${p.name} ${p.brand}`.toLowerCase().includes(ql)).slice(0, 8),
      brands: BRANDS.filter((b) => b.toLowerCase().includes(ql)).slice(0, 3),
    };
  }, [trimmed]);
  const items: { label: string; go: () => void }[] = trimmed
    ? [...brands.map((b) => ({ label: b, go: () => search(b) })), ...hits.map((p) => ({ label: p.name, go: () => { setOpen(false); saveRecent(trimmed); nav(`/products/${p.id}`); } }))]
    : [...recent.map((r) => ({ label: r, go: () => search(r) })), ...POPULAR_KEYWORDS.map((k) => ({ label: k, go: () => search(k) }))];

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      items[active].go();
    } else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); search(q); }}>
      <input
        ref={inputRef}
        id="q"
        type="search"
        value={q}
        placeholder="상품명이나 브랜드를 검색해 보세요 (예: 패딩, 텀블러)"
        aria-label="상품 검색"
        autoComplete="off"
        onChange={(e) => { setQ(e.target.value); setActive(-1); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKey}
      />
      <button type="submit">검색</button>
      {open && (
        <div className="sugg" onMouseDown={(e) => e.preventDefault()}>
          {!trimmed ? (
            <>
              {recent.length > 0 && (
                <div>
                  <h4>
                    최근 검색어 <button type="button" className="lnk" onClick={() => { setRecent([]); local.set('bd_recentq', []); }}>전체 삭제</button>
                  </h4>
                  <div className="chipsr">
                    {recent.map((r, i) => (
                      <span key={r}>
                        <button type="button" className={`it${active === i ? ' act' : ''}`} style={{ padding: 0 }} onClick={() => search(r)}>{r}</button>
                        <button type="button" aria-label={`${r} 지우기`} onClick={() => { const n = recent.filter((x) => x !== r); setRecent(n); local.set('bd_recentq', n); }}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h4>인기 검색어 <span className="num">{new Date().getHours()}:00 기준</span></h4>
                <div className="pop">
                  {POPULAR_KEYWORDS.map((k, i) => (
                    <button type="button" key={k} className={`it${active === recent.length + i ? ' act' : ''}`} onClick={() => search(k)}>
                      <span className="n num">{i + 1}</span>
                      <span className="tx">{k}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : hits.length || brands.length ? (
            <div>
              {brands.map((b, i) => (
                <button type="button" key={b} className={`it${active === i ? ' act' : ''}`} onClick={() => search(b)}>
                  <span className="n">🏷</span>
                  <span className="tx"><Highlight text={b} q={trimmed} /> <span className="hint">브랜드</span></span>
                </button>
              ))}
              {hits.map((p, i) => (
                <button type="button" key={p.id} className={`it${active === brands.length + i ? ' act' : ''}`} onClick={items[brands.length + i].go}>
                  <img src={`/img/${p.photo}`} alt="" />
                  <span className="tx"><Highlight text={p.name} q={trimmed} /></span>
                  <span className="num hint" style={{ marginLeft: 'auto' }}>{won(p.price)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="hint" style={{ padding: 6 }}>'{trimmed}'와 맞는 상품이 없어요. 엔터를 눌러 전체 검색해 보세요.</div>
          )}
        </div>
      )}
    </form>
  );
}
