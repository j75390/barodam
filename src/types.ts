// Domain types shared across the app.

export type CategoryId = 'fashion' | 'shoes' | 'bag' | 'digital' | 'living' | 'beauty' | 'food';

export interface Category {
  id: CategoryId | 'all';
  name: string;
}

export interface Product {
  id: number;
  cat: CategoryId;
  type: string;
  brand: string;
  name: string;
  /** path under /img, e.g. "gen/p025.jpg" */
  photo: string;
  hue: number;
  /** list price before discount */
  base: number;
  /** discount percent */
  off: number;
  price: number;
  colors: string[] | null;
  sizes: string[] | null;
  soldOut: string[];
  rating: number;
  reviews: number;
  sold: number;
  /** "내일 도착" eligible */
  rocket: boolean;
  /** dawn (새벽) delivery */
  dawn: boolean;
  free: boolean;
  stock: number;
  /** ranking movement */
  trend: number;
}

export interface CartLine {
  key: string;
  id: number;
  color: string | null;
  size: string | null;
  qty: number;
  selected: boolean;
}

export interface Address {
  id: string;
  label: string;
  to: string;
  phone: string;
  zip: string;
  a1: string;
  a2: string;
  def: boolean;
}

export type CouponType = 'rate' | 'won' | 'ship';

export interface Coupon {
  id: string;
  name: string;
  type: CouponType;
  val: number;
  min: number;
  max?: number;
  cat?: CategoryId;
  got: number;
  exp: number;
  used: number | null;
}

export interface PointLog {
  t: number;
  amt: number;
  why: string;
  bal: number;
}

export interface OrderItem {
  pid: number;
  name: string;
  photo: string;
  type: string;
  hue: number;
  color: string | null;
  size: string | null;
  qty: number;
  price: number;
  base: number;
}

export type PayMethod = 'card' | 'baro' | 'bank' | 'phone';

export interface Payment {
  m: PayMethod;
  d: string;
  acct?: string;
}

export interface Order {
  no: string;
  at: number;
  items: OrderItem[];
  sub: number;
  disc: number;
  cpAmt: number;
  cp: string | null;
  cpId: string | null;
  usePts: number;
  ship: number;
  total: number;
  earn: number;
  pay: Payment;
  addr: Omit<Address, 'id' | 'def' | 'label'> & { label?: string };
  memo: string;
  inv: string;
  cancelledAt?: number;
  confirmedAt?: number;
}

export interface Review {
  id: string;
  oid: string;
  k: number;
  pid: number;
  name: string;
  opt: string;
  star: number;
  txt: string;
  t: number;
  who: string;
}

export interface Inquiry {
  id: string;
  pid: number | null;
  cat: string;
  title: string;
  body: string;
  t: number;
  who: string;
  /** written by the operator in the admin console */
  answer?: string | null;
  answeredAt?: number | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  joined: number;
  marketing: boolean;
  points: number;
  plog: PointLog[];
  coupons: Coupon[];
  addrs: Address[];
  orders: Order[];
  reviews: Review[];
  qna: Inquiry[];
  recent: number[];
  usedCodes: string[];
  /** cart, wishlist and followed brands, kept on the server so they follow the member */
  shopping: Shopping;
  /** operator account (admin console) */
  isAdmin?: boolean;
}

export interface Shopping {
  cart: CartLine[];
  wish: number[];
  follows: string[];
}

export type OrderStateKey = 'paid' | 'ready' | 'ship' | 'done' | 'confirmed' | 'cancel';

export interface OrderState {
  k: OrderStateKey;
  label: string;
  /** step index 0..3, -1 when cancelled */
  i: number;
}
