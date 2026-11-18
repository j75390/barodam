import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { catName } from '@/data/catalog';
import { productsByBrand } from '@/data/products';
import { hashString } from '@/lib/random';
import { BrandEmblem, BrandMark } from '@/components/BrandLogo';
import { ProductCard } from '@/components/ProductCard';
import { usePageTitle } from '@/components/usePageTitle';
import { follows } from '@/state/follows';
import { useUI } from '@/state/ui';
import NotFound from './NotFound';

const SORTS: [string, string][] = [['pop', '인기순'], ['low', '낮은가격순'], ['new', '신상품순']];

export default function Brand() {
  const { name = '' } = useParams();
  usePageTitle(name);
  const ui = useUI();
  const list = productsByBrand(name);
  const followed = follows.useIds().includes(name);
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState('pop');
  if (!list.length) return <NotFound message="없는 브랜드예요" />;
  const cats = [...new Set(list.map((p) => p.cat))];
  const avg = (list.reduce((a, p) => a + p.rating, 0) / list.length).toFixed(1);
  const fans = (hashString(name) % 9000) + 1200 + (followed ? 1 : 0);
  const shown = list
    .filter((p) => cat === 'all' || p.cat === cat)
    .sort((a, b) => (sort === 'pop' ? b.sold - a.sold : sort === 'low' ? a.price - b.price : b.id - a.id));
  return (
    <main className="wrap" id="page">
      <div className="crumb"><Link to="/">홈</Link> › <Link to="/brands">브랜드</Link> › {name}</div>
      <div className="bhead">
        <BrandEmblem brand={name} size={96} className="emb blogo" />
        <div>
          <BrandMark brand={name} scale={1.3} />
          <h1 style={{ marginTop: 6 }}>{name}</h1>
          <div className="st2 num">상품 {list.length}개 · 평균 별점 ★{avg} · 좋아요 {fans.toLocaleString()}</div>
          <div className="st2">{cats.map(catName).join(' · ')} 브랜드</div>
        </div>
        <button className={`btn ${followed ? '' : 'primary'}`} onClick={() => ui.toast(follows.toggle(name) ? '브랜드를 좋아요했어요' : '좋아요를 취소했어요')}>
          {followed ? '♥ 좋아요 중' : '♡ 브랜드 좋아요'}
        </button>
      </div>
      <div className="rowb" style={{ margin: '0 0 12px' }}>
        <div className="bfilter" style={{ margin: 0 }}>
          <button aria-pressed={cat === 'all'} onClick={() => setCat('all')}>전체</button>
          {cats.map((c) => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>{catName(c)}</button>)}
        </div>
        <div className="sort">{SORTS.map(([k, l]) => <button key={k} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>)}</div>
      </div>
      <div className="grid">{shown.map((p) => <ProductCard key={p.id} p={p} detail />)}</div>
    </main>
  );
}
