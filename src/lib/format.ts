export const won = (n: number): string => `${n.toLocaleString('ko-KR')}원`;

const pad = (n: number) => String(n).padStart(2, '0');

/** 2026.11.19 */
export const fmtDate = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
};

/** 2026.11.19 14:05 */
export const fmtDateTime = (t: number): string => {
  const d = new Date(t);
  return `${fmtDate(t)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const DAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 11/21(토) */
export const fmtMonthDay = (d: Date): string => `${d.getMonth() + 1}/${d.getDate()}(${DAYS[d.getDay()]})`;

/** Formats Korean mobile numbers while typing: 01012345678 → 010-1234-5678 */
export function formatPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
}

/** abcdef → abc*** (shows at most 4 stars) */
export function maskId(s: string): string {
  if (s.length <= 3) return `${s[0] ?? ''}**`;
  return s.slice(0, 3) + '*'.repeat(Math.min(4, s.length - 3));
}

/** Order number like 261119-1234567 */
export function makeOrderNo(at: number, rand: () => number = Math.random): string {
  const d = new Date(at);
  const ymd = String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate());
  return `${ymd}-${Math.floor(rand() * 9e6) + 1e6}`;
}

export const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
