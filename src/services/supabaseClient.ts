import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The anon key is a public identifier (it only grants what Row Level Security allows), so shipping it is expected.
// Override with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, or set VITE_BACKEND=local to keep everything in the browser.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://hmnewhynozyovzgywntb.supabase.co';
const ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbmV3aHlub3p5b3Z6Z3l3bnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5OTI4NDksImV4cCI6MjExMDU2ODg0OX0.3jA_flc13WneUoOSqrTO0cNSXKsxTuSvQDkjsx2zwS0';

export const useSupabase = import.meta.env.VITE_BACKEND !== 'local' && import.meta.env.MODE !== 'test';

const KEEP = 'bd_keep_login';
/** "로그인 상태 유지" → session survives browser restarts (localStorage); otherwise it lives only in this tab (sessionStorage). */
export function setKeepLogin(keep: boolean): void {
  try {
    if (keep) localStorage.setItem(KEEP, '1');
    else localStorage.removeItem(KEEP);
  } catch {
    /* storage blocked */
  }
}
const keepLogin = () => {
  try {
    return localStorage.getItem(KEEP) === '1';
  } catch {
    return false;
  }
};
const authStorage = {
  getItem(k: string) {
    try {
      return sessionStorage.getItem(k) ?? localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem(k: string, v: string) {
    try {
      (keepLogin() ? localStorage : sessionStorage).setItem(k, v);
    } catch {
      /* storage blocked */
    }
  },
  removeItem(k: string) {
    try {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    } catch {
      /* storage blocked */
    }
  },
};

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  client ??= createClient(URL, ANON, {
    auth: { storage: authStorage, storageKey: 'bd_auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

/** Members sign in with an ID, so the auth e-mail is derived from it. The contact e-mail is stored in the profile. */
export const authEmail = (id: string) => `${id.trim().toLowerCase()}@member.barodam.kro.kr`;

/** Server errors raised by our SQL functions are already user-facing Korean; map the few built-in ones. */
export function koreanError(message: string | undefined): string {
  const m = message ?? '';
  if (/[가-힣]/.test(m)) return m;
  if (/Invalid login credentials/i.test(m)) return '아이디 또는 비밀번호가 맞지 않아요.';
  if (/already registered|already exists/i.test(m)) return '이미 쓰고 있는 아이디예요.';
  if (/rate limit|too many/i.test(m)) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.';
  if (/password/i.test(m)) return '비밀번호 규칙을 확인해 주세요.';
  return '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
}
