'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpenCheck, ClipboardList, FileQuestion, GraduationCap, LayoutDashboard, LogOut, Menu, MonitorCheck, Settings2, UserCog, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useSession } from '@/contexts/session-context';
import { roleLabel } from '@/lib/role-route';
import { Logo } from './logo';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useSession();
  const [open, setOpen] = useState(false);
  const role = session?.user.role;
  const isSuper = role === 'super_admin';
  const isValidator = role === 'validator';
  const base = isSuper ? '/super-admin' : isValidator ? '/validator' : '/teacher';
  const nav = [
    { href: base, label: 'Dashboard', icon: LayoutDashboard },
    ...(!isValidator ? [{ href: `${base}/exams`, label: 'Ujian', icon: ClipboardList }] : []),
    ...(!isValidator ? [{ href: `${base}/questions`, label: 'Bank Soal', icon: FileQuestion }] : []),
    ...(!isValidator ? [{ href: `${base}/assignments`, label: 'Penugasan', icon: ClipboardList }] : []),
    ...(isValidator ? [{ href: `${base}/validation`, label: 'Validasi Soal', icon: FileQuestion }] : []),
    ...(!isValidator ? [{ href: `${base}/students`, label: 'Peserta', icon: Users }] : []),
    ...(isSuper ? [
      { href: `${base}/users`, label: 'Semua Akun', icon: UserCog },
      { href: `${base}/teachers`, label: 'Panitia', icon: GraduationCap },
    ] : []),
    ...(!isValidator ? [{ href: `${base}/monitoring`, label: 'Monitoring', icon: MonitorCheck }] : []),
    ...(!isValidator ? [{ href: `${base}/results`, label: 'Hasil', icon: BarChart3 }] : []),
    { href: `${base}/developers`, label: 'Pengembang', icon: Settings2 },
  ];

  return (
    <div className="admin-app">
      <aside className={open ? 'admin-sidebar open' : 'admin-sidebar'}>
        <div className="sidebar-brand"><Logo /></div>
        <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Tutup menu"><X size={20}/></button>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.href === base ? pathname === item.href : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={active ? 'sidebar-link active' : 'sidebar-link'}><Icon size={20}/><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="admin-user"><span className="avatar-button">{session?.user.name?.charAt(0) || 'A'}</span><div><strong>{session?.user.name}</strong><small>{role ? roleLabel(role) : 'Pengguna'}</small></div></div>
          <button className="sidebar-link danger-link" onClick={() => logout()}><LogOut size={20}/><span>Keluar</span></button>
        </div>
      </aside>
      {open && <button aria-label="Tutup menu" className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <section className="admin-main">
        <header className="admin-topbar"><button className="icon-button mobile-only" onClick={() => setOpen(true)}><Menu size={22}/></button><div><strong>SuKa Olimpiade Fisika</strong><span>{isSuper ? 'Panel Super Admin' : isValidator ? 'Panel Validator' : 'Panel Panitia'}</span></div><div className="topbar-spacer"/><span className="api-mode"><BookOpenCheck size={14}/>{process.env.NEXT_PUBLIC_API_MODE === 'apps-script' ? 'Production' : 'Demo Mode'}</span></header>
        <main className="admin-content">{children}</main>
      </section>
    </div>
  );
}
