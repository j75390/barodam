import type { Backend } from './backend';
import { createLocalBackend } from './localBackend';
import { createSupabaseBackend } from './supabaseBackend';
import { useSupabase } from './supabaseClient';

/**
 * Picks the backend: Supabase (Postgres + Auth) in the deployed app,
 * browser storage when VITE_BACKEND=local (offline development, unit tests).
 */
export function createBackend(): Backend {
  return useSupabase ? createSupabaseBackend() : createLocalBackend();
}
