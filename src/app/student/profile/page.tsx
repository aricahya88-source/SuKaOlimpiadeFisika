'use client';

import { LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { StudentShell } from '@/components/student-shell';
import { PageHeader } from '@/components/ui';
import { useSession } from '@/contexts/session-context';

export default function ProfilePage() {
  const { session, logout } = useSession();
  return <AuthGuard role="student"><StudentShell><PageHeader eyebrow="AKUN" title="Profil peserta" description="Identitas yang digunakan saat mengikuti ujian."/>
    <section className="profile-card"><div className="profile-avatar"><UserRound size={32}/></div><div><h2>{session?.user.name}</h2><p>{session?.user.className || '-'}</p></div></section>
    <section className="detail-card"><div><span>Username</span><strong>{session?.user.username}</strong></div><div><span>ID Peserta</span><strong>{session?.user.userId}</strong></div><div><span>Status akun</span><strong className="success-text"><ShieldCheck size={16}/>Aktif</strong></div></section>
    <button className="button secondary full" onClick={() => logout()}><LogOut size={18}/>Keluar dari akun</button>
  </StudentShell></AuthGuard>;
}
