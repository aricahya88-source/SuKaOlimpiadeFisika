'use client';

import { QuestionResponse } from '@/components/question-response';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Clock3, CloudOff, CloudUpload, Flag, Grid3X3, LoaderCircle, RefreshCw, Send, ShieldCheck, Wifi } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { StudentShell } from '@/components/student-shell';
import { Badge, Modal } from '@/components/ui';
import { MathHtml, ZoomableImage } from '@/components/math-html';
import { QuestionStimulus } from '@/components/question-stimulus';
import { useSession } from '@/contexts/session-context';
import { getExamApi, type Attempt, type ExamResult, type ExamSummary, type PreflightResult, type Question, type SaveStatus, type SaveAnswersResponse, type SubmitResponse } from '@/lib/api';
import { checkStorageReadiness, deleteLocalAttempt, findLocalAttemptByExam, saveLocalAttempt } from '@/lib/exam-store';
import { differingAnswerIds } from '@/lib/answer-sync';
import { formatBytes, formatCountdown, formatDateTime, formatDuration } from '@/lib/format';
import { isExamSimulationIframeFocused, shouldRecordExamFocusExit } from '@/lib/exam-focus';

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
  const [deadlineLocked, setDeadlineLocked] = useState(false);
  const [submissionWarning, setSubmissionWarning] = useState('');
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
  const simulationFullscreenActive = useRef(false);
  const lastFocusEventAt = useRef(0);
  const syncPromiseRef = useRef<Promise<boolean> | null>(null);
  const latestAnswersRef = useRef<Record<string, string>>({});
  const latestRevisionRef = useRef(0);
  const changeVersionRef = useRef(0);
  const savedVersionRef = useRef(0);
  const submissionIdRef = useRef<string | null>(null);
  const deadlineLockedRef = useRef(false);
  const lockedAtRef = useRef<string | undefined>(undefined);
  const finalizingRef = useRef(false);
  const clockRef = useRef<{ deadline: number; serverAt: number; performanceAt: number } | null>(null);
  const previouslyOnlineRef = useRef(true);
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

  const persistLocal = useCallback(async (next?: Partial<{ answers: Record<string, string>; flagged: string[]; currentIndex: number; revision: number; lastSyncAt: string | undefined; lockedAt: string | undefined }>) => {
    if (!attempt) return;
    const response = await saveLocalAttempt({
      attemptId: attempt.attemptId,
      examId: attempt.examId,
      currentIndex: next?.currentIndex ?? currentIndex,
      answers: next?.answers ?? latestAnswersRef.current,
      flagged: next?.flagged ?? flagged,
      revision: next?.revision ?? latestRevisionRef.current,
      lastSyncAt: next?.lastSyncAt ?? lastSyncAt,
      lockedAt: next?.lockedAt ?? lockedAtRef.current,
      updatedAt: new Date().toISOString(),
    });
    if (!response.ok) {
      setStorageWarning(response.quotaExceeded ? 'Penyimpanan HP penuh. Jawaban tetap disimpan di memori dan akan disinkronkan ke server saat online.' : 'Backup lokal tidak tersedia. Pastikan koneksi tetap aktif.');
      if (changeVersionRef.current > savedVersionRef.current) setSaveStatus('error');
    }
  }, [attempt, currentIndex, flagged, lastSyncAt]);

  // Clock is anchored to a server timestamp using monotonic performance.now().
  // Editing is still enforced on the server independently of this client clock.
  const remainingByServerClock = () => {
    const clock = clockRef.current;
    return clock ? clock.deadline - (clock.serverAt + performance.now() - clock.performanceAt) : Number.POSITIVE_INFINITY;
  };

  const syncAnswers = useCallback(async (_force = false): Promise<boolean> => {
    if (syncPromiseRef.current) return syncPromiseRef.current;
    if (!session || !attempt || attempt.status !== 'IN_PROGRESS' || deadlineLockedRef.current) return false;
    if (changeVersionRef.current === savedVersionRef.current) return true;
    if (!navigator.onLine) { setSaveStatus('offline'); return false; }
    let snapshot = { ...latestAnswersRef.current };
    let includedVersion = changeVersionRef.current;
    const nextRevision = latestRevisionRef.current + 1;
    setSaveStatus('syncing');
    const pending = (async () => {
      try {
        let response: SaveAnswersResponse;
        try {
          response = await getExamApi().saveAnswers(session.token, attempt.attemptId, nextRevision, snapshot);
        } catch (firstError) {
          if (!(firstError instanceof Error) || !/revisi jawaban.*kedaluwarsa/i.test(firstError.message)) throw firstError;
          // Lost HTTP acknowledgement must not cause an older revision to overwrite server data.
          const resumed = await getExamApi().resumeAttempt(session.token, attempt.attemptId, 0, 1);
          latestRevisionRef.current = Math.max(latestRevisionRef.current, resumed.attempt.revision);
          snapshot = { ...latestAnswersRef.current };
          includedVersion = changeVersionRef.current;
          response = await getExamApi().saveAnswers(session.token, attempt.attemptId, latestRevisionRef.current + 1, snapshot);
        }
        // An HTTP 200 or revision counter alone does not prove the answers reached the server.
        const serverAnswers = response.confirmedAnswers ?? (await getExamApi().resumeAttempt(session.token, attempt.attemptId, 0, 1)).answers;
        if (differingAnswerIds(snapshot, serverAnswers).length) {
          throw new Error('Konfirmasi server berbeda dari jawaban yang dikirim.');
        }
        latestRevisionRef.current = Math.max(latestRevisionRef.current, response.revision);
        savedVersionRef.current = Math.max(savedVersionRef.current, includedVersion);
        const remaining = Math.max(0, changeVersionRef.current - savedVersionRef.current);
        setRevision(latestRevisionRef.current);
        setLastSyncAt(response.lastSyncAt);
        setDirtyCount(remaining);
        setSaveStatus(remaining ? 'local-only' : 'synced');
        await persistLocal({ answers: { ...latestAnswersRef.current }, revision: latestRevisionRef.current, lastSyncAt: response.lastSyncAt });
        return remaining === 0;
      } catch {
        setSaveStatus(navigator.onLine ? 'error' : 'offline');
        return false;
      } finally {
        syncPromiseRef.current = null;
      }
    })();
    syncPromiseRef.current = pending;
    return pending;
  }, [session, attempt, persistLocal]);

  useEffect(() => {
    if (phase !== 'exam') return;
    const id = window.setInterval(() => syncAnswers(false), 15_000);
    return () => window.clearInterval(id);
  }, [phase, syncAnswers, session, attempt?.attemptId]);

  // Fast debounce protects the last answer in a high-stakes timed test.
  useEffect(() => {
    if ((phase !== 'exam' && phase !== 'review') || dirtyCount < 1 || deadlineLocked) return;
    const id = window.setTimeout(() => { void syncAnswers(true); }, 900);
    return () => window.clearTimeout(id);
  }, [phase, dirtyCount, deadlineLocked, syncAnswers]);

  useEffect(() => {
    if (phase !== 'exam' && phase !== 'review') return;
    document.body.classList.add('exam-session-active');
    let pendingBlurCheck: number | undefined;
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
      if (document.visibilityState === 'hidden') {
        // Visibility takes precedence over the iframe exception: changing tabs
        // is a real focus violation even if the last focused element was the simulation.
        if (pendingBlurCheck !== undefined) window.clearTimeout(pendingBlurCheck);
        registerFocusExit();
      }
      else if (pendingFocusViolations.current > 0 && session && attempt?.attemptId) {
        const count = pendingFocusViolations.current;
        pendingFocusViolations.current = 0;
        getExamApi().reportFocusViolation(session.token, attempt.attemptId, count)
          .then((response) => setFocusViolationCount(response.focusViolationCount))
          .catch(() => { pendingFocusViolations.current += count; });
      }
    };
    const onWindowBlur = () => {
      if (pendingBlurCheck !== undefined) window.clearTimeout(pendingBlurCheck);
      // Browsers dispatch window.blur when a cross-origin iframe is clicked.
      // Wait briefly for activeElement to settle before deciding.
      pendingBlurCheck = window.setTimeout(() => {
        pendingBlurCheck = undefined;
        const hidden = document.visibilityState === 'hidden';
        const insideSimulation = isExamSimulationIframeFocused(document.activeElement);
        if (shouldRecordExamFocusExit('blur', hidden, insideSimulation)) registerFocusExit();
      }, 50);
    };
    const onFullscreenChange = () => {
      const simulationFullscreen = isExamSimulationIframeFocused(document.fullscreenElement);
      if (simulationFullscreen) {
        simulationFullscreenActive.current = true;
        return;
      }
      if (simulationFullscreenActive.current) {
        simulationFullscreenActive.current = false;
        // Closing a simulator's own fullscreen is not an attempt to exit the exam.
        // Keep the guard active; browser permissions may require the user to
        // re-enter fullscreen using the ordinary exam controls.
        return;
      }
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
      if (pendingBlurCheck !== undefined) window.clearTimeout(pendingBlurCheck);
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
      const local = await findLocalAttemptByExam(examId, summary.attemptId);
      if (summary.attemptStatus === 'SUBMITTED' && summary.attemptId) {
        const restored = await getExamApi().resumeAttempt(session.token, summary.attemptId, 0, 1);
        setAttempt(restored.attempt);
        const diff = local?.attemptId === summary.attemptId ? differingAnswerIds(local.answers, restored.answers) : [];
        setSubmissionWarning(diff.length ? `${diff.length} jawaban lokal berbeda dari jawaban server. Backup perangkat tetap disimpan. Segera hubungi panitia untuk pemeriksaan.` : '');
        if (local?.attemptId === summary.attemptId && !diff.length) await deleteLocalAttempt(summary.attemptId);
        setResult(await getExamApi().getResult(session.token, summary.attemptId));
        setPhase('submitted');
        return;
      }
      if (['IN_PROGRESS', 'PAUSED'].includes(String(summary.attemptStatus || '')) && summary.attemptId) {
        response = await getExamApi().resumeAttempt(session.token, summary.attemptId, 0, 10);
        const recoveredAnswers = { ...response.answers, ...(local?.attemptId === response.attempt.attemptId ? local.answers : {}) };
        const needsSync = Object.keys(recoveredAnswers).some((id) => recoveredAnswers[id] !== response.answers[id]);
        latestAnswersRef.current = recoveredAnswers;
        lockedAtRef.current = local?.attemptId === response.attempt.attemptId ? local?.lockedAt : undefined;
        deadlineLockedRef.current = Boolean(lockedAtRef.current);
        latestRevisionRef.current = response.attempt.revision;
        changeVersionRef.current = needsSync ? 1 : 0;
        savedVersionRef.current = 0;
        setDirtyCount(needsSync ? 1 : 0);
        setSaveStatus(needsSync ? 'local-only' : 'synced');
        setAttempt(response.attempt); mergeQuestions(response.questions); setAnswers(recoveredAnswers);
        setFlagged(local?.flagged || []); setCurrentIndex(Math.min(local?.currentIndex || 0, response.attempt.questionCount - 1)); setRevision(response.attempt.revision);
      } else {
        // Never delete a previous local backup before the server accepts a submission.
        response = await getExamApi().startExam(session.token, examId, examToken || undefined);
        latestAnswersRef.current = {};
        lockedAtRef.current = undefined;
        deadlineLockedRef.current = false;
        latestRevisionRef.current = response.attempt.revision;
        changeVersionRef.current = 0;
        savedVersionRef.current = 0;
        setDirtyCount(0); setSaveStatus('synced');
        setAttempt(response.attempt); mergeQuestions(response.initialQuestions); setAnswers({}); setFlagged([]); setCurrentIndex(0); setRevision(response.attempt.revision);
      }
      submissionIdRef.current = null;
      const activeAttempt = response.attempt;
      setAttemptPaused(activeAttempt.status === 'PAUSED');
      const expiresAtMs = new Date(activeAttempt.expiresAt).getTime();
      const serverTimeMs = new Date(activeAttempt.serverTime).getTime();
      const initialRemaining = Number.isFinite(expiresAtMs) && Number.isFinite(serverTimeMs) ? expiresAtMs - serverTimeMs : null;
      if (Number.isFinite(expiresAtMs) && Number.isFinite(serverTimeMs)) {
        clockRef.current = { deadline: expiresAtMs, serverAt: serverTimeMs, performanceAt: performance.now() };
      } else clockRef.current = null;
      const isExpired = !Number.isFinite(expiresAtMs) || !Number.isFinite(serverTimeMs) || initialRemaining === null || initialRemaining <= 0 || Boolean(lockedAtRef.current);
      if (isExpired && activeAttempt.status !== 'PAUSED') {
        deadlineLockedRef.current = true;
        lockedAtRef.current ||= new Date().toISOString();
        setDeadlineLocked(true);
        setPhase('review');
        void saveLocalAttempt({ attemptId: activeAttempt.attemptId, examId: activeAttempt.examId, currentIndex: local?.currentIndex || 0, answers: { ...latestAnswersRef.current }, flagged: local?.flagged || [], revision: latestRevisionRef.current, lockedAt: lockedAtRef.current, updatedAt: new Date().toISOString() });
      } else {
        setDeadlineLocked(false);
        setPhase('exam');
      }
      setRemainingMs(initialRemaining === null ? null : Math.max(0, initialRemaining));
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
    if (Number.isFinite(expiresAtMs) && Number.isFinite(serverTimeMs)) {
      clockRef.current = { deadline: expiresAtMs, serverAt: serverTimeMs, performanceAt: performance.now() };
    }
    const update = () => {
      if (!clockRef.current) { setRemainingMs(null); return; }
      setRemainingMs(remainingByServerClock());
    };
    update(); const id = window.setInterval(update, 1000); return () => window.clearInterval(id);
  }, [attempt, phase, attemptPaused]);

  const setAnswerValue = (questionId: string, value: string) => {
    // Ref guard prevents a queued click from sneaking through during expiry/submission.
    if (deadlineLockedRef.current || finalizingRef.current || remainingByServerClock() <= 0 || attemptPaused) return;
    const nextAnswers = { ...latestAnswersRef.current, [questionId]: value };
    latestAnswersRef.current = nextAnswers;
    changeVersionRef.current += 1;
    setAnswers(nextAnswers); setDirtyCount(changeVersionRef.current - savedVersionRef.current); setSaveStatus(online ? 'local-only' : 'offline');
    persistLocal({ answers: nextAnswers });
  };
  const chooseAnswer = (question: Question, value: string) => {
    if (question.questionType === 'MULTIPLE_CHOICE') {
      const current = String(latestAnswersRef.current[question.questionId] || '').split(',').filter(Boolean);
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      setAnswerValue(question.questionId, next.sort().join(','));
      return;
    }
    setAnswerValue(question.questionId, value);
  };
  const chooseTrueFalse = (question: Question, statementIndex: number, value: 'B' | 'S') => {
    const parts = String(latestAnswersRef.current[question.questionId] || '').split(',');
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
    const next = { ...parseMatchingAnswer(String(latestAnswersRef.current[question.questionId] || '')), [leftId]: rightId };
    setAnswerValue(question.questionId, JSON.stringify(next));
  };

  const toggleFlag = () => {
    if (!currentQuestion || deadlineLockedRef.current || finalizingRef.current) return;
    const next = flagged.includes(currentQuestion.questionId) ? flagged.filter((id) => id !== currentQuestion.questionId) : [...flagged, currentQuestion.questionId];
    setFlagged(next); persistLocal({ flagged: next });
  };

  const moveTo = (index: number) => {
    if (index < 0 || index >= totalQuestions) return;
    setCurrentIndex(index); persistLocal({ currentIndex: index });
  };

  const finalize = useCallback(async (expired = false) => {
    if (!session || !attempt || finalizingRef.current || phase === 'submitted') return;
    finalizingRef.current = true;
    const permanentlyLocked = expired || deadlineLockedRef.current || remainingByServerClock() <= 0;
    if (permanentlyLocked) {
      deadlineLockedRef.current = true;
      lockedAtRef.current ||= new Date().toISOString();
      setDeadlineLocked(true);
    }
    setPhase('submitting'); setError('');
    try {
      // Persist the latest answer snapshot locally BEFORE attempting submission.
      await persistLocal({ answers: { ...latestAnswersRef.current }, lockedAt: lockedAtRef.current });
      if (syncPromiseRef.current) await syncPromiseRef.current;
      if (!navigator.onLine) throw new Error('Tidak ada koneksi. Backup lokal dipertahankan sampai koneksi kembali.');
      if (!submissionIdRef.current) submissionIdRef.current = typeof crypto !== 'undefined' && crypto.randomUUID ? `SUB-${crypto.randomUUID()}` : `SUB-${Date.now()}`;
      const snapshot = { ...latestAnswersRef.current };
      const send = () => getExamApi().submitExam(session.token, { attemptId: attempt.attemptId, submissionId: submissionIdRef.current!, revision: latestRevisionRef.current + 1, answers: snapshot });
      let response: SubmitResponse;
      try { response = await send(); }
      catch (firstError) {
        if (!(firstError instanceof Error) || !/revisi jawaban.*kedaluwarsa/i.test(firstError.message)) throw firstError;
        const resumed = await getExamApi().resumeAttempt(session.token, attempt.attemptId, 0, 1);
        latestRevisionRef.current = Math.max(latestRevisionRef.current, resumed.attempt.revision);
        response = await send();
      }
      if (!response.accepted) throw new Error('Server belum menerima pengumpulan. Backup dipertahankan.');
      // Neon/demo now return the actual persisted answers; older backends fall back
      // to a read-back. Do not clear local backup unless every value is confirmed.
      let confirmed = response.confirmedAnswers;
      if (!confirmed) {
        try { confirmed = (await getExamApi().resumeAttempt(session.token, attempt.attemptId, 0, 1)).answers; }
        catch { confirmed = undefined; }
      }
      const missing = confirmed ? differingAnswerIds(snapshot, confirmed) : Object.keys(snapshot);
      if (missing.length || !confirmed) {
        setSubmissionWarning(`Pengumpulan diterima, tetapi ${missing.length || 'sejumlah'} jawaban belum cocok/terverifikasi pada server. Backup tidak dihapus. Jangan bersihkan data browser; hubungi panitia dengan ID pengerjaan ini.`);
      } else {
        setSubmissionWarning('');
        await deleteLocalAttempt(attempt.attemptId);
      }
      setResult(response.result || null);
      setPhase('submitted');
    } catch (err) {
      const isNowExpired = permanentlyLocked || remainingByServerClock() <= 0;
      if (isNowExpired) {
        deadlineLockedRef.current = true;
        lockedAtRef.current ||= new Date().toISOString();
        setDeadlineLocked(true);
        void persistLocal({ lockedAt: lockedAtRef.current });
      }
      setError(`${isNowExpired ? 'Waktu ujian telah habis. ' : ''}${err instanceof Error ? err.message : 'Jawaban belum berhasil dikirim.'} Backup lokal tidak dihapus.`);
      setPhase('review');
    } finally { finalizingRef.current = false; }
  }, [session, attempt, phase, persistLocal]);

  useEffect(() => {
    if (!attemptPaused && (phase === 'exam' || phase === 'review') && remainingMs !== null && remainingMs <= 0 && attempt) {
      if (!deadlineLockedRef.current) {
        deadlineLockedRef.current = true;
        lockedAtRef.current ||= new Date().toISOString();
        setDeadlineLocked(true);
        void persistLocal({ lockedAt: lockedAtRef.current });
      }
      if (!autoSubmitStarted.current) {
        autoSubmitStarted.current = true;
        if (navigator.onLine) void finalize(true);
        else { setPhase('review'); setError('Waktu berakhir saat offline. Jawaban dikunci dan backup tetap tersimpan. Sambungkan internet untuk mengonfirmasi pengumpulan.'); }
      }
    }
  }, [remainingMs, phase, attempt, attemptPaused, finalize, persistLocal]);

  // Retry automatically only on an actual offline -> online transition.
  // An always-online API error must not cause an infinite submit loop.
  useEffect(() => {
    if (online && !previouslyOnlineRef.current && deadlineLockedRef.current && phase === 'review') {
      void finalize(true);
    }
    previouslyOnlineRef.current = online;
  }, [online, deadlineLocked, phase, finalize]);


  const refreshAttemptControl = useCallback(async () => {
    if (!session || !attempt?.attemptId || !navigator.onLine) return;
    try {
      const control = await getExamApi().getAttemptControl(session.token, attempt.attemptId);
      setFocusViolationCount(control.focusViolationCount || 0);
      setAttemptPaused(control.status === 'PAUSED');
      setAttempt((current) => current ? { ...current, status: control.status, expiresAt: control.expiresAt || current.expiresAt, serverTime: control.serverTime || current.serverTime } : current);
      const nextDeadline = Date.parse(control.expiresAt || attempt.expiresAt);
      const nextServer = Date.parse(control.serverTime || new Date().toISOString());
      if (Number.isFinite(nextDeadline) && Number.isFinite(nextServer)) {
        clockRef.current = { deadline: nextDeadline, serverAt: nextServer, performanceAt: performance.now() };
      }
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
        <button className="button primary full" disabled={!online || phase === 'starting' || (summary.tokenRequired && !examToken && summary.attemptStatus !== 'SUBMITTED' && !summary.attemptId)} onClick={begin}>{phase === 'starting' ? <><LoaderCircle className="spin" size={19}/>Menyiapkan soal...</> : summary.attemptStatus === 'SUBMITTED' ? <><ShieldCheck size={19}/>Periksa bukti pengumpulan</> : ['IN_PROGRESS', 'PAUSED'].includes(String(summary.attemptStatus || '')) ? <><RefreshCw size={19}/>Lanjutkan ujian</> : <><ShieldCheck size={19}/>Mulai ujian</>}</button>
        <p className="small-note">Timer baru berjalan setelah attempt dan batch soal awal berhasil disiapkan.</p>
      </section>
    </div>
  </StudentShell></AuthGuard>;

  if (phase === 'submitted') return <AuthGuard role="student"><StudentShell hideNav><div className="submitted-page"><div className="success-ring"><CheckCircle2 size={46}/></div><span className="eyebrow">{submissionWarning ? 'PERLU PEMERIKSAAN PANITIA' : 'BERHASIL DIKUMPULKAN'}</span><h1>{submissionWarning ? 'Pengumpulan diterima, perlu pemeriksaan' : 'Jawaban Anda sudah diterima.'}</h1><p>Attempt <code>{attempt?.attemptId}</code> telah ditutup. {submissionWarning ? 'Cadangan jawaban tetap disimpan di perangkat ini.' : 'Jawaban telah diverifikasi dengan data yang tersimpan di server.'}</p>{submissionWarning && <div className="notice warning"><AlertTriangle size={18}/>{submissionWarning}</div>}{result?.visible && !submissionWarning ? <div className="final-score"><strong>{result.score}</strong><span>Nilai</span><div><span>{result.correctCount} benar</span><span>{result.wrongCount} salah</span><span>{result.blankCount} kosong</span></div></div> : !submissionWarning ? <div className="notice neutral">Nilai belum ditampilkan sesuai pengaturan ujian.</div> : null}<button className="button primary" onClick={() => router.replace('/student')}>Kembali ke beranda</button></div></StudentShell></AuthGuard>;

  if (phase === 'review' || phase === 'submitting') return <AuthGuard role="student"><StudentShell hideNav><div className="review-page exam-protected">{!deadlineLocked && <button className="text-button" disabled={phase === 'submitting'} onClick={() => setPhase('exam')}><ArrowLeft size={18}/>Kembali ke soal</button>}<span className="eyebrow">{deadlineLocked ? 'WAKTU HABIS' : 'REVIEW'}</span><h1>{deadlineLocked ? 'Jawaban dikunci' : 'Periksa sebelum mengirim'}</h1><p>{deadlineLocked ? 'Tidak ada waktu tambahan untuk mengubah jawaban. Sistem akan memverifikasi jawaban yang sudah diterima server.' : 'Setelah berhasil dikumpulkan, jawaban tidak dapat diubah kembali.'}</p><div className="review-stats"><div><strong>{answeredCount}</strong><span>Terjawab</span></div><div><strong>{Math.max(0, totalQuestions - answeredCount)}</strong><span>Belum dijawab</span></div><div><strong>{flagged.length}</strong><span>Ragu-ragu</span></div></div>{error && <div className="notice danger">{error}</div>}<div className="number-grid review-grid">{Array.from({ length: totalQuestions }, (_, idx) => { const q = questions[idx + 1]; const answered = q && answers[q.questionId]; const isFlagged = q && flagged.includes(q.questionId); return <button key={idx} className={`number-chip ${answered ? 'answered' : ''} ${isFlagged ? 'flagged' : ''}`} disabled={deadlineLocked || phase === 'submitting'} onClick={() => { moveTo(idx); setPhase('exam'); }}>{idx + 1}{isFlagged && <Flag size={10}/>}</button>; })}</div><button className="button primary full" disabled={phase === 'submitting' || !online} onClick={() => finalize(false)}>{phase === 'submitting' ? <><LoaderCircle className="spin" size={19}/>Mengirim jawaban...</> : deadlineLocked ? <><Send size={19}/>Konfirmasi pengumpulan</> : <><Send size={19}/>Kirim jawaban</>}</button>{!online && <div className="notice warning"><CloudOff size={18}/>Sambungkan internet untuk final submit. Jawaban tetap tersimpan sementara.</div>}</div>{pauseOverlay}{teacherWarningModal}{focusGuardModal}</StudentShell></AuthGuard>;

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
            <QuestionResponse currentQuestion={currentQuestion} answers={answers} chooseAnswer={chooseAnswer} chooseTrueFalse={chooseTrueFalse} chooseMatching={chooseMatching}/>
          </article>
        </>}
      </main>
      <footer className="exam-footer"><button className="button secondary" disabled={currentIndex === 0} onClick={() => moveTo(currentIndex - 1)}><ArrowLeft size={18}/>Sebelumnya</button>{currentIndex < totalQuestions - 1 ? <button className="button primary" onClick={() => moveTo(currentIndex + 1)}>Berikutnya<ArrowRight size={18}/></button> : <button className="button primary" onClick={() => { syncAnswers(true); setPhase('review'); }}>Review<CheckCircle2 size={18}/></button>}</footer>
    </div>
    <Modal open={navigatorOpen} onClose={() => setNavigatorOpen(false)} title="Daftar nomor soal" size="small"><div className="navigator-legend"><span><i className="answered"/>Terjawab</span><span><i/>Belum</span><span><i className="flagged"/>Ragu</span></div><div className="number-grid">{Array.from({ length: totalQuestions }, (_, idx) => { const q = questions[idx + 1]; const answered = q && answers[q.questionId]; const isFlagged = q && flagged.includes(q.questionId); return <button key={idx} className={`number-chip ${answered ? 'answered' : ''} ${isFlagged ? 'flagged' : ''} ${idx === currentIndex ? 'current' : ''}`} onClick={() => { moveTo(idx); setNavigatorOpen(false); }}>{idx + 1}{isFlagged && <Flag size={10}/>}</button>; })}</div><button className="button secondary full modal-review-button" onClick={() => { setNavigatorOpen(false); setPhase('review'); }}>Review & kumpulkan</button></Modal>
    {pauseOverlay}{teacherWarningModal}{focusGuardModal}
  </StudentShell></AuthGuard>;
}
