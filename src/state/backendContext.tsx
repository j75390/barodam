import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { Backend } from '@/services/backend';
import type { User } from '@/types';

const Ctx = createContext<Backend | null>(null);

export function BackendProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  return <Ctx.Provider value={backend}>{children}</Ctx.Provider>;
}

export function useBackend(): Backend {
  const b = useContext(Ctx);
  if (!b) throw new Error('useBackend must be used inside BackendProvider');
  return b;
}

/** The signed-in user (re-renders when it changes), or null. */
export function useUser(): User | null {
  const b = useBackend();
  return useSyncExternalStore(b.subscribe, b.currentUser, b.currentUser);
}
