import { mergeShopping } from './shoppingSync';
import type { CartLine } from '@/types';

const line = (id: number, qty: number): CartLine => ({ key: `${id}||`, id, color: null, size: null, qty, selected: true });

describe('mergeShopping', () => {
  it('adds what a guest collected to the member cart without duplicating lines', () => {
    const m = mergeShopping(
      { cart: [line(1, 1), line(2, 3)], wish: [10], follows: ['모노픽'] },
      { cart: [line(2, 1), line(3, 2)], wish: [10, 11], follows: ['노스폴드'] },
    );
    expect(m.cart.map((l) => [l.id, l.qty])).toEqual([[1, 1], [2, 3], [3, 2]]);
    expect(m.wish).toEqual([10, 11]);
    expect(m.follows).toEqual(['모노픽', '노스폴드']);
  });
  it('keeps the larger quantity for the same option', () => {
    expect(mergeShopping({ cart: [line(5, 1)], wish: [], follows: [] }, { cart: [line(5, 4)], wish: [], follows: [] }).cart[0].qty).toBe(4);
  });
});
