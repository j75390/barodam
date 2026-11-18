import { useMemo } from 'react';
import type { OrderItem, Product } from '@/types';
import { productById } from '@/data/products';
import { session } from '@/lib/storage';
import { CHECKOUT_KEY, type CheckoutDraft } from '@/components/CartDrawer';

export interface CheckoutLine {
  key: string;
  p: Product;
  color: string | null;
  size: string | null;
  qty: number;
}

/** Lines the visitor is about to buy (from the cart or 바로 구매), read from session storage. */
export function useCheckoutLines(): { draft: CheckoutDraft | null; lines: CheckoutLine[] } {
  return useMemo(() => {
    const draft = session.get<CheckoutDraft | null>(CHECKOUT_KEY, null);
    const lines: CheckoutLine[] = [];
    for (const l of draft?.lines ?? []) {
      const p = productById(l.id);
      if (p) lines.push({ key: l.key, p, color: l.color, size: l.size, qty: l.qty });
    }
    return { draft, lines };
  }, []);
}

export const toOrderItems = (lines: CheckoutLine[]): OrderItem[] =>
  lines.map((l) => ({ pid: l.p.id, name: l.p.name, photo: l.p.photo, type: l.p.type, hue: l.p.hue, color: l.color, size: l.size, qty: l.qty, price: l.p.price, base: l.p.base }));

export const BANKS = ['바로은행', '누리은행', '미래은행', '온새미은행'];
export const CARDS = ['바로카드', '누리카드', '미래카드', '온새미카드'];
export const PAY_METHODS: [string, string][] = [['card', '신용·체크카드'], ['baro', '바로페이'], ['bank', '무통장 입금'], ['phone', '휴대폰 결제']];
export const MEMOS = ['문 앞에 놓아 주세요', '경비실에 맡겨 주세요', '택배함에 넣어 주세요', '배송 전에 연락 주세요'];

export function virtualAccount(bank: string): string {
  const r = (n: number) => String(Math.floor(Math.random() * 9 * 10 ** (n - 1)) + 10 ** (n - 1));
  return `${bank} 0${r(3)}-${r(6)}-${r(2)} (가상계좌 · 예금주 (주)바로담)`;
}
