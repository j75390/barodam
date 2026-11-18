import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '@/types';
import { CATS, catName, TYPE_LABEL } from '@/data/catalog';
import { BRANDS, PRODUCTS, RESERVED, productsByBrand } from '@/data/products';
import { won } from '@/lib/format';
import { hashString } from '@/lib/random';
import { ProductCard } from '@/components/ProductCard';
import { ProductImage } from '@/components/ProductImage';
import { BrandEmblem, BrandMark } from '@/components/BrandLogo';
import { usePageTitle } from '@/components/usePageTitle';

const reserved = (k: string) => (RESERVED[k] ? `/img/${RESERVED[k]}` : '');

const SLIDES = [
  { to: '/category/fashion?deal=1', bg: '#1E2B3A', eye: 'WINTER OUTER WEEK', h: ['겨울 아우터', '최대 62% 할인'], sub: '패딩·코트·플리스 120여 종, 이번 주 일요일까지', img: reserved('hero0') },
  { to: '/category/fashion?type=knit', bg: '#5A3B2E', eye: 'NEW ARRIVALS', h: ['포근한 니트,', '새로 들어왔어요'], sub: '램스울부터 캐시미어 블렌드까지', img: reserved('hero1') },
  { to: '/category/food?deal=1', bg: '#5B1F1C', eye: '산지직송', h: ['한우·제철 과일', '새벽에 도착'], sub: '밤 11시 전 주문하면 내일 아침 문 앞에', img: reserved('hero2') },
  { to: '/category/digital?deal=1', bg: '#1D1F24', eye: 'DIGITAL SALE', h: ['헤드폰·키보드', '연말 특가'], sub: '노이즈캔슬링 헤드폰 최저가 도전', img: reserved('hero3') },
];

function Hero() {
  const [at, setAt] = useState(0);
  const nav = useNavigate();
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setAt((a) => (a + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, [at, reduce]);
  return (
    <div className="hero" aria-roledescription="carousel" aria-label="기획전">
      {SLIDES.map((s, i) => (
        <button key={i} className={`slide${i === at ? ' on' : ''}`} style={{ background: s.bg, ['--slide-bg' as string]: s.bg }} tabIndex={i === at ? 0 : -1} aria-label={`${s.h.join(' ')} 기획전 보기`} onClick={() => nav(s.to)}>
          <div className="txt">
            <span className="eyebrow">{s.eye}</span>
            <h2>{s.h[0]}<br />{s.h[1]}</h2>
            <span className="sub">{s.sub}</span>
            <span className="go">기획전 보기 →</span>
          </div>
          <div className="ph">{s.img && <img src={s.img} alt="" loading={i ? 'lazy' : 'eager'} />}</div>
        </button>
      ))}
      <div className="dots">
        <span className="num">{at + 1} / {SLIDES.length}</span>
        {SLIDES.map((_, i) => <button key={i} aria-label={`${i + 1}번째 배너`} aria-current={i === at} onClick={() => setAt(i)} />)}
      </div>
    </div>
  );
}

function CategoryIcons() {
  return (
    <nav className="caticons" id="caticons" aria-label="카테고리 바로가기">
      {CATS.filter((c) => c.id !== 'all').map((c) => (
        <Link key={c.id} to={`/category/${c.id}`} className="ci-link">
          <span className="ci">{reserved(`cat_${c.id}`) && <img src={reserved(`cat_${c.id}`)} alt="" loading="lazy" />}</span>
          {c.name}
        </Link>
      ))}
      <Link to="/category/all?deal=1" className="ci-link"><span className="ci">%</span>특가</Link>
    </nav>
  );
}

function Countdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const mid = new Date(now);
  mid.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((mid.getTime() - now.getTime()) / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="clock num" aria-label="자정까지 남은 시간">
      <span>{p(Math.floor(s / 3600))}</span>:<span>{p(Math.floor((s % 3600) / 60))}</span>:<span>{p(s % 60)}</span>
    </div>
  );
}

function Deals() {
  const deals = useMemo(() => {
    const out: Product[] = [];
    const cats = new Set<string>();
    const offs = new Set<number>();
    for (const p of PRODUCTS.filter((x) => x.off >= 35).sort((a, b) => b.sold - a.sold)) {
      if (cats.has(p.cat) || offs.has(p.off)) continue;
      cats.add(p.cat);
      offs.add(p.off);
      out.push(p);
      if (out.length === 3) break;
    }
    return out;
  }, []);
  return (
    <div className="deal">
      <div>
        <h2>오늘만<br />이 가격</h2>
        <Countdown />
        <small>자정이 지나면 원래 가격으로 돌아가요</small>
      </div>
      <div className="deal-list">
        {deals.map((p) => {
          const sold = 48 + ((p.id * 37 + p.stock) % 45);
          return (
            <Link key={p.id} className="deal-item" to={`/products/${p.id}`}>
              <div className="thumb pic"><ProductImage photo={p.photo} /></div>
              <div className="meta">
                <div className="nm">{p.name}</div>
                <div className="price"><span className="off num">{p.off}%</span><span className="now num">{won(p.price)}</span></div>
                <div className="stock"><i style={{ width: `${sold}%` }} /></div>
                <div className="stock-t num">{sold}% 판매 · 남은 수량 {p.stock}개</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function RankingStrip() {
  const [cat, setCat] = useState('all');
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: true });
  const list = useMemo(() => PRODUCTS.filter((p) => cat === 'all' || p.cat === cat).sort((a, b) => b.sold - a.sold).slice(0, 10), [cat]);
  const update = () => {
    const r = ref.current;
    if (r) setEdge({ l: r.scrollLeft > 4, r: r.scrollLeft + r.clientWidth < r.scrollWidth - 4 });
  };
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = 0;
    requestAnimationFrame(update);
  }, [cat]);
  const d = new Date();
  return (
    <section aria-labelledby="rankTitle">
      <div className="sec-head">
        <div>
          <h2 id="rankTitle">실시간 랭킹</h2>
          <p className="num">{d.getHours()}시 {String(d.getMinutes()).padStart(2, '0')}분 기준 · 지난 1시간 판매량 · <Link to="/ranking" className="lnk">전체 랭킹 ›</Link></p>
        </div>
        <div className="tabs">{CATS.map((c) => <button key={c.id} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</button>)}</div>
      </div>
      <div className="rank-wrap">
        {edge.l && <button className="rank-nav l" aria-label="이전 랭킹" onClick={() => ref.current?.scrollBy({ left: -ref.current.clientWidth * 0.9 })}>‹</button>}
        <div className="rank" ref={ref} onScroll={update}>
          {list.map((p, i) => (
            <Link key={p.id} className="rank-item card" to={`/products/${p.id}`}>
              <div className="pic"><ProductImage photo={p.photo} /><span className="no">{i + 1}</span></div>
              <div className="row"><span className="brand">{p.brand}</span><span className={`move num ${p.trend > 0 ? 'up' : 'dn'}`}>{p.trend > 0 ? `▲${p.trend}` : p.trend < 0 ? `▼${-p.trend}` : '–'}</span></div>
              <div className="name">{p.name}</div>
              <div className="price">{p.off ? <span className="off num">{p.off}%</span> : null}<span className="now num">{won(p.price)}</span></div>
            </Link>
          ))}
        </div>
        {edge.r && <button className="rank-nav r" aria-label="다음 랭킹" onClick={() => ref.current?.scrollBy({ left: ref.current.clientWidth * 0.9 })}>›</button>}
      </div>
    </section>
  );
}

const TOP_BRANDS = BRANDS.map((b) => ({ b, s: productsByBrand(b).reduce((a, p) => a + p.sold, 0) })).sort((a, b) => b.s - a.s).map((x) => x.b);
const WEEK_TAGS = ['이번 주 최대 50%', '신상품 단독 할인', '브랜드 쿠폰 10%', '무료배송 위크', '1+1 특가', '회원 전용가', '시즌 오프', '베스트 모음'];
const CAT_SECTIONS: [string, string][] = [['fashion', '#E5487A'], ['digital', '#2F6FE4'], ['living', '#0B8457'], ['food', '#D9822B']];

function BrandWeek() {
  return (
    <section aria-labelledby="bwT">
      <div className="sec-head"><div><h2 id="bwT">이번 주 브랜드 위크</h2><p>브랜드별 할인과 쿠폰을 모았어요</p></div><Link className="lnk" to="/brands">브랜드 전체 ›</Link></div>
      <div className="bweek">
        {TOP_BRANDS.slice(0, 8).map((b, i) => (
          <Link key={b} className="bt" to={`/brands/${encodeURIComponent(b)}`}>
            <div>
              <div className="bn"><BrandMark brand={b} scale={1.1} /></div>
              <div className="hint" style={{ fontSize: 12, marginTop: 4 }}>{b}</div>
              <div className="tg">{WEEK_TAGS[i % WEEK_TAGS.length]}</div>
            </div>
            <div className="ims">{productsByBrand(b).sort((x, y) => y.sold - x.sold).slice(0, 2).map((p) => <div key={p.id}><ProductImage photo={p.photo} /></div>)}</div>
            <span className="cpn">쿠폰 받기 ›</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CategorySections() {
  return (
    <section aria-labelledby="csT">
      <div className="sec-head"><div><h2 id="csT">카테고리별 추천</h2><p>지금 많이 찾는 키워드와 인기 상품</p></div></div>
      {CAT_SECTIONS.map(([c, col]) => {
        const ps = PRODUCTS.filter((p) => p.cat === c).sort((a, b) => b.sold - a.sold);
        const types = [...new Set(ps.map((p) => p.type))].slice(0, 6);
        return (
          <div key={c} className="catsec" style={{ ['--c' as string]: col }}>
            <div className="lft">
              <h3>{catName(c)}</h3>
              <Link className="more" to={`/category/${c}`}>바로가기 ›</Link>
              <div className="hk"><b>HOT 키워드</b>{types.map((t) => <Link key={t} to={`/category/${c}?type=${t}`}>#{TYPE_LABEL[t]}</Link>)}</div>
            </div>
            <div className="rgt">{ps.slice(0, 6).map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </div>
        );
      })}
    </section>
  );
}

function BrandCircles() {
  return (
    <section aria-labelledby="brT">
      <div className="sec-head"><div><h2 id="brT">지금 주목할 브랜드</h2></div><Link className="lnk" to="/brands">더보기 ›</Link></div>
      <div className="bcircles">
        {TOP_BRANDS.slice(0, 16).map((b) => (
          <Link key={b} to={`/brands/${encodeURIComponent(b)}`}>
            <BrandEmblem brand={b} size={64} />
            {b}
            {hashString(b) % 3 === 0 && <span className="cb">쿠폰</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}

const CHIPS: [keyof Filters, string][] = [['rocket', '🚚 내일 도착'], ['free', '무료배송'], ['r45', '별점 4.5 이상'], ['deal', '30% 이상 할인']];
const SORTS: [string, string][] = [['rec', '추천순'], ['sold', '판매량순'], ['low', '낮은 가격순'], ['high', '높은 가격순'], ['rev', '리뷰 많은순']];
interface Filters { rocket: boolean; free: boolean; r45: boolean; deal: boolean }

/** "오늘의 추천" feed: filters, sorts, and spreads similar items apart like a real feed. */
function Feed() {
  const [f, setF] = useState<Filters>({ rocket: false, free: false, r45: false, deal: false });
  const [sort, setSort] = useState('rec');
  const [shown, setShown] = useState(40);
  const list = useMemo(() => {
    let L = PRODUCTS.filter((p) => (!f.rocket || p.rocket) && (!f.free || p.free) && (!f.r45 || p.rating >= 4.5) && (!f.deal || p.off >= 30));
    const key: Record<string, (p: Product) => number> = {
      rec: (p) => -(p.rating * Math.log(p.reviews + 2) + p.off / 20 + (p.rocket ? 1 : 0)), sold: (p) => -p.sold, low: (p) => p.price, high: (p) => -p.price, rev: (p) => -p.reviews,
    };
    L = L.slice().sort((a, b) => key[sort](a) - key[sort](b));
    if (sort === 'rec') {
      const pool = L.slice();
      const out: Product[] = [];
      while (pool.length) {
        const recent = out.slice(-7).map((p) => p.type);
        let i = pool.findIndex((p) => !recent.includes(p.type));
        if (i < 0) i = 0;
        out.push(pool.splice(i, 1)[0]);
      }
      L = out;
    }
    return L;
  }, [f, sort]);
  return (
    <section aria-labelledby="listTitle">
      <div className="sec-head"><div><h2 id="listTitle">오늘의 추천 상품</h2></div><Link className="lnk" to="/category/all">전체 상품 보기 ›</Link></div>
      <div className="bar">
        <div className="chips">
          {CHIPS.map(([k, l]) => (
            <button key={k} className={`chip ${k === 'rocket' ? 'rocket' : ''}`} aria-pressed={f[k]} onClick={() => { setF((x) => ({ ...x, [k]: !x[k] })); setShown(40); }}>{l}</button>
          ))}
        </div>
        <div className="sort">{SORTS.map(([k, l]) => <button key={k} aria-pressed={sort === k} onClick={() => { setSort(k); setShown(40); }}>{l}</button>)}</div>
      </div>
      <div className="count num">상품 {list.length}개</div>
      <div className="grid" style={{ marginTop: 10 }}>
        {list.length ? list.slice(0, shown).map((p) => <ProductCard key={p.id} p={p} />) : <div className="empty">조건에 맞는 상품이 없어요. 필터를 풀어 보세요.</div>}
        {list.length > shown && (
          <button className="btn" style={{ gridColumn: '1/-1', justifySelf: 'center', padding: '12px 40px' }} onClick={() => setShown((s) => s + 40)}>
            상품 더 보기 <span className="num">({shown}/{list.length})</span>
          </button>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  usePageTitle('');
  return (
    <main className="wrap">
      <Hero />
      <CategoryIcons />
      <Deals />
      <RankingStrip />
      <BrandWeek />
      <CategorySections />
      <BrandCircles />
      <Feed />
    </main>
  );
}
