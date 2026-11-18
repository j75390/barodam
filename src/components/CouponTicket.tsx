import type { Coupon } from '@/types';
import { catName } from '@/data/catalog';
import { fmtDate, won } from '@/lib/format';

export function CouponTicket({ c }: { c: Coupon }) {
  const now = Date.now();
  const off = !!c.used || c.exp < now;
  const big = c.type === 'rate' ? `${c.val}%` : c.type === 'ship' ? '무료' : `${c.val / 1000}천원`;
  const small = c.type === 'ship' ? '배송' : '할인';
  return (
    <div className={`cp${off ? ' off' : ''}`}>
      <div className="v num">{big}<small>{small}</small></div>
      <div className="d">
        <b>{c.name}</b>
        {c.min ? `${won(c.min)} 이상 구매 시` : '금액 조건 없음'}
        {c.max ? ` · 최대 ${won(c.max)}` : ''}
        {c.cat ? ` · ${catName(c.cat)} 전용` : ''}
        <div className="hint num">{c.used ? `${fmtDate(c.used)} 사용함` : c.exp < now ? '기간 만료' : `${fmtDate(c.exp)}까지 · D-${Math.ceil((c.exp - now) / 864e5)}`}</div>
      </div>
    </div>
  );
}
