import type { Product } from '@/types';
import { NICKNAMES, SELLERS } from '@/data/catalog';
import { REVIEW_ENDINGS, REVIEW_KEYWORDS, REVIEW_PHRASES } from '@/data/productContent';
import { lcg } from '@/lib/random';

export interface GeneratedReview {
  id: string;
  who: string;
  star: number;
  txt: string;
  t: number;
  opt: string;
  help: number;
  size: string | null;
  color: string | null;
  photo: boolean;
}

/** Deterministic sample reviews for a product (count grows with its review total). */
export function generateReviews(p: Product, now = Date.now()): GeneratedReview[] {
  const r = lcg(p.id * 7919 + 13);
  const n = Math.min(48, Math.max(6, Math.round(Math.sqrt(p.reviews) * 1.6)));
  const pool = REVIEW_PHRASES[p.cat];
  const p5 = Math.max(0.3, Math.min(0.95, (p.rating - 3.7) / 1.3));
  const out: GeneratedReview[] = [];
  for (let i = 0; i < n; i++) {
    const y = r();
    const star = r() < p5 ? 5 : y < 0.7 ? 4 : y < 0.9 ? 3 : y < 0.97 ? 2 : 1;
    const t1 = pool[Math.floor(r() * pool.length)];
    const t2 = pool[Math.floor(r() * pool.length)];
    out.push({
      id: `g${p.id}_${i}`,
      who: NICKNAMES[Math.floor(r() * NICKNAMES.length)],
      star,
      txt: `${star <= 3 ? `${pool[pool.length - 1]}. ` : ''}${t1}. ${t2 !== t1 ? `${t2}. ` : ''}${REVIEW_ENDINGS[Math.floor(r() * REVIEW_ENDINGS.length)]}`.trim(),
      t: now - Math.floor(r() * 120 + i * 2) * 864e5,
      opt: [p.colors?.[Math.floor(r() * p.colors.length)], p.sizes?.[Math.floor(r() * p.sizes.length)]].filter(Boolean).join(' / ') || '기본',
      help: Math.floor(Math.pow(r(), 3) * 60),
      size: p.sizes ? ['정사이즈예요', '정사이즈예요', '정사이즈예요', '조금 커요', '조금 작아요'][Math.floor(r() * 5)] : null,
      color: p.colors ? ['화면과 같아요', '화면과 같아요', '조금 밝아요', '조금 어두워요'][Math.floor(r() * 4)] : null,
      photo: r() < 0.18,
    });
  }
  return out;
}

/** "많이 나온 말" keyword summary. */
export function reviewKeywords(p: Product): { t: string; v: number }[] {
  const [pos, extra] = REVIEW_KEYWORDS[p.cat];
  const r = lcg(p.id * 7 + 3);
  return [...pos, ...extra].slice(0, 4).map((t, i) => ({ t, v: Math.round(88 - i * 14 - r() * 8) }));
}

export interface SellerOffer {
  seller: string;
  price: number;
  ship: string;
  lowest: boolean;
}

/** Price comparison across sellers; 바로담 직배송 always sells at the product price. */
export function sellerOffers(p: Product): SellerOffer[] {
  const r = lcg(p.id * 13);
  const shuffled = SELLERS.slice().sort(() => r() - 0.5).slice(0, 4);
  const rows = shuffled.map((s) => ({
    seller: s,
    price: s === '바로담 직배송' ? p.price : Math.round((p.price * (1 + r() * 0.18 - 0.03)) / 10) * 10,
    ship: r() < 0.6 ? '무료배송' : '배송비 3,000원',
  }));
  if (!rows.some((x) => x.seller === '바로담 직배송')) rows[0] = { seller: '바로담 직배송', price: p.price, ship: p.free ? '무료배송' : '배송비 3,000원' };
  const min = Math.min(...rows.map((x) => x.price));
  return rows.sort((a, b) => a.price - b.price).map((x) => ({ ...x, lowest: x.price === min }));
}
