import { local } from '@/lib/storage';

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
}

const KEY = 'bd_apps';
const all = () => local.get<Application[]>(KEY, []);

/** Applications stay in this browser until the Supabase backend is connected. */
export const careersService = {
  submit(a: Omit<Application, 'no' | 'at'>): { ok: true; app: Application } | { ok: false; error: string } {
    const list = all();
    if (list.some((x) => x.jobId === a.jobId && x.email === a.email && !x.cancelledAt)) {
      return { ok: false, error: '이 이메일로 이미 지원한 포지션이에요. [지원 현황 조회]에서 확인해 주세요.' };
    }
    const app: Application = { ...a, no: `BD${String(Date.now()).slice(-8)}`, at: Date.now() };
    local.set(KEY, [app, ...list]);
    return { ok: true, app };
  },
  lookup(email: string, no: string): Application | null {
    return all().find((x) => x.email === email && x.no === no.toUpperCase()) ?? null;
  },
  cancel(no: string): void {
    local.set(KEY, all().map((x) => (x.no === no ? { ...x, cancelledAt: Date.now() } : x)));
  },
  /** 0 = 접수 완료, 1 = 서류 검토 중 (after an hour), -1 = cancelled */
  step(a: Application, now = Date.now()): number {
    if (a.cancelledAt) return -1;
    return (now - a.at) / 36e5 < 1 ? 0 : 1;
  },
  inquire(q: { name: string; email: string; type: string; body: string }): void {
    local.set('bd_recruit_q', [{ ...q, at: Date.now() }, ...local.get<unknown[]>('bd_recruit_q', [])]);
  },
};
