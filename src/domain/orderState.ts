import type { Order, OrderState } from '@/types';

export const ORDER_STEPS = ['결제완료', '상품준비중', '배송중', '배송완료'] as const;
/** minutes after payment when each step starts (compressed timeline so a demo order progresses while you watch) */
export const STEP_MINUTES = [0, 1, 3, 10] as const;
const KEYS = ['paid', 'ready', 'ship', 'done'] as const;

export function orderState(o: Pick<Order, 'at' | 'cancelledAt' | 'confirmedAt'>, now = Date.now()): OrderState {
  if (o.cancelledAt) return { k: 'cancel', label: '주문취소', i: -1 };
  if (o.confirmedAt) return { k: 'confirmed', label: '구매확정', i: 3 };
  const minutes = (now - o.at) / 60000;
  let i = 0;
  STEP_MINUTES.forEach((t, k) => {
    if (minutes >= t) i = k;
  });
  return { k: KEYS[i], label: ORDER_STEPS[i], i };
}

export const canCancel = (s: OrderState): boolean => s.k === 'paid' || s.k === 'ready';
export const canConfirm = (s: OrderState): boolean => s.k === 'done';
export const isDelivered = (s: OrderState): boolean => s.k === 'done' || s.k === 'confirmed';

export interface TrackEvent {
  t: number;
  what: string;
  place: string;
  desc: string;
}

const EVENTS: [number, string, string, string][] = [
  [0, '결제완료', '바로담 마켓', '주문 결제가 완료되었어요'],
  [1, '상품준비중', '바로담 물류센터', '상품을 포장하고 있어요'],
  [3, '집하', '바로담 물류센터', '택배사에 상품이 전달되었어요'],
  [4, '간선상차', '중부 허브', '배송지 지역으로 이동 중이에요'],
  [7, '배송출발', '도착지 담당 대리점', '배송 기사님이 출발했어요'],
  [10, '배송완료', '문 앞', '고객님이 요청하신 장소에 배송되었어요'],
];

/** Delivery tracking log, newest first. */
export function trackingLog(o: Pick<Order, 'at' | 'cancelledAt' | 'confirmedAt'>, now = Date.now()): TrackEvent[] {
  if (o.cancelledAt) return [{ t: o.cancelledAt, what: '주문취소', place: '', desc: '주문이 취소되고 결제가 환불되었어요' }];
  const minutes = o.confirmedAt ? Infinity : (now - o.at) / 60000;
  return EVENTS.filter((e) => minutes >= e[0])
    .map(([m, what, place, desc]) => ({ t: o.at + m * 60000, what, place, desc }))
    .reverse();
}
