'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getExamApi } from '@/lib/api';
import type { Session } from '@/lib/api';

const STORAGE_KEY = 'suka-olimpiade-fisika.session';

type SessionContextValue = {
  session: Session | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<Session>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { if (active) setLoading(false); return; }
      try {
        const stored = JSON.parse(raw) as Session;
        const verified = await getExamApi().getSession(stored.token);
        if (active) setSession(verified);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(verified));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        if (active) setLoading(false);
      }
    };
    restore();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const next = await getExamApi().login(username, password);
    setSession(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }, []);

  const logout = useCallback(async () => {
    const token = session?.token;
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
    if (token) getExamApi().logout(token).catch(() => undefined);
    router.replace('/');
  }, [router, session?.token]);

  const value = useMemo(() => ({ session, loading, login, logout }), [session, loading, login, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession harus digunakan di dalam SessionProvider.');
  return value;
}
