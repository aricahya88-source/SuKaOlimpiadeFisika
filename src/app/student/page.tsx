'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText, LoaderCircle, PlayCircle } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { PwaInstall } from '@/components/pwa-install';
import { StudentShell } from '@/components/student-shell';
import { Badge, EmptyState, Skeleton } from '@/components/ui';
import { useSession } from '@/contexts/session-context';
import { getExamApi, type ExamSummary } from '@/lib/api';
import { isExamActiveForStudent, isExamUpcoming } from '@/lib/exam-availability';
import { formatDateTime, formatDuration } from '@/lib/format';

function statusFor(exam: ExamSummary, nowMs: number) {
  if (exam.attemptStatus === 'SUBMITTED') return { label: 'Selesai', tone: 'success' as const };
  if (exam.attemptStatus === 'IN_PROGRESS') return { label: 'Sedang dikerjakan', tone: 'warning' as const };
  if (exam.attemptStatus === 'PAUSED') return { label: 'Dijeda panitia', tone: 'warning' as const };
  if (isExamUpcoming(exam, nowMs)) return { label: 'Akan datang', tone: 'neutral' as const };
  if (new Date(exam.endTime).getTime() <= nowMs) return { label: 'Ditutup', tone: 'danger' as const };
  return { label: 'Sedang berlangsung', tone: 'primary' as const };
}

export default function StudentHome() {
  const { session } = useSession();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Update the availability at the exact start/end boundary without waiting
  // for a backend request or requiring students to refresh the page.
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let requestInFlight = false;
    setExams([]);
    setError('');
    setLoading(true);

    const load = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const next = await getExamApi().getAvailableExams(session.token);
        if (!cancelled) { setExams(next); setError(''); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat ujian.');
      } finally {
        requestInFlight = false;
        if (!cancelled) setLoading(false);
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };

    void load();
    // Pick up new schedules and administrator changes while the page stays open.
    const poll = window.setInterval(refreshWhenVisible, 60_000);
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('online', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [session]);

  const active = useMemo(() => exams.filter((exam) => isExamActiveForStudent(exam, nowMs)), [exams, nowMs]);
  const upcoming = useMemo(() => exams.filter((exam) => !exam.attemptStatus && isExamUpcoming(exam, nowMs)), [exams, nowMs]);
  const completed = exams.filter((exam) => exam.attemptStatus === 'SUBMITTED').length;

  return (
    <AuthGuard role="student"><StudentShell>
      <section className="student-hero">
        <div><span className="eyebrow light">BERANDA SISWA</span><h1>Halo, {session?.user.name.split(' ')[0]}.</h1><p>Siapkan perangkat dan koneksi sebelum memulai ujian.</p></div>
        <div className="hero-orbit hero-orbit-one"/><div className="hero-orbit hero-orbit-two"/>
      </section>

      <PwaInstall />
      <section className="mini-stats">
        <div className="mini-stat"><span className="mini-icon blue"><FileText size={20}/></span><div><strong>{exams.length}</strong><small>Total ujian</small></div></div>
        <div className="mini-stat"><span className="mini-icon teal"><CheckCircle2 size={20}/></span><div><strong>{completed}</strong><small>Selesai</small></div></div>
        <div className="mini-stat"><span className="mini-icon amber"><Clock3 size={20}/></span><div><strong>{active.length}</strong><small>Aktif</small></div></div>
      </section>

      <section className="section-block">
        <div className="section-title"><div><span className="eyebrow">UJIAN</span><h2>Tersedia untuk Anda</h2></div></div>
        {error && <div className="notice danger">{error}</div>}
        {loading ? <><Skeleton height={180}/><Skeleton height={180}/></> : active.length === 0 ? <EmptyState title="Belum ada ujian aktif" description="Ujian yang dapat dikerjakan akan muncul di sini."/> : (
          <div className="exam-card-list">{active.map((exam) => {
            const status = statusFor(exam, nowMs);
            return <article className="exam-card" key={exam.examId}>
              <div className="exam-card-top"><span className="subject-icon"><FileText size={22}/></span><Badge tone={status.tone}>{status.label}</Badge></div>
              <div><p className="exam-subject">{exam.subject} • {exam.className}</p><h3>{exam.title}</h3></div>
              <div className="exam-meta"><span><FileText size={16}/>{exam.questionCount} soal</span><span><Clock3 size={16}/>{formatDuration(exam.durationMinutes)}</span><span><CalendarDays size={16}/>{formatDateTime(exam.endTime)}</span></div>
              <Link className="button primary full" href={`/student/exam/${exam.examId}`}>{['IN_PROGRESS', 'PAUSED'].includes(String(exam.attemptStatus || '')) ? 'Lanjutkan ujian' : 'Persiapkan ujian'}<ArrowRight size={18}/></Link>
            </article>;
          })}</div>
        )}
      </section>

      {upcoming.length > 0 && <section className="section-block"><div className="section-title"><div><span className="eyebrow">JADWAL</span><h2>Ujian berikutnya</h2></div></div><div className="compact-list">{upcoming.map((exam) => <article className="compact-card" key={exam.examId}><span className="mini-icon teal"><CalendarDays size={19}/></span><div><strong>{exam.title}</strong><small>{formatDateTime(exam.startTime)} • {formatDuration(exam.durationMinutes)}</small></div><PlayCircle size={20}/></article>)}</div></section>}
    </StudentShell></AuthGuard>
  );
}
