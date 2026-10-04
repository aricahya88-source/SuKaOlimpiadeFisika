'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Pause, Play, RefreshCw, RotateCcw, ShieldAlert, Users } from 'lucide-react';
import { Badge, PageHeader, Skeleton } from '@/components/ui';
import { useSession } from '@/contexts/session-context';
import { getExamApi, type ExamRecord, type MonitoringRow } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

const statusLabel: Record<MonitoringRow['status'], string> = {
  NOT_STARTED: 'Akan ujian',
  IN_PROGRESS: 'Sedang ujian',
  PAUSED: 'Dijeda',
  SUBMITTED: 'Selesai',
  EXPIRED: 'Waktu habis',
};

const statusTone = (status: MonitoringRow['status']): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' => status === 'SUBMITTED' ? 'success' : status === 'IN_PROGRESS' ? 'primary' : status === 'PAUSED' || status === 'EXPIRED' ? 'warning' : 'neutral';

export function MonitoringManager() {
  const { session } = useSession();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [rows, setRows] = useState<MonitoringRow[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');

  const classes = useMemo(() => [...new Set(exams.map((exam) => exam.className).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id-ID')), [exams]);
  const examsForClass = useMemo(() => exams.filter((exam) => !selectedClass || exam.className === selectedClass).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()), [exams, selectedClass]);
  const selectedExam = exams.find((exam) => exam.examId === selectedExamId);

  const loadExams = async () => {
    if (!session) return;
    const list = await getExamApi().listExams(session.token);
    setExams(list);
    if (!selectedClass && list.length) {
      const now = Date.now();
      const preferred = list.find((e) => new Date(e.startTime).getTime() <= now && new Date(e.endTime).getTime() >= now) || list[0];
      setSelectedClass(preferred.className);
      setSelectedExamId(preferred.examId);
    }
  };

  const loadRows = async (examId = selectedExamId) => {
    if (!session || !examId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try { setRows(await getExamApi().getMonitoring(session.token, examId)); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadExams(); }, [session]);
  useEffect(() => { if (selectedExamId) loadRows(selectedExamId); else { setRows([]); setLoading(false); } }, [selectedExamId, session]);
  useEffect(() => {
    if (!selectedExamId) return;
    const id = window.setInterval(() => loadRows(selectedExamId), 30_000);
    return () => window.clearInterval(id);
  }, [selectedExamId, session]);

  const chooseClass = (className: string) => {
    setSelectedClass(className);
    const next = exams.filter((exam) => !className || exam.className === className).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
    setSelectedExamId(next?.examId || '');
  };

  const pauseOrResume = async (row: MonitoringRow, paused: boolean) => {
    if (!session || !row.attemptId || workingId) return;
    setWorkingId(row.attemptId);
    try { await getExamApi().setAttemptPaused(session.token, row.attemptId, paused); await loadRows(); }
    catch (error) { window.alert(error instanceof Error ? error.message : 'Aksi gagal.'); }
    finally { setWorkingId(''); }
  };

  const warn = async (row: MonitoringRow) => {
    if (!session || !row.attemptId || workingId) return;
    const message = window.prompt(`Kirim peringatan kepada ${row.studentName}:`, 'Tetap fokus pada aplikasi SuKa Olimpiade Fisika dan kerjakan ujian secara mandiri.');
    if (!message?.trim()) return;
    setWorkingId(row.attemptId);
    try { await getExamApi().warnAttempt(session.token, row.attemptId, message.trim()); await loadRows(); }
    catch (error) { window.alert(error instanceof Error ? error.message : 'Peringatan gagal dikirim.'); }
    finally { setWorkingId(''); }
  };

  const resetAttempt = async (row: MonitoringRow) => {
    if (!session || !row.attemptId || workingId) return;
    if (!window.confirm(`Reset pengerjaan ${row.studentName}?\n\nJawaban dan hasil ujian akan dihapus, lalu peserta dapat mengerjakan ulang dari awal.`)) return;
    setWorkingId(row.attemptId);
    try { await getExamApi().resetAttempt(session.token, row.attemptId); await loadRows(); }
    catch (error) { window.alert(error instanceof Error ? error.message : 'Reset gagal.'); }
    finally { setWorkingId(''); }
  };

  const counts = useMemo(() => ({
    all: rows.length,
    notStarted: rows.filter((r) => r.status === 'NOT_STARTED').length,
    active: rows.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'PAUSED').length,
    done: rows.filter((r) => r.status === 'SUBMITTED').length,
  }), [rows]);

  return <>
    <PageHeader eyebrow="MONITORING" title="Monitoring ujian" description="Pilih kelas lalu ujian. Tabel menampilkan seluruh peserta kelas, termasuk yang belum mulai, sedang ujian, dan sudah selesai." action={<button className="button secondary" onClick={() => loadRows()} disabled={!selectedExamId}><RefreshCw size={17}/>Refresh</button>}/>
    <section className="panel monitoring-filter-panel">
      <div className="monitoring-filters">
        <label>Kelas<select value={selectedClass} onChange={(e) => chooseClass(e.target.value)}><option value="">Semua kelas</option>{classes.map((className) => <option key={className} value={className}>{className}</option>)}</select></label>
        <label>Ujian<select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}><option value="">Pilih ujian</option>{examsForClass.map((exam) => <option key={exam.examId} value={exam.examId}>{exam.title} • {exam.className}</option>)}</select></label>
        {selectedExam && <div className="monitoring-exam-meta"><strong>{selectedExam.title}</strong><span>{selectedExam.subject} • {selectedExam.className}</span><small>{formatDateTime(selectedExam.startTime)} — {formatDateTime(selectedExam.endTime)}</small></div>}
      </div>
    </section>

    {selectedExamId && <div className="monitoring-stats">
      <div><Users/><span>Total peserta</span><strong>{counts.all}</strong></div>
      <div><span>Akan ujian</span><strong>{counts.notStarted}</strong></div>
      <div><span>Sedang ujian</span><strong>{counts.active}</strong></div>
      <div><span>Selesai</span><strong>{counts.done}</strong></div>
    </div>}

    {!selectedExamId ? <section className="panel"><div className="empty-table">Pilih kelas dan ujian untuk menampilkan peserta.</div></section> : loading ? <Skeleton height={300}/> : <section className="panel"><div className="table-wrap"><table><thead><tr><th>Peserta</th><th>Status</th><th>Mulai</th><th>Sinkronisasi</th><th>Tidak fokus</th><th>Aksi</th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.studentId}><td><strong>{row.studentName}</strong><small>{row.className}</small></td><td><Badge tone={statusTone(row.status)}>{statusLabel[row.status]}</Badge></td><td>{row.startedAt ? formatDateTime(row.startedAt) : '-'}</td><td>{row.lastSyncAt ? formatDateTime(row.lastSyncAt) : '-'}</td><td><span className={row.focusViolationCount > 0 ? 'focus-count danger' : 'focus-count'}><ShieldAlert size={15}/>{row.focusViolationCount}</span></td><td><div className="monitoring-actions">
        {row.status === 'IN_PROGRESS' && row.attemptId && <><button className="button secondary compact" disabled={workingId === row.attemptId} onClick={() => pauseOrResume(row, true)}><Pause size={15}/>Pause</button><button className="button warning compact" disabled={workingId === row.attemptId} onClick={() => warn(row)}><Bell size={15}/>Peringatan</button></>}
        {row.status === 'PAUSED' && row.attemptId && <><button className="button primary compact" disabled={workingId === row.attemptId} onClick={() => pauseOrResume(row, false)}><Play size={15}/>Lanjut</button><button className="button warning compact" disabled={workingId === row.attemptId} onClick={() => warn(row)}><Bell size={15}/>Peringatan</button></>}
        {(row.status === 'SUBMITTED' || row.status === 'EXPIRED') && row.attemptId && <button className="button danger compact" disabled={workingId === row.attemptId} onClick={() => resetAttempt(row)}><RotateCcw size={15}/>Reset pengerjaan</button>}
        {row.status === 'NOT_STARTED' && <span className="muted">-</span>}
      </div></td></tr>)}
      {!rows.length && <tr><td colSpan={6}><div className="empty-table">Tidak ada peserta aktif pada kelas ujian ini.</div></td></tr>}
    </tbody></table></div></section>}
  </>;
}
