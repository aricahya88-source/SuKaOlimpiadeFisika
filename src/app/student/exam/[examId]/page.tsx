'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Clock3, CloudOff, CloudUpload, Flag, Grid3X3, LoaderCircle, RefreshCw, Send, ShieldCheck, Wifi } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { StudentShell } from '@/components/student-shell';
import { Badge, Modal } from '@/components/ui';
import { MathHtml, ZoomableImage } from '@/components/math-html';
import { QuestionStimulus } from '@/components/question-stimulus';
import { useSession } from '@/contexts/session-context';
import { getExamApi, type Attempt, type ExamResult, type ExamSummary, type PreflightResult, type Question, type SaveStatus } from '@/lib/api';
import { checkStorageReadiness, deleteLocalAttempt, findLocalAttemptByExam, saveLocalAttempt } from '@/lib/exam-store';
import { formatBytes, formatCountdown, formatDateTime, formatDuration } from '@/lib/format';

type Phase = 'loading' | 'preflight' | 'starting' | 'exam' | 'review' | 'submitting' | 'submitted' | 'error';
type ExamFontSize = 'small' | 'medium' | 'large';

export default function ExamPage() {
  const params = useParams<{ examId: string }>();
  const router = useRouter();
  const { session } = useSession();
  const examId = params.examId;
  const [phase, setPhase] = useState<Phase>('loading');
  const [summary, setSummary] = useState<ExamSummary | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Record<number, Question>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revision, setRevision] = useState(0);
  const [dirtyCount, setDirtyCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('synced');
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>();
  const [storageWarning, setStorageWarning] = useState('');
  const [online, setOnline] = useState(true);
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [examToken, setExamToken] = useState('');
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [error, setError] = useState('');
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [fontSize, setFontSize] = useState<ExamFontSize>('medium');
  const [focusViolationCount, setFocusViolationCount] = useState(0);
  const [focusWarningOpen, setFocusWarningOpen] = useState(false);
  const [securityNotice, setSecurityNotice] = useState('');
  const [attemptPaused, setAttemptPaused] = useState(false);
  const [teacherWarning, setTeacherWarning] = useState('');
  const [teacherWarningOpen, setTeacherWarningOpen] = useState(false);
  const lastTeacherWarningRef = useRef('');
  const pendingFocusViolations = useRef(0);
  const fullscreenExpected = useRef(false);
  const lastFocusEventAt = useRef(0);
  const syncInFlight = useRef(false);
  const prefetchInFlight = useRef(false);
  const autoSubmitStarted = useRef(false);

  const currentQuestion = questions[currentIndex + 1];
  const loadedCount = Object.keys(questions).length;
  const totalQuestions = attempt?.questionCount || summary?.questionCount || 0;
  const answeredCount = useMemo(() => Object.keys(answers).filter((key) => Boolean(answers[key])).length, [answers]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update(); window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('suka-olimpiade-fisika.exam-font-size') as ExamFontSize | null;
      if (saved === 'small' || saved === 'medium' || saved === 'large') setFontSize(saved);
    } catch {}
  }, []);


  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      try {
        const exams = await getExamApi().getAvailableExams(session.token);
        const found = exams.find((item) => item.examId === examId);
        if (!found) throw new Error('Ujian tidak ditemukan atau tidak tersedia untuk akun ini.');
        const storage = await checkStorageReadiness();
        if (!active) return;
        setSummary(found);
        setPreflight({ online: navigator.onLine, ...storage });
        setStorageWarning(storage.message || '');
        setPhase('preflight');
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Gagal menyiapkan ujian.'); setPhase('error');
      }
    })();
    return () => { active = false; };
  }, [examId, session]);

  const mergeQuestions = useCallback((items: Question[]) => {
    setQuestions((previous) => {
      const next = { ...previous };
      items.forEach((question) => { next[question.number] = question; });
      return next;
    });
  }, []);

  const persistLocal = useCallback(async (next?: Partial<{ answers: Record<string, string>; flagged: string[]; currentIndex: number; revision: number; lastSyncAt: string | undefined }>) => {
    if (!attempt) return;
    const response = await saveLocalAttempt({
      attemptId: attempt.attemptId,
      examId: attempt.examId,
      currentIndex: next?.currentIndex ?? currentIndex,
      answers: next?.answers ?? answers,
      flagged: next?.flagged ?? flagged,
      revision: next?.revision ?? revision,
      lastSyncAt: next?.lastSyncAt ?? lastSyncAt,
      updatedAt: new Date().toISOString(),
    });
    if (!response.ok) {
      setStorageWarning(response.quotaExceeded ? 'Penyimpanan HP penuh. Jawaban tetap disimpan di memori dan akan disinkronkan ke server saat online.' : 'Backup lokal tidak tersedia. Pastikan koneksi tetap aktif.');
      setSaveStatus(navigator.onLine ? 'local-only' : 'error');
    }
  }, [attempt, currentIndex, answers, flagged, revision, lastSyncAt]);

  const syncAnswers = useCallback(async (force = false) => {
    if (!session || !attempt || syncInFlight.current || !['IN_PROGRESS', 'PAUSED'].includes(attempt.status)) return;
    if (!navigator.onLine) { setSaveStatus('offline'); return; }
    if (!force && dirtyCount === 0) return;
    syncInFlight.current = true; setSaveStatus('syncing');
    try {
      const response = await getExamApi().saveAnswers(session.token, attempt.attemptId, revision + 1, answers);
      setRevision(response.revision); setLastSyncAt(response.lastSyncAt); setDirtyCount(0); setSaveStatus('synced');
      await persistLocal({ revision: response.revision, lastSyncAt: response.lastSyncAt });
    } catch {
      setSaveStatus(navigator.onLine ? 'error' : 'offline');
    } finally { syncInFlight.current = false; }
  }, [session, attempt, dirtyCount, revision, answers, persistLocal]);

  useEffect(() => {
    if (phase !== 'exam') return;
    const id = window.setInterval(() => syncAnswers(false), 30_000);
    return () => window.clearInterval(id);
  }, [phase, syncAnswers, session, attempt?.attemptId]);

  useEffect(() => {
    if (phase === 'exam' && dirtyCount >= 5) syncAnswers(true);
  }, [phase, dirtyCount, syncAnswers]);

  useEffect(() => {
    if (phase !== 'exam' && phase !== 'review') return;
    document.body.classList.add('exam-session-active');
    const onOnline = () => syncAnswers(true);
    const registerFocusExit = () => {
      const now = Date.now();
      if (now - lastFocusEventAt.current < 1200) return;
      lastFocusEventAt.current = now;
      syncAnswers(true);
      pendingFocusViolations.current += 1;
      setFocusViolationCount((count) => count + 1);
      setFocusWarningOpen(true);
      if (session && attempt?.attemptId && navigator.onLine) {
        const count = pendingFocusViolations.current;
        pendingFocusViolations.current = 0;
        getExamApi().reportFocusViolation(session.token, attempt.attemptId, count)
          .then((response) => setFocusViolationCount(response.focusViolationCount))
          .catch(() => { pendingFocusViolations.current += count; });
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') registerFocusExit();
      else if (pendingFocusViolations.current > 0 && session && attempt?.attemptId) {
        const count = pendingFocusViolations.current;
        pendingFocusViolations.current = 0;
        getExamApi().reportFocusViolation(session.token, attempt.attemptId, count)
          .then((response) => setFocusViolationCount(response.focusViolationCount))
          .catch(() => { pendingFocusViolations.current += count; });
      }
    };
    const onWindowBlur = () => registerFocusExit();
    const onFullscreenChange = () => {
      if (fullscreenExpected.current && !document.fullscreenElement && document.visibilityState === 'visible') {
        setSecurityNotice('Mode layar penuh dinonaktifkan. Kembali ke mode layar penuh untuk melanjutkan ujian.');
        registerFocusExit();
      }
    };
    const blockClipboard = (event: ClipboardEvent) => {
      event.preventDefault();
      setSecurityNotice('Salin, potong, dan tempel dinonaktifkan selama ujian.');
    };
    const blockContextMenu = (event: MouseEvent) => event.preventDefault();
    const blockDrag = (event: DragEvent) => event.preventDefault();
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ['c', 'x', 'v'].includes(key)) {
        event.preventDefault();
        setSecurityNotice('Salin, potong, dan tempel dinonaktifkan selama ujian.');
      }
      const screenshotShortcut = event.key === 'PrintScreen' || (event.metaKey && event.shiftKey && ['3', '4', '5'].includes(event.key));
      if (screenshotShortcut) {
        event.preventDefault();
        setSecurityNotice('Tangkapan layar tidak diizinkan selama ujian.');
        navigator.clipboard?.writeText('').catch(() => undefined);
      }
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('online', onOnline);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('copy', blockClipboard);
    document.addEventListener('cut', blockClipboard);
    document.addEventListener('paste', blockClipboard);
    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('dragstart', blockDrag);
    return () => {
      document.body.classList.remove('exam-session-active');
      window.removeEventListener('online', onOnline);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('copy', blockClipboard);
      document.removeEventListener('cut', blockClipboard);
      document.removeEventListener('paste', blockClipboard);
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('dragstart', blockDrag);
    };
  }, [phase, syncAnswers]);

  const requestExamFullscreen = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      if (document.fullscreenElement) fullscreenExpected.current = true;
    } catch {}
  };

  const applyFontSize = (size: ExamFontSize) => {
    setFontSize(size);
    try { window.localStorage.setItem('suka-olimpiade-fisika.exam-font-size', size); } catch {}
  };

  const begin = async () => {
    if (!session || !summary) return;
    requestExamFullscreen();
    setFocusViolationCount(0); setFocusWarningOpen(false); setSecurityNotice(''); setAttemptPaused(false); setTeacherWarningOpen(false);
    if (!navigator.onLine && !['IN_PROGRESS', 'PAUSED'].includes(String(summary.attemptStatus || ''))) { setError('Koneksi internet diperlukan untuk memulai attempt baru.'); return; }
    setError(''); setRemainingMs(null); autoSubmitStarted.current = false; setPhase('starting');
    try {
      let response;
      const local = await findLocalAttemptByExam(examId);
      if (['IN_PROGRESS', 'PAUSED'].includes(String(summary.attemptStatus || '')) && summary.attemptId) {
        response = await getExamApi().resumeAttempt(session.token, summary.attemptId, 0, 10);
        setAttempt(response.attempt); mergeQuestions(response.questions); setAnswers({ ...response.answers, ...(local?.answers || {}) });
        setFlagged(local?.flagged || []); setCurrentIndex(Math.min(local?.currentIndex || 0, response.attempt.questionCount - 1)); setRevision(Math.max(response.attempt.revision, local?.revision || 0));
      } else {
        if (local?.attemptId) await deleteLocalAttempt(local.attemptId);
        response = await getExamApi().startExam(session.token, examId, examToken || undefined);
        setAttempt(response.attempt); mergeQuestions(response.initialQuestions); setAnswers({}); setFlagged([]); setCurrentIndex(0); setRevision(response.attempt.revision);
      }
      const activeAttempt = response.attempt;
      setAttemptPaused(activeAttempt.status === 'PAUSED');
      const expiresAtMs = new Date(activeAttempt.expiresAt).getTime();
      const serverTimeMs = new Date(activeAttempt.serverTime).getTime();
      const initialRemaining = Number.isFinite(expiresAtMs) && Number.isFinite(serverTimeMs) ? expiresAtMs - serverTimeMs : null;
      setRemainingMs(initialRemaining === null ? null : Math.max(0, initialRemaining));
      setSaveStatus('synced'); setPhase('exam');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memulai ujian.'); setPhase('preflight'); }
  };

  useEffect(() => {
    if (phase !== 'exam' || !attempt || !session) return;
    if (loadedCount >= attempt.questionCount || currentIndex < Math.max(0, loadedCount - 3) || prefetchInFlight.current) return;
    prefetchInFlight.current = true;
    getExamApi().getQuestionsBatch(session.token, attempt.attemptId, loadedCount, attempt.batchSize || 10)
      .then((response) => mergeQuestions(response.questions))
      .catch(() => undefined)
      .finally(() => { prefetchInFlight.current = false; });
  }, [phase, attempt, session, loadedCount, currentIndex, mergeQuestions]);

  useEffect(() => {
    if (!attempt || attemptPaused || (phase !== 'exam' && phase !== 'review')) return;
    const expiresAtMs = new Date(attempt.expiresAt).getTime();
    const serverTimeMs = new Date(attempt.serverTime).getTime();
    const clientAnchorMs = Date.now();
    const serverOffsetMs = Number.isFinite(serverTimeMs) ? serverTimeMs - clientAnchorMs : 0;
    const update = () => {
      if (!Number.isFinite(expiresAtMs)) { setRemainingMs(null); return; }
      setRemainingMs(expiresAtMs - (Date.now() + serverOffsetMs));
    };
    update(); const id = window.setInterval(update, 1000); return () => window.clearInterval(id);
  }, [attempt, phase, attemptPaused]);

  const setAnswerValue = (questionId: string, value: string) => {
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers); setDirtyCount((count) => count + 1); setSaveStatus(online ? 'local-only' : 'offline');
    persistLocal({ answers: nextAnswers });
  };
  const chooseAnswer = (question: Question, value: string) => {
    if (question.questionType === 'MULTIPLE_CHOICE') {
      const current = String(answers[question.questionId] || '').split(',').filter(Boolean);
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      setAnswerValue(question.questionId, next.sort().join(','));
      return;
    }
    setAnswerValue(question.questionId, value);
  };
  const chooseTrueFalse = (question: Question, statementIndex: number, value: 'B' | 'S') => {
    const parts = String(answers[question.questionId] || '').split(',');
    while (parts.length < question.options.length) parts.push('');
    parts[statementIndex] = value;
    setAnswerValue(question.questionId, parts.join(','));
  };
  const parseMatchingAnswer = (value: string) => {
    try {
      const parsed = JSON.parse(String(value || '{}'));
      return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {};
    } catch {
      return {};
    }
  };
  const chooseMatching = (question: Question, leftId: string, rightId: string) => {
    const next = { ...parseMatchingAnswer(String(answers[question.questionId] || '')), [leftId]: rightId };
    setAnswerValue(question.questionId, JSON.stringify(next));
  };

  const toggleFlag = () => {
    if (!currentQuestion) return;
    const next = flagged.includes(currentQuestion.questionId) ? flagged.filter((id) => id !== currentQuestion.questionId) : [...flagged, currentQuestion.questionId];
    setFlagged(next); persistLocal({ flagged: next });
  };

  const moveTo = (index: number) => {
    if (index < 0 || index >= totalQuestions) return;
    setCurrentIndex(index); persistLocal({ currentIndex: index });
  };

  const finalize = useCallback(async (expired = false) => {
    if (!session || !attempt || phase === 'submitting' || phase === 'submitted') return;
    setPhase('submitting'); setError('');
    try {
      if (navigator.onLine) await syncAnswers(true);
      const submissionId = typeof crypto !== 'undefined' && crypto.randomUUID ? `SUB-${crypto.randomUUID()}` : `SUB-${Date.now()}`;
      const response = await getExamApi().submitExam(session.token, { attemptId: attempt.attemptId, submissionId, revision: revision + 1, answers });
      setResult(response.result || null); await deleteLocalAttempt(attempt.attemptId); setPhase('submitted');
    } catch (err) {
      setError(`${expired ? 'Waktu ujian telah habis. ' : ''}${err instanceof Error ? err.message : 'Jawaban belum berhasil dikirim.'} Backup lokal belum dihapus.`);
      setPhase('review');
    }
  }, [session, attempt, phase, syncAnswers, revision, answers]);

  useEffect(() => {
    if (!attemptPaused && (phase === 'exam' || phase === 'review') && remainingMs !== null && remainingMs <= 0 && attempt && !autoSubmitStarted.current) {
      autoSubmitStarted.current = true;
      finalize(true);
    }
  }, [remainingMs, phase, attempt, finalize, attemptPaused]);


  const refreshAttemptControl = useCallback(async () => {
    if (!session || !attempt?.attemptId || !navigator.onLine) return;
    try {
      const control = await getExamApi().getAttemptControl(session.token, attempt.attemptId);
      setFocusViolationCount(control.focusViolationCount || 0);
      setAttemptPaused(control.status === 'PAUSED');
      setAttempt((current) => current ? { ...current, status: control.status, expiresAt: control.expiresAt || current.expiresAt, serverTime: control.serverTime || current.serverTime } : current);
      if (control.warningAt && control.warningAt !== lastTeacherWarningRef.current) {
        lastTeacherWarningRef.current = control.warningAt;
        setTeacherWarning(control.warningMessage || 'Panitia mengirim peringatan. Tetap fokus pada ujian.');
        setTeacherWarningOpen(true);
      }
      if (control.status === 'EXPIRED') setRemainingMs(0);
    } catch { /* monitoring control is best-effort; exam answers remain local/server backed up */ }
  }, [session, attempt?.attemptId]);

  useEffect(() => {
    if (!attempt?.attemptId || (phase !== 'exam' && phase !== 'review')) return;
    refreshAttemptControl();
    const id = window.setInterval(refreshAttemptControl, 20_000);
    return () => window.clearInterval(id);
  }, [attempt?.attemptId, phase, refreshAttemptControl]);

  const saveLabel = saveStatus === 'synced' ? 'Semua jawaban tersimpan' : saveStatus === 'syncing' ? 'Menyimpan jawaban...' : saveStatus === 'offline' ? 'Offline • tersimpan sementara' : saveStatus === 'local-only' ? 'Tersimpan di perangkat' : 'Sinkronisasi tertunda';
  const teacherWarningModal = <Modal open={teacherWarningOpen} onClose={() => setTeacherWarningOpen(false)} title="Peringatan dari panitia" size="small"><div className="focus-warning teacher-warning"><AlertTriangle size={28}/><p>{teacherWarning}</p><button className="button primary full" onClick={() => { setTeacherWarningOpen(false); requestExamFullscreen(); }}>Saya mengerti</button></div></Modal>;
  const pauseOverlay = attemptPaused ? <div className="exam-pause-overlay"><div><div className="pause-symbol">Ⅱ</div><span className="eyebrow">UJIAN DIJEDA</span><h2>Panitia menjeda pengerjaan Anda.</h2><p>Jawaban tetap tersimpan. Tunggu sampai panitia menekan <strong>Lanjut</strong>. Waktu ujian tidak berkurang selama jeda.</p><LoaderCircle className="spin"/><small>Memeriksa status setiap 20 detik...</small></div></div> : null;
  const focusGuardModal = <Modal open={focusWarningOpen} onClose={() => undefined} title="Kembali ke ujian" size="small"><div className="focus-warning"><AlertTriangle size={28}/><p>Aplikasi ujian sempat tidak aktif. Selama ujian, tetap berada di SuKa Olimpiade Fisika sampai jawaban dikumpulkan.</p><small>Perpindahan terdeteksi: {focusViolationCount} kali.</small><button className="button primary full" onClick={() => { setFocusWarningOpen(false); requestExamFullscreen(); }}>Lanjutkan ujian</button></div></Modal>;

  if (phase === 'loading') return <AuthGuard role="student"><div className="center-screen"><LoaderCircle className="spin"/><span>Memeriksa ujian...</span></div></AuthGuard>;

  if (phase === 'error' || !summary) return <AuthGuard role="student"><StudentShell hideNav><div className="exam-error-page"><AlertTriangle size={42}/><h1>Ujian tidak dapat dibuka</h1><p>{error || 'Data ujian tidak tersedia.'}</p><button className="button primary" onClick={() => router.replace('/student')}>Kembali ke beranda</button></div></StudentShell></AuthGuard>;

  if (phase === 'preflight' || phase === 'starting') return <AuthGuard role="student"><StudentShell hideNav>
    <div className="preexam-page"><button className="text-button" onClick={() => router.push('/student')}><ArrowLeft size={18}/>Beranda</button>
      <section className="preexam-card"><Badge tone="primary">{summary.subject}</Badge><h1>{summary.title}</h1><p className="preexam-class">{summary.className}</p>
        <div className="preexam-grid"><div><span>Jumlah soal</span><strong>{summary.questionCount}</strong></div><div><span>Durasi</span><strong>{formatDuration(summary.durationMinutes)}</strong></div><div><span>Mulai</span><strong>{formatDateTime(summary.startTime)}</strong></div><div><span>Selesai</span><strong>{formatDateTime(summary.endTime)}</strong></div></div>
        {summary.descriptionHtml && <div className="exam-rules-preview"><MathHtml html={summary.descriptionHtml} className="reading-content"/></div>}
        {summary.rulesHtml ? <div className="instructions"><MathHtml html={summary.rulesHtml} className="reading-content"/></div> : <div className="instructions">{summary.instructions || 'Kerjakan ujian secara mandiri. Jangan menutup aplikasi sebelum status pengumpulan berhasil.'}</div>}
      </section>
      <section className="readiness-card"><div className="section-title"><div><span className="eyebrow">PRE-FLIGHT</span><h2>Kesiapan ujian</h2></div><ShieldCheck className="primary-text"/></div>
        <div className="readiness-list"><div><span className={online ? 'ready-dot ok' : 'ready-dot no'}>{online ? <Check/> : <AlertTriangle/>}</span><div><strong>Koneksi internet</strong><small>{online ? 'Tersedia untuk memulai dan sinkronisasi.' : 'Tidak tersedia. Sambungkan internet untuk memulai.'}</small></div></div><div><span className={preflight?.indexedDbAvailable ? 'ready-dot ok' : 'ready-dot warn'}>{preflight?.indexedDbAvailable ? <Check/> : <AlertTriangle/>}</span><div><strong>Backup jawaban lokal</strong><small>{preflight?.indexedDbAvailable ? 'IndexedDB siap digunakan.' : 'Tidak tersedia; aplikasi akan mengandalkan memori dan server.'}</small></div></div><div><span className="ready-dot ok"><Check/></span><div><strong>Storage ringan</strong><small>{preflight?.quotaBytes ? `${formatBytes(preflight.usageBytes)} terpakai dari estimasi ${formatBytes(preflight.quotaBytes)} kuota aplikasi.` : 'Aplikasi hanya menyimpan backup jawaban berukuran kecil.'}</small></div></div><div><span className="ready-dot ok"><Check/></span><div><strong>Timer server</strong><small>Durasi divalidasi backend dan tidak bergantung pada jam HP.</small></div></div></div>
        {summary.tokenRequired && <label className="token-field">Token ujian<input value={examToken} onChange={(e) => setExamToken(e.target.value.toUpperCase())} placeholder="Masukkan token" autoCapitalize="characters"/></label>}
        {storageWarning && <div className="notice warning"><AlertTriangle size={18}/>{storageWarning}</div>}
        {error && <div className="notice danger">{error}</div>}
        <button className="button primary full" disabled={!online || phase === 'starting' || (summary.tokenRequired && !examToken)} onClick={begin}>{phase === 'starting' ? <><LoaderCircle className="spin" size={19}/>Menyiapkan soal...</> : ['IN_PROGRESS', 'PAUSED'].includes(String(summary.attemptStatus || '')) ? <><RefreshCw size={19}/>Lanjutkan ujian</> : <><ShieldCheck size={19}/>Mulai ujian</>}</button>
        <p className="small-note">Timer baru berjalan setelah attempt dan batch soal awal berhasil disiapkan.</p>
      </section>
    </div>
  </StudentShell></AuthGuard>;

  if (phase === 'submitted') return <AuthGuard role="student"><StudentShell hideNav><div className="submitted-page"><div className="success-ring"><CheckCircle2 size={46}/></div><span className="eyebrow">BERHASIL DIKUMPULKAN</span><h1>Jawaban Anda sudah diterima.</h1><p>Attempt <code>{attempt?.attemptId}</code> telah ditutup dan backup lokal dihapus setelah server memberikan acknowledgement.</p>{result?.visible ? <div className="final-score"><strong>{result.score}</strong><span>Nilai</span><div><span>{result.correctCount} benar</span><span>{result.wrongCount} salah</span><span>{result.blankCount} kosong</span></div></div> : <div className="notice neutral">Nilai belum ditampilkan sesuai pengaturan ujian.</div>}<button className="button primary" onClick={() => router.replace('/student')}>Kembali ke beranda</button></div></StudentShell></AuthGuard>;

  if (phase === 'review' || phase === 'submitting') return <AuthGuard role="student"><StudentShell hideNav><div className="review-page exam-protected"><button className="text-button" disabled={phase === 'submitting'} onClick={() => setPhase('exam')}><ArrowLeft size={18}/>Kembali ke soal</button><span className="eyebrow">REVIEW</span><h1>Periksa sebelum mengirim</h1><p>Setelah berhasil dikumpulkan, jawaban tidak dapat diubah kembali.</p><div className="review-stats"><div><strong>{answeredCount}</strong><span>Terjawab</span></div><div><strong>{Math.max(0, totalQuestions - answeredCount)}</strong><span>Belum dijawab</span></div><div><strong>{flagged.length}</strong><span>Ragu-ragu</span></div></div>{error && <div className="notice danger">{error}</div>}<div className="number-grid review-grid">{Array.from({ length: totalQuestions }, (_, idx) => { const q = questions[idx + 1]; const answered = q && answers[q.questionId]; const isFlagged = q && flagged.includes(q.questionId); return <button key={idx} className={`number-chip ${answered ? 'answered' : ''} ${isFlagged ? 'flagged' : ''}`} onClick={() => { moveTo(idx); setPhase('exam'); }}>{idx + 1}{isFlagged && <Flag size={10}/>}</button>; })}</div><button className="button primary full" disabled={phase === 'submitting' || !online} onClick={() => finalize(false)}>{phase === 'submitting' ? <><LoaderCircle className="spin" size={19}/>Mengirim jawaban...</> : <><Send size={19}/>Kirim jawaban</>}</button>{!online && <div className="notice warning"><CloudOff size={18}/>Sambungkan internet untuk final submit. Jawaban tetap tersimpan sementara.</div>}</div>{pauseOverlay}{teacherWarningModal}{focusGuardModal}</StudentShell></AuthGuard>;

  return <AuthGuard role="student"><StudentShell hideNav>
    <div className={`exam-screen exam-protected font-${fontSize}`}>
      <div className="exam-watermark" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <span key={index}>{session?.user.name} • {session?.user.username}</span>)}</div>
      <header className="exam-topbar"><div><button className="icon-button" onClick={() => setPhase('review')} aria-label="Review ujian"><Grid3X3 size={20}/></button><div><strong>{summary.title}</strong><span>Soal {currentIndex + 1} dari {totalQuestions}</span></div></div><div className={remainingMs !== null && remainingMs < 5 * 60_000 ? 'timer danger' : 'timer'}><Clock3 size={18}/><strong>{remainingMs === null ? '--:--' : formatCountdown(Math.max(0, remainingMs))}</strong></div></header>
      <div className={`sync-strip ${saveStatus}`} >{saveStatus === 'syncing' ? <CloudUpload className="spin-soft" size={15}/> : saveStatus === 'offline' ? <CloudOff size={15}/> : <Check size={15}/>}<span>{saveLabel}{lastSyncAt && saveStatus === 'synced' ? ` • ${new Date(lastSyncAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''}</span></div>
      {storageWarning && <div className="exam-storage-warning"><AlertTriangle size={15}/>{storageWarning}</div>}
      {securityNotice && <button type="button" className="exam-security-notice" onClick={() => setSecurityNotice('')}><ShieldCheck size={15}/>{securityNotice}<span>×</span></button>}
      <div className="exam-reading-toolbar"><span className="toolbar-label">Ukuran teks</span><div className="font-size-controls" aria-label="Ukuran teks soal"><button type="button" className={fontSize === 'small' ? 'active size-small' : 'size-small'} aria-label="Ukuran huruf kecil" aria-pressed={fontSize === 'small'} onClick={() => applyFontSize('small')}>A</button><button type="button" className={fontSize === 'medium' ? 'active size-medium' : 'size-medium'} aria-label="Ukuran huruf sedang" aria-pressed={fontSize === 'medium'} onClick={() => applyFontSize('medium')}>A</button><button type="button" className={fontSize === 'large' ? 'active size-large' : 'size-large'} aria-label="Ukuran huruf besar" aria-pressed={fontSize === 'large'} onClick={() => applyFontSize('large')}>A</button></div><span className="focus-counter"><ShieldCheck size={14}/>Mode fokus</span></div>
      <main className="question-area">
        <div className="question-progress"><div style={{ width: `${((currentIndex + 1) / Math.max(1, totalQuestions)) * 100}%` }}/></div>
        {!currentQuestion ? <div className="question-loading"><LoaderCircle className="spin"/><strong>Memuat soal berikutnya...</strong><small>Prefetch sedang menyiapkan batch soal.</small></div> : <>
          <div className="question-heading"><div><span className="question-number">{String(currentIndex + 1).padStart(2, '0')}</span><span className="question-tag">{currentQuestion.tag || summary.subject}</span></div><button className={flagged.includes(currentQuestion.questionId) ? 'flag-button active' : 'flag-button'} onClick={toggleFlag}><Flag size={17}/>{flagged.includes(currentQuestion.questionId) ? 'Ditandai' : 'Ragu-ragu'}</button></div>
          <article className="question-card"><QuestionStimulus html={currentQuestion.questionHtml || currentQuestion.text} simulation={currentQuestion}/>{currentQuestion.imageUrl&&<ZoomableImage className="question-image" src={currentQuestion.imageUrl} alt="Ilustrasi soal"/>}
            {currentQuestion.questionType === 'SINGLE_CHOICE' && <div className="answer-mode single"><span className="answer-mode-symbol">○</span><div><strong>Pilih satu jawaban</strong><small>Ketuk satu opsi yang paling tepat.</small></div></div>}
            {currentQuestion.questionType === 'MULTIPLE_CHOICE' && <div className="answer-mode multiple"><span className="answer-mode-symbol">☑</span><div><strong>Pilih lebih dari satu jawaban</strong><small>Centang semua opsi yang benar.</small></div></div>}
            {currentQuestion.questionType === 'TRUE_FALSE' ? <div className="true-false-stack">{currentQuestion.options.map((option, idx) => { const parts = String(answers[currentQuestion.questionId] || '').split(','); const selected = parts[idx] || ''; return <div className="true-false-item" key={currentQuestion.questionId + '-' + option.key}><div className="question-preview-option"><strong>{idx + 1}</strong><MathHtml html={option.label} className="reading-content" imageZoom/></div><div className="true-false-controls"><button type="button" className={selected === 'B' ? 'button primary' : 'button secondary'} onClick={() => chooseTrueFalse(currentQuestion, idx, 'B')}>Benar</button><button type="button" className={selected === 'S' ? 'button primary' : 'button secondary'} onClick={() => chooseTrueFalse(currentQuestion, idx, 'S')}>Salah</button></div></div>; })}</div> : currentQuestion.questionType === 'MATCHING' ? (() => { const pairs = currentQuestion.interactionData || { left: [], right: [] }; const selectedPairs = parseMatchingAnswer(String(answers[currentQuestion.questionId] || '{}')); return <div className="matching-stack">{pairs.left.map((leftItem, idx) => <div className="matching-item" key={leftItem.id}><div className="matching-left"><strong>{idx + 1}</strong><MathHtml html={leftItem.text} className="reading-content" imageZoom/></div><select className="matching-select" value={selectedPairs[leftItem.id] || ''} onChange={(e) => chooseMatching(currentQuestion, leftItem.id, e.target.value)}><option value="">Pilih pasangan</option>{pairs.right.map((rightItem, rightIndex) => <option key={rightItem.id} value={rightItem.id}>{rightIndex + 1}. {rightItem.text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()}</option>)}</select></div>)}</div>; })() : <div className="option-list">{currentQuestion.options.map((option, idx) => { const selected = currentQuestion.questionType === 'MULTIPLE_CHOICE' ? String(answers[currentQuestion.questionId] || '').split(',').includes(option.key) : answers[currentQuestion.questionId] === option.key; return <button key={currentQuestion.questionId + '-' + option.key} className={selected ? 'option-card selected' : 'option-card'} onClick={() => chooseAnswer(currentQuestion, option.key)}><span className="option-letter">{String.fromCharCode(65 + idx)}</span><MathHtml html={option.label} className="reading-content" imageZoom/><span className={`option-check ${currentQuestion.questionType === 'MULTIPLE_CHOICE' ? 'multiple' : 'single'}`}>{currentQuestion.questionType === 'MULTIPLE_CHOICE' ? <span className={selected ? 'check-square checked' : 'check-square'}>{selected ? <Check size={15}/> : null}</span> : selected ? <span className="radio-dot checked"><i/></span> : <span className="radio-dot"/>}</span></button>; })}</div>}
            {currentQuestion.questionType === 'MATCHING' && <div className="answer-help">Pilih pasangan yang tepat untuk setiap item di kolom kiri.</div>}
          </article>
        </>}
      </main>
      <footer className="exam-footer"><button className="button secondary" disabled={currentIndex === 0} onClick={() => moveTo(currentIndex - 1)}><ArrowLeft size={18}/>Sebelumnya</button>{currentIndex < totalQuestions - 1 ? <button className="button primary" onClick={() => moveTo(currentIndex + 1)}>Berikutnya<ArrowRight size={18}/></button> : <button className="button primary" onClick={() => { syncAnswers(true); setPhase('review'); }}>Review<CheckCircle2 size={18}/></button>}</footer>
    </div>
    <Modal open={navigatorOpen} onClose={() => setNavigatorOpen(false)} title="Daftar nomor soal" size="small"><div className="navigator-legend"><span><i className="answered"/>Terjawab</span><span><i/>Belum</span><span><i className="flagged"/>Ragu</span></div><div className="number-grid">{Array.from({ length: totalQuestions }, (_, idx) => { const q = questions[idx + 1]; const answered = q && answers[q.questionId]; const isFlagged = q && flagged.includes(q.questionId); return <button key={idx} className={`number-chip ${answered ? 'answered' : ''} ${isFlagged ? 'flagged' : ''} ${idx === currentIndex ? 'current' : ''}`} onClick={() => { moveTo(idx); setNavigatorOpen(false); }}>{idx + 1}{isFlagged && <Flag size={10}/>}</button>; })}</div><button className="button secondary full modal-review-button" onClick={() => { setNavigatorOpen(false); setPhase('review'); }}>Review & kumpulkan</button></Modal>
    {pauseOverlay}{teacherWarningModal}{focusGuardModal}
  </StudentShell></AuthGuard>;
}
