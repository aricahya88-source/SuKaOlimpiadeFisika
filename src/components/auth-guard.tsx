'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { useSession } from '@/contexts/session-context';
import type { Role } from '@/lib/api';
import { homeForRole } from '@/lib/role-route';

export function AuthGuard({ role, roles, children }: { role?: Role; roles?: Role[]; children: React.ReactNode }) {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) { router.replace('/'); return; }
    const allowed = roles ? roles.includes(session.user.role) : !role || session.user.role === role;
    if (!allowed) router.replace(homeForRole(session.user.role));
  }, [session, loading, role, roles, router]);

  const allowed = session ? (roles ? roles.includes(session.user.role) : !role || session.user.role === role) : false;
  if (loading || !session || !allowed) {
    return <div className="center-screen"><LoaderCircle className="spin" size={30} /><span>Menyiapkan SuKa Olimpiade Fisika...</span></div>;
  }
  return <>{children}</>;
}
