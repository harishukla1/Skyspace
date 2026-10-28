'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LoginInput, RegisterInput, Role, UserDTO } from '@skyspace/shared';
import { api, resetCsrf } from '@/lib/api';

interface AuthState {
  user: UserDTO | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<UserDTO>;
  register: (input: RegisterInput) => Promise<UserDTO>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  hasRole: (r: Role) => boolean;
}

const Ctx = createContext<AuthState | null>(null);
const hasSessionCookie = () => typeof document !== 'undefined' && document.cookie.split('; ').some((c) => c.startsWith('ssr_session='));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!hasSessionCookie()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const r = await api<{ user: UserDTO }>('/auth/me');
      setUser(r.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      reload,
      hasRole: (r) => !!user?.roles.includes(r),
      async login(input) {
        const r = await api<{ user: UserDTO }>('/auth/login', { body: input, noRefresh: true });
        setUser(r.user);
        return r.user;
      },
      async register(input) {
        const r = await api<{ user: UserDTO }>('/auth/register', { body: input, noRefresh: true });
        setUser(r.user);
        return r.user;
      },
      async logout() {
        await api('/auth/logout', { method: 'POST', noRefresh: true }).catch(() => undefined);
        resetCsrf();
        setUser(null);
      },
    }),
    [user, loading, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

/** Where to send a user after sign-in, by highest role. */
export function homeFor(user: Pick<UserDTO, 'roles'>) {
  if (user.roles.includes('admin')) return '/admin';
  if (user.roles.includes('agent')) return '/agent';
  if (user.roles.includes('owner')) return '/owner';
  return '/customer';
}
