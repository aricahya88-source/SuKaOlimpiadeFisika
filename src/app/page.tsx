'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, ShieldCheck, Smartphone, Wifi } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useSession } from '@/contexts/session-context';
import { homeForRole } from '@/lib/role-route';

export default function LoginPage() {
  const router = useRouter();
  const { session, loading, login } = useSession();
  const [username, setUsername] = useState('peserta');
  const [password, setPassword] = useState('peserta123');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && session) router.replace(homeForRole(session.user.role));
  }, [loading, session, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setSubmitting(true);
    try {
      const next = await login(username.trim(), password);
      router.replace(homeForRole(next.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal.');
    } finally { setSubmitting(false); }
  };

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand-inner">
          <Logo />
          <span className="eyebrow light">MOBILE EXAM PWA</span>
          <h1>Ujian lebih ringan, fokus, dan siap dipakai dari HP.</h1>
          <p>SuKa Olimpiade Fisika dirancang khusus untuk ulangan harian, asesmen, tryout, dan ujian sekolah—bukan LMS.</p>
          <div className="login-features">
            <div><Smartphone/><span><strong>Mobile-first PWA</strong><small>Nyaman setelah dipasang ke layar utama.</small></span></div>
            <div><Wifi/><span><strong>Online-first</strong><small>Prefetch soal dan toleran koneksi terputus sementara.</small></span></div>
            <div><ShieldCheck/><span><strong>Jawaban terlindungi</strong><small>Backup lokal kecil + sinkronisasi server.</small></span></div>
          </div>
        </div>
      </section>
      <section className="login-form-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="mobile-login-logo"><Logo /></div>
          <span className="eyebrow">MASUK KE SAINSMASEMBA</span>
          <h2>Selamat datang</h2>
          <p>Masukkan akun yang diberikan sekolah.</p>
          <label>Username<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required /></label>
          <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required/><button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div></label>
          {error && <div className="form-error">{error}</div>}
          <button className="button primary full" disabled={submitting}>{submitting ? <><LoaderCircle className="spin" size={19}/>Memverifikasi...</> : <>Masuk<ArrowRight size={19}/></>}</button>
          {process.env.NEXT_PUBLIC_API_MODE !== 'apps-script' && (
            <div className="demo-hint"><CheckCircle2 size={18}/><div><strong>Mode demo aktif</strong><span>Super Admin: superadmin / super123<br/>Panitia: panitia / panitia123<br/>Validator: validator / validator123<br/>Peserta: peserta / peserta123</span><div className="demo-actions"><button type="button" onClick={() => { setUsername('peserta'); setPassword('peserta123'); }}>Peserta</button><button type="button" onClick={() => { setUsername('panitia'); setPassword('panitia123'); }}>Panitia</button><button type="button" onClick={() => { setUsername('validator'); setPassword('validator123'); }}>Validator</button><button type="button" onClick={() => { setUsername('superadmin'); setPassword('super123'); }}>Super Admin</button></div></div></div>
          )}
        </form>
      </section>
    </main>
  );
}
