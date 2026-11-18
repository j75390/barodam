import type { Backend } from './backend';
import { createLocalBackend } from './localBackend';

/**
 * Picks the backend. When Supabase credentials are configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 * the Supabase implementation is used; otherwise everything is stored in this browser.
 */
export function createBackend(): Backend {
  return createLocalBackend();
}
