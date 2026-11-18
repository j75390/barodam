import type { OrderItem, Payment } from '@/types';

export const optionText = (i: Pick<OrderItem, 'color' | 'size'>): string =>
  [i.color, i.size && `사이즈 ${i.size}`].filter(Boolean).join(' · ') || '기본';

const PAY_NAMES: Record<Payment['m'], string> = { card: '신용·체크카드', baro: '바로페이', bank: '무통장 입금', phone: '휴대폰 결제' };
export const payName = (p: Payment): string => PAY_NAMES[p.m] + (p.d ? ` (${p.d})` : '');

/** Inquiry answers: product questions get the seller reply, 1:1 inquiries a category answer. Shown 2 minutes after asking. */
