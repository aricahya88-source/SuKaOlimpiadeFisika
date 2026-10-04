import type { Metadata, Viewport } from 'next';
import 'katex/dist/katex.min.css';
import './globals.css';
import { SessionProvider } from '@/contexts/session-context';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: 'SuKa Olimpiade Fisika — Platform Ujian',
  description: 'PWA ujian dan ulangan mobile-first untuk SuKa Olimpiade Fisika.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg', apple: '/suka-olimpiade-icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B5DB4',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <SessionProvider>
          <PwaRegister />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
