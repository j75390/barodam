import type { Backend } from '@/services/backend';
import type { CartLine, Shopping } from '@/types';
import { cart, wish } from './cart';
import { follows } from './follows';

/** Guest cart lines and the member's saved lines are merged on sign-in; quantities take the larger value. */
export function mergeShopping(server: Shopping, guest: Shopping): Shopping {
  const lines = new Map<string, CartLine>(server.cart.map((l) => [l.key, l]));
  for (const l of guest.cart) {
    const s = lines.get(l.key);
    lines.set(l.key, s ? { ...s, qty: Math.max(s.qty, l.qty), selected: true } : l);
  }
  return {
    cart: [...lines.values()].slice(0, 100),
    wish: [...new Set([...server.wish, ...guest.wish])],
    follows: [...new Set([...server.follows, ...guest.follows])],
  };
}

const sameShopping = (a: Shopping, b: Shopping) => JSON.stringify(a) === JSON.stringify(b);
const current = (): Shopping => ({ cart: cart.get(), wish: wish.get(), follows: follows.get() });

/**
 * Keeps the browser cart / wishlist / followed brands in step with the signed-in member, like a real shop:
 * - signing in merges what a guest collected into the member's saved cart,
 * - every later change is saved to the server,
 * - signing out empties them on this device (the member's copy stays on the server).
 */
export function startShoppingSync(be: Backend): () => void {
  let member: string | null = null;
  let applying = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const push = () => {
    if (!member || applying) return;
    clearTimeout(timer);
    timer = setTimeout(() => be.saveShopping(current()), 400);
  };
  const apply = (s: Shopping) => {
    applying = true;
    cart.replace(s.cart);
    wish.replace(s.wish);
    follows.replace(s.follows);
    applying = false;
  };
  const onUser = () => {
    const u = be.currentUser();
    const id = u?.id ?? null;
    if (id === member) return;
    if (u && !member) {
      const merged = mergeShopping(u.shopping, current());
      member = id;
      apply(merged);
      if (!sameShopping(merged, u.shopping)) be.saveShopping(merged);
    } else if (!u && member) {
      member = null;
      apply({ cart: [], wish: [], follows: [] });
    } else {
      member = id;
      if (u) apply(u.shopping);
    }
  };
  onUser();
  const offs = [be.subscribe(onUser), cart.subscribe(push), wish.subscribe(push), follows.subscribe(push)];
  return () => offs.forEach((off) => off());
}
