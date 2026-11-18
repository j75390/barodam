import type { GuestOrder } from './backend';
import type { Application, ApplicationStatus } from './careers';
import { koreanError, supabase } from './supabaseClient';

export interface Overview {
  members: number;
  membersToday: number;
  ordersToday: number;
  salesToday: number;
  salesTotal: number;
  ordersTotal: number;
  cancelled: number;
  pendingInquiries: number;
  newApplications: number;
  recruitInquiries: number;
  reviews: number;
}
export type AdminOrder = Omit<GuestOrder, 'buyer' | 'cancelledAt' | 'confirmedAt'> & {
  buyer?: GuestOrder['buyer'];
  cancelledAt: number | null;
  confirmedAt: number | null;
  step: 'paid' | 'ready' | 'ship' | 'done' | 'confirmed' | 'cancel';
  member: string | null;
  memberName: string | null;
};
export interface AdminInquiry {
  id: string;
  pid: number | null;
  cat: string;
  title: string;
  body: string;
  t: number;
  who: string;
  member: string;
  answer: string | null;
  answeredAt: number | null;
}
export interface AdminReview { id: string; pid: number; name: string; opt: string; star: number; txt: string; t: number; who: string }
export type AdminApplication = Application & { status: ApplicationStatus; cancelledAt?: number };
export interface RecruitInquiry { id: number; name: string; email: string; type: string; body: string; at: number }

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw new Error(koreanError(error.message));
  return data as T;
}

/** Operator console calls. Every function re-checks the admin flag on the server. */
export const admin = {
  overview: () => call<Overview>('admin_overview'),
  orders: (limit = 200) => call<AdminOrder[]>('admin_orders', { p_limit: limit }),
  cancelOrder: (no: string) => call<null>('admin_cancel_order', { p_no: no }),
  inquiries: (pending = false) => call<AdminInquiry[]>('admin_inquiries', { p_pending: pending }),
  answer: (id: string, text: string) => call<null>('answer_inquiry', { p_id: id, p_answer: text }),
  reviews: () => call<AdminReview[]>('admin_reviews'),
  deleteReview: (id: string) => call<null>('admin_delete_review', { p_id: id }),
  applications: () => call<AdminApplication[]>('admin_applications'),
  setApplication: (no: string, status: ApplicationStatus) => call<null>('admin_set_application', { p_no: no, p_status: status }),
  recruitInquiries: () => call<RecruitInquiry[]>('admin_recruit_inquiries'),
};
