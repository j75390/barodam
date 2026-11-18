import type { OrderItem, Payment } from '@/types';

export const optionText = (i: Pick<OrderItem, 'color' | 'size'>): string =>
  [i.color, i.size && `사이즈 ${i.size}`].filter(Boolean).join(' · ') || '기본';

const PAY_NAMES: Record<Payment['m'], string> = { card: '신용·체크카드', baro: '바로페이', bank: '무통장 입금', phone: '휴대폰 결제' };
export const payName = (p: Payment): string => PAY_NAMES[p.m] + (p.d ? ` (${p.d})` : '');

/** Inquiry answers: product questions get the seller reply, 1:1 inquiries a category answer. Shown 2 minutes after asking. */
export const isAnswered = (q: { t: number }, now = Date.now()): boolean => now - q.t > 120000;

export function inquiryAnswer(q: { pid: number | null; cat: string }): string {
  if (q.pid) return '안녕하세요, 바로담입니다. 문의하신 상품은 현재 정상 판매 중이며 평일 오후 2시 이전 주문은 당일 출고돼요. 사이즈·색상은 상세페이지 옵션을 참고해 주세요. 감사합니다.';
  const A: Record<string, string> = {
    '주문/결제': '안녕하세요, 바로담입니다. 결제 내역과 영수증은 마이페이지 > 주문·배송 > 주문 상세에서 확인하실 수 있어요.',
    배송: '안녕하세요, 바로담입니다. 배송 현황은 주문 상세의 배송조회에서 실시간으로 확인하실 수 있어요.',
    '취소/반품/교환': '안녕하세요, 바로담입니다. 배송 출발 전까지는 주문 상세에서 바로 취소하실 수 있어요. 반품은 배송완료 후 7일 이내 접수해 주세요.',
  };
  return A[q.cat] ?? '안녕하세요, 바로담입니다. 문의 주셔서 감사합니다. 확인 후 안내드린 내용으로 처리해 드렸어요.';
}
