import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CATS } from '@/data/catalog';
import { BRANDS, productsByBrand } from '@/data/products';
import { hashString } from '@/lib/random';
import { BrandEmblem } from '@/components/BrandLogo';
import { usePageTitle } from '@/components/usePageTitle';
import { follows } from '@/state/follows';

export default function Brands() {
  usePageTitle('브랜드');
  const [f, setF] = useState('all');
  const followed = follows.useIds();
  const rows = BRANDS.map((b) => ({ b, ps: productsByBrand(b) }))
    .filter((x) => (f === 'follow' ? followed.includes(x.b) : f === 'all' || x.ps.some((p) => p.cat === f)))
    .map((x) => ({ ...x, s: x.ps.reduce((a, p) => a + p.sold, 0) }))
    .sort((a, b) => b.s - a.s);
  return (
    <main className="wrap" id="page">
      <div className="crumb"><Link to="/">홈</Link> › 브랜드</div>
      <h1 className="ptitle">브랜드</h1>
      <div className="bfilter">
        {CATS.map((c) => <button key={c.id} aria-pressed={f === c.id} onClick={() => setF(c.id)}>{c.name}</button>)}
        {followed.length > 0 && <button aria-pressed={f === 'follow'} onClick={() => setF('follow')}>♥ 좋아요한 브랜드</button>}
      </div>
      <div className="bcircles">
        {rows.map(({ b, ps }) => (
          <Link key={b} to={`/brands/${encodeURIComponent(b)}`}>
            <BrandEmblem brand={b} size={64} />
            {b}
            <span className="hint num">{ps.length}개 상품</span>
            {hashString(b) % 3 === 0 && <span className="cb">쿠폰</span>}
          </Link>
        ))}
      </div>
    </main>
  );
}
