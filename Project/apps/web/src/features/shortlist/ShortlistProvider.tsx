'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';

const Ctx = createContext<{ ids: Set<string>; toggle: (id: string, on: boolean) => void }>({ ids: new Set(), toggle: () => undefined });

export function ShortlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return setIds(new Set());
    api<{ ids: string[] }>('/users/me/shortlist/ids').then((r) => setIds(new Set(r.ids))).catch(() => undefined);
  }, [user]);
  const toggle = useCallback((id: string, on: boolean) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  return <Ctx.Provider value={{ ids, toggle }}>{children}</Ctx.Provider>;
}
export const useShortlist = () => useContext(Ctx);
