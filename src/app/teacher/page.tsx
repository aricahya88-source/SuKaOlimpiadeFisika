'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ClipboardList, FileQuestion, MonitorCheck, Plus, Users } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { AdminShell } from '@/components/admin-shell';
import { PageHeader, Skeleton } from '@/components/ui';
import { useSession } from '@/contexts/session-context';
import { getExamApi, type DashboardStats, type ExamRecord } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

const initial: DashboardStats = { activeExams: 0, upcomingExams: 0, students: 0, inProgress: 0, submitted: 0, notSubmitted: 0 };

export default function AdminDashboard() {
  const { session } = useSession();
  const [stats, setStats] = useState(initial);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!session) return;
    Promise.all([getExamApi().getDashboardStats(session.token), getExamApi().listExams(session.token)]).then(([s, e]) => { setStats(s); setExams(e.slice(0, 4)); }).finally(() => setLoading(false));
  }, [session]);
  return <AuthGuard role="teacher"><AdminShell><PageHeader eyebrow="OVERVIEW" title="Dashboard panitia" description="Pantau ujian yang Anda kelola, peserta, dan pengumpulan jawaban." action={<Link className="button primary" href="/teacher/exams"><Plus size={18}/>Buat ujian</Link>}/>
    {loading ? <Skeleton height={180}/> : <div className="admin-stat-grid"><article><span className="stat-icon blue"><ClipboardList/></span><div><small>Ujian aktif</small><strong>{stats.activeExams}</strong><span>{stats.upcomingExams} akan datang</span></div></article><article><span className="stat-icon teal"><Users/></span><div><small>Peserta</small><strong>{stats.students}</strong><span>Akun peserta aktif</span></div></article><article><span className="stat-icon amber"><MonitorCheck/></span><div><small>Sedang ujian</small><strong>{stats.inProgress}</strong><span>Attempt aktif</span></div></article><article><span className="stat-icon green"><FileQuestion/></span><div><small>Sudah submit</small><strong>{stats.submitted}</strong><span>{stats.notSubmitted} belum submit</span></div></article></div>}
    <div className="admin-two-column"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">UJIAN</span><h2>Terbaru</h2></div><Link href="/teacher/exams">Lihat semua <ArrowRight size={16}/></Link></div><div className="table-wrap"><table><thead><tr><th>Ujian</th><th>Kelas</th><th>Status</th><th>Mulai</th></tr></thead><tbody>{exams.map((exam) => <tr key={exam.examId}><td><strong>{exam.title}</strong><small>{exam.subject}</small></td><td>{exam.className}</td><td><span className={`status-dot ${exam.status.toLowerCase()}`}>{exam.status}</span></td><td>{formatDateTime(exam.startTime)}</td></tr>)}</tbody></table></div></section><section className="panel quick-panel"><div className="panel-heading"><div><span className="eyebrow">AKSI CEPAT</span><h2>Kelola ujian Anda</h2></div></div><Link href="/teacher/questions"><span className="mini-icon blue"><FileQuestion/></span><div><strong>Bank Soal</strong><small>Tambah dan impor pertanyaan</small></div><ArrowRight/></Link><Link href="/teacher/students"><span className="mini-icon teal"><Users/></span><div><strong>Peserta</strong><small>Kelola akun peserta</small></div><ArrowRight/></Link><Link href="/teacher/monitoring"><span className="mini-icon amber"><MonitorCheck/></span><div><strong>Monitoring</strong><small>Pantau attempt dan sinkronisasi</small></div><ArrowRight/></Link></section></div>
  </AdminShell></AuthGuard>;
}
