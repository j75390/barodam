import { local, session } from '@/lib/storage';
import { koreanError, supabase, useSupabase } from './supabaseClient';

export interface Application {
  no: string;
  jobId: string;
  title: string;
  name: string;
  email: string;
  phone: string;
  route: string;
  files: { resume: { name: string; size: number } | null; portfolio: { name: string; size: number } | null };
  url: string;
  years: string;
  motive: string;
  veteran: string;
  disability: string;
  agree: { optional: boolean; sensitive: boolean; pool: boolean };
  at: number;
  cancelledAt?: number;
  /** set by the recruiter in the admin console */
  status?: ApplicationStatus;
  statusAt?: number | null;
}

export const APPLICATION_STATUSES = ['접수 완료', '서류 검토 중', '면접 진행', '최종 합격', '불합격'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type NewApplication = Omit<Application, 'no' | 'at'>;
type Submit = { ok: true; app: Application } | { ok: false; error: string };

export interface CareersService {
  submit(a: NewApplication): Promise<Submit>;
  lookup(email: string, no: string): Promise<Application | null>;
  cancel(email: string, no: string): Promise<{ ok: boolean; error?: string }>;
  inquire(q: { name: string; email: string; type: string; body: string }): Promise<void>;
  /** the application just submitted in this tab (completion page) */
  recent(no: string): Application | null;
  /** -1 cancelled · 0 접수 · 1 서류 검토 · 2 면접 · 3 최종 결과 */
  step(a: Application, now?: number): number;
  label(a: Application): string;
}

const LAST = 'bd_app_last';
const step = (a: Application, now = Date.now()) => {
  if (a.cancelledAt) return -1;
  if (a.status) return Math.min(3, APPLICATION_STATUSES.indexOf(a.status));
  return (now - a.at) / 36e5 < 1 ? 0 : 1; // browser-only mode has no recruiter
};
const label = (a: Application) => (a.cancelledAt ? '지원 취소' : a.status ?? ['접수 완료', '서류 검토 중'][step(a)]);
const recent = (no: string) => {
  const a = session.get<Application | null>(LAST, null);
  return a && a.no === no ? a : null;
};
const tidy = (a: Application & { cancelledAt?: number | null }): Application => {
  const { cancelledAt, ...rest } = a;
  return cancelledAt ? { ...rest, cancelledAt } : rest;
};

/** Applications stored in this browser (offline development). */
const KEY = 'bd_apps';
const all = () => local.get<Application[]>(KEY, []);
const localService: CareersService = {
  async submit(a) {
    const list = all();
    if (list.some((x) => x.jobId === a.jobId && x.email === a.email && !x.cancelledAt)) {
      return { ok: false, error: '이 이메일로 이미 지원한 포지션이에요. [지원 현황 조회]에서 확인해 주세요.' };
    }
    const app: Application = { ...a, no: `BD${String(Date.now()).slice(-8)}`, at: Date.now() };
    local.set(KEY, [app, ...list]);
    session.set(LAST, app);
    return { ok: true, app };
  },
  async lookup(email, no) {
    return all().find((x) => x.email === email && x.no === no.toUpperCase()) ?? null;
  },
  async cancel(_email, no) {
    local.set(KEY, all().map((x) => (x.no === no ? { ...x, cancelledAt: Date.now() } : x)));
    return { ok: true };
  },
  async inquire(q) {
    local.set('bd_recruit_q', [{ ...q, at: Date.now() }, ...local.get<unknown[]>('bd_recruit_q', [])]);
  },
  recent,
  step,
  label,
};

/** Applications stored on the server; only reachable through e-mail + application number. */
const serverService: CareersService = {
  async submit(a) {
    const { data, error } = await supabase().rpc('submit_application', { p: a });
    if (error) return { ok: false, error: koreanError(error.message) };
    const app = tidy(data as Application);
    session.set(LAST, app);
    return { ok: true, app };
  },
  async lookup(email, no) {
    const { data } = await supabase().rpc('lookup_application', { p_email: email, p_no: no });
    return data ? tidy(data as Application) : null;
  },
  async cancel(email, no) {
    const { error } = await supabase().rpc('cancel_application', { p_email: email, p_no: no });
    return error ? { ok: false, error: koreanError(error.message) } : { ok: true };
  },
  async inquire(q) {
    const { error } = await supabase().rpc('recruit_inquire', { p_name: q.name, p_email: q.email, p_type: q.type, p_body: q.body });
    if (error) throw new Error(koreanError(error.message));
  },
  recent,
  step,
  label,
};

export const careersService: CareersService = useSupabase ? serverService : localService;
