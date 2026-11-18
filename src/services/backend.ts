import type { Address, Inquiry, Order, OrderItem, Payment, Review, User } from '@/types';

/** Result type for operations that can fail with a user-facing message. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export const ok = <T,>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never,>(error: string): Result<T> => ({ ok: false, error });

export interface SignUpInput {
  id: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  marketing: boolean;
}

export interface PlaceOrderInput {
  items: OrderItem[];
  sub: number;
  disc: number;
  ship: number;
  couponId: string | null;
  couponAmount: number;
  usePoints: number;
  pay: Payment;
  addr: Order['addr'];
  memo: string;
}

export interface GuestOrderInput extends Omit<PlaceOrderInput, 'couponId' | 'couponAmount' | 'usePoints'> {
  buyer: { name: string; phone: string; email: string };
  password: string;
}

export interface GuestOrder extends Order {
  buyer: { name: string; phone: string; email: string };
}

/** Public product feedback shown on product pages (everyone's, not just the viewer's). */
export interface PublicReview extends Review {
  mine: boolean;
}
export interface PublicInquiry extends Inquiry {
  mine: boolean;
}

/**
 * Everything the UI needs from a backend. Screens only talk to this interface,
 * so the browser-storage implementation can be swapped for Supabase without UI changes.
 */
export interface Backend {
  readonly kind: 'local' | 'supabase';
  /** resolves once a saved login session has been restored */
  readonly ready?: Promise<void>;
  /** current signed-in user (aggregate), or null */
  currentUser(): User | null;
  /** subscribe to user changes; returns unsubscribe */
  subscribe(cb: () => void): () => void;

  signUp(input: SignUpInput): Promise<Result<User>>;
  signIn(id: string, password: string, keep: boolean): Promise<Result<User>>;
  signOut(): Promise<void>;
  isIdTaken(id: string): Promise<boolean>;
  findId(name: string, email: string): Promise<Result<{ id: string; joined: number }>>;
  verifyForReset(id: string, email: string): Promise<Result<true>>;
  resetPassword(id: string, email: string, password: string): Promise<Result<true>>;
  changePassword(current: string, next: string): Promise<Result<true>>;
  updateProfile(patch: Pick<User, 'name' | 'email' | 'phone' | 'marketing'>): Promise<Result<true>>;
  withdraw(password: string): Promise<Result<true>>;

  saveAddress(a: Omit<Address, 'id'> & { id?: string }): Promise<Result<Address>>;
  removeAddress(id: string): Promise<void>;
  setDefaultAddress(id: string): Promise<void>;

  registerCouponCode(code: string): Promise<Result<string>>;

  placeOrder(input: PlaceOrderInput): Promise<Result<Order>>;
  cancelOrder(no: string): Promise<Result<true>>;
  confirmOrder(no: string): Promise<Result<number>>;

  writeReview(r: { orderNo: string; k: number; star: number; txt: string }): Promise<Result<true>>;
  deleteReview(id: string): Promise<void>;
  reviewsFor(pid: number): Promise<PublicReview[]>;

  ask(q: { pid: number | null; cat: string; title: string; body: string }): Promise<Result<true>>;
  deleteInquiry(id: string): Promise<void>;
  inquiriesFor(pid: number): Promise<PublicInquiry[]>;

  addRecent(pid: number): void;
  clearRecent(): void;

  placeGuestOrder(input: GuestOrderInput): Promise<Result<GuestOrder>>;
  lookupGuestOrder(no: string, password: string): Promise<Result<GuestOrder>>;
  getGuestOrder(no: string): GuestOrder | null;
  cancelGuestOrder(no: string): Promise<Result<true>>;
}
