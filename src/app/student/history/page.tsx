'use client';

import { useEffect, useState } from 'react';
import { Award, CheckCircle2 } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { StudentShell } from '@/components/student-shell';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui';
import { useSession } from '@/contexts/session-context';
import { getExamApi, type ExamResult } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

export default function HistoryPage() {
  const { session } = useSession();
  const [items, setItems] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!session) return;
    getExamApi().getMyResults(session.token).then(setItems).finally(() => setLoading(false));
  }, [session]);
  return <AuthGuard role="student"><StudentShell><PageHeader eyebrow="RIWAYAT" title="Hasil ujian" description="Nilai hanya ditampilkan sesuai pengaturan ujian."/>
    {loading ? <Skeleton height={180}/> : items.length === 0 ? <EmptyState title="Belum ada hasil" description="Ujian yang sudah dikumpulkan akan tercatat di sini."/> : <div className="result-list">{items.map((item) => <article className="result-card" key={item.attemptId}><span className="result-icon"><Award size={22}/></span><div className="result-main"><strong>{item.title}</strong><small>{item.subject} • {formatDateTime(item.submittedAt)}</small><div className="result-breakdown"><span><CheckCircle2 size={15}/>{item.correctCount} benar</span><span>{item.wrongCount} salah</span><span>{item.blankCount} kosong</span></div></div><div className="score-box">{item.visible ? <><strong>{item.score}</strong><small>Nilai</small></> : <><strong>—</strong><small>Belum dirilis</small></>}</div></article>)}</div>}
  </StudentShell></AuthGuard>;
}
