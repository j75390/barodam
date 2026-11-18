import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Product } from '@/types';
import { CATS } from '@/data/catalog';
import { PRODUCTS } from '@/data/products';
import { ProductCard } from '@/components/ProductCard';
import { usePageTitle } from '@/components/usePageTitle';

const PERIODS: [string, string][] = [['now', '실시간'], ['day', '일간'], ['week', '주간']];

/** Ranking page: period and category tabs (kept in the URL). */
export default function Ranking() {
  usePageTitle('바로담 랭킹');
  const [sp, setSp] = useSearchParams();
  const period = sp.get('period') ?? 'now';
  const cat = sp.get('cat') ?? 'all';
  const seed = { now: 0, day: 1, week: 2 }[period] ?? 0;
  const list = useMemo(() => {
    const score = (p: Product) => p.sold * (1 + ((p.id * (seed + 3)) % 7) / 10) + p.reviews / (seed + 1);
    return PRODUCTS.filter((p) => cat === 'all' || p.cat === cat).sort((a, b) => score(b) - score(a)).slice(0, 60);
  }, [cat, seed]);
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp);
    n.set(k, v);
    setSp(n);
  };
  const d = new Date();
  return (
    <main className="wrap" id="page">
      <div className="crumb">홈 › 랭킹</div>
      <div className="rkhead">
        <div>
          <h1 className="ptitle" style={{ margin: 0 }}>바로담 랭킹</h1>
          <p className="hint num" style={{ margin: '4px 0 0' }}>{period === 'now' ? `${d.getHours()}:00 기준 · 1시간마다 업데이트` : period === 'day' ? '어제 판매량 기준' : '최근 7일 판매량 기준'}</p>
        </div>
        <div className="filters" style={{ margin: 0 }}>{PERIODS.map(([k, l]) => <button key={k} aria-pressed={period === k} onClick={() => set('period', k)}>{l}</button>)}</div>
      </div>
      <div className="bfilter">{CATS.map((c) => <button key={c.id} aria-pressed={cat === c.id} onClick={() => set('cat', c.id)}>{c.name}</button>)}</div>
      <div className="rkgrid">
        {list.map((p, i) => {
          const tr = ((p.id * 7 + seed * 3) % 11) - 3;
          return (
            <ProductCard key={p.id} p={p} rank={i + 1}
              above={<div className={`trend ${tr > 0 ? 'up' : 'dn'} num`}>{tr > 0 ? `▲ ${tr}` : tr < 0 ? `▼ ${-tr}` : i < 3 ? 'NEW' : '–'}</div>} />
          );
        })}
      </div>
    </main>
  );
}
