'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, History, Home, LogOut, Settings2, UserRound } from 'lucide-react';
import { useSession } from '@/contexts/session-context';
import { Logo } from './logo';

const nav = [
  { href: '/student', label: 'Beranda', icon: Home },
  { href: '/student/history', label: 'Riwayat', icon: History },
  { href: '/student/developers', label: 'Pengembang', icon: Settings2 },
  { href: '/student/profile', label: 'Profil', icon: UserRound },
];

export function StudentShell({ children, hideNav = false }: { children: React.ReactNode; hideNav?: boolean }) {
  const pathname = usePathname();
  const { session, logout } = useSession();
  return (
    <div className="student-app">
      <header className="mobile-header">
        <Link href="/student" className="brand-mini"><Logo compact /><span>SuKa Olimpiade Fisika</span></Link>
        <div className="header-actions">
          <button className="icon-button" aria-label="Notifikasi"><Bell size={20} /></button>
          <button className="avatar-button" aria-label="Profil">{session?.user.name?.charAt(0) || 'S'}</button>
        </div>
      </header>
      <main className={hideNav ? 'student-content exam-content' : 'student-content'}>{children}</main>
      {!hideNav && (
        <nav className="bottom-nav five-items" aria-label="Navigasi utama">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/student' ? pathname === item.href : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={active ? 'bottom-nav-item active' : 'bottom-nav-item'}><Icon size={21}/><span>{item.label}</span></Link>;
          })}
          <button className="bottom-nav-item" onClick={() => logout()}><LogOut size={21}/><span>Keluar</span></button>
        </nav>
      )}
    </div>
  );
}
