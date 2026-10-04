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
import { formatDateTime, formatDuration } from '@/lib/format';

function statusFor(exam: ExamSummary) {
  if (exam.attemptStatus === 'SUBMITTED') return { label: 'Selesai', tone: 'success' as const };
  if (exam.attemptStatus === 'IN_PROGRESS') return { label: 'Sedang dikerjakan', tone: 'warning' as const };
  if (exam.attemptStatus === 'PAUSED') return { label: 'Dijeda panitia', tone: 'warning' as const };
  const now = Date.now();
  if (new Date(exam.startTime).getTime() > now) return { label: 'Akan datang', tone: 'neutral' as const };
  if (new Date(exam.endTime).getTime() < now) return { label: 'Ditutup', tone: 'danger' as const };
  return { label: 'Tersedia', tone: 'primary' as const };
}

export default function StudentHome() {
  const { session } = useSession();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;
    getExamApi().getAvailableExams(session.token).then(setExams).catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat ujian.')).finally(() => setLoading(false));
  }, [session]);

  const active = useMemo(() => exams.filter((exam) => ['IN_PROGRESS', 'PAUSED'].includes(String(exam.attemptStatus || '')) || (exam.availableNow && exam.attemptStatus !== 'SUBMITTED')), [exams]);
  const upcoming = useMemo(() => exams.filter((exam) => new Date(exam.startTime).getTime() > Date.now()), [exams]);
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
        {loading ? <><Skeleton height={180}/><Skeleton height={180}/></> : error ? <div className="notice danger">{error}</div> : active.length === 0 ? <EmptyState title="Belum ada ujian aktif" description="Ujian yang dapat dikerjakan akan muncul di sini."/> : (
          <div className="exam-card-list">{active.map((exam) => {
            const status = statusFor(exam);
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
