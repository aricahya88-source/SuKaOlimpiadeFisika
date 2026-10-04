import type { ExamApi } from './exam-api';
import type {
  AdminExamInput,
  AttemptControl,
  AdminQuestionInput,
  AdminResultRow,
  AdminStudentInput,
  ImportStudentRow,
  ImportStudentsResult,
  AdminUserInput,
  DashboardStats,
  ExamRecord,
  ExamResult,
  ExamSummary,
  MonitoringRow,
  Question,
  QuestionRecord,
  QuestionPackageSummary,
  ResumeAttemptResponse,
  SaveAnswersResponse,
  Session,
  StartExamResponse,
  StudentRecord,
  TeacherInput,
  TeacherRecord,
  SubmitResponse,
  UploadImageResponse,
  User,
} from './types';

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export class GoogleAppsScriptExamApi implements ExamApi {
  async validateQuestion(): Promise<QuestionRecord> {throw new Error('Validasi tersedia dalam mode demo; backend lama belum mendukung fitur ini.');}
  async listValidators(): Promise<User[]> {throw new Error('Penugasan tersedia dalam mode demo.');}
  async listAssignments(): Promise<import('./types').ValidationAssignment[]> {throw new Error('Penugasan tersedia dalam mode demo.');}
  async saveAssignments(): Promise<import('./types').ValidationAssignment[]> {throw new Error('Penugasan tersedia dalam mode demo.');}

  constructor(private readonly baseUrl: string) {
    if (!baseUrl) throw new Error('NEXT_PUBLIC_APPS_SCRIPT_URL belum diisi.');
  }

  private async request<T>(action: string, payload: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
    // text/plain adalah "simple request" sehingga tidak memicu preflight OPTIONS
    // yang tidak ditangani Google Apps Script Web App.
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
      cache: 'no-store',
      signal,
    });

    if (!response.ok) throw new ApiError(`Backend tidak dapat dihubungi (${response.status}).`, 'HTTP_ERROR');
    const envelope = (await response.json()) as ApiEnvelope<T>;
    if (!envelope.ok) throw new ApiError(envelope.error || 'Permintaan gagal.', envelope.code);
    return envelope.data;
  }

  login(username: string, password: string) { return this.request<Session>('login', { username, password }); }
  logout(token: string) { return this.request<void>('logout', { token }); }
  getSession(token: string) { return this.request<Session>('getSession', { token }); }
  getAvailableExams(token: string) { return this.request<ExamSummary[]>('getAvailableExams', { token }); }
  startExam(token: string, examId: string, examToken?: string) { return this.request<StartExamResponse>('startExam', { token, examId, examToken }); }
  resumeAttempt(token: string, attemptId: string, offset = 0, limit = 10) { return this.request<ResumeAttemptResponse>('resumeAttempt', { token, attemptId, offset, limit }); }
  getQuestionsBatch(token: string, attemptId: string, offset: number, limit: number) { return this.request<{ questions: Question[]; offset: number; hasMore: boolean }>('getQuestionsBatch', { token, attemptId, offset, limit }); }
  saveAnswers(token: string, attemptId: string, revision: number, answers: Record<string, string>) { return this.request<SaveAnswersResponse>('saveAnswers', { token, attemptId, revision, answers }); }
  submitExam(token: string, input: { attemptId: string; submissionId: string; revision: number; answers: Record<string, string> }) { return this.request<SubmitResponse>('submitExam', { token, ...input }); }
  getResult(token: string, attemptId: string) { return this.request<ExamResult | null>('getResult', { token, attemptId }); }
  getMyResults(token: string) { return this.request<ExamResult[]>('getMyResults', { token }); }
  getDashboardStats(token: string) { return this.request<DashboardStats>('getDashboardStats', { token }); }
  listExams(token: string) { return this.request<ExamRecord[]>('listExams', { token }); }
  saveExam(token: string, input: AdminExamInput) { return this.request<ExamRecord>('saveExam', { token, input }); }
  deleteExam(token: string, examId: string) { return this.request<void>('deleteExam', { token, examId }); }
  duplicateExam(token: string, examId: string) { return this.request<ExamRecord>('duplicateExam', { token, examId }); }
  getExamQuestionIds(token: string, examId: string) { return this.request<string[]>('getExamQuestionIds', { token, examId }); }
  saveExamQuestions(token: string, examId: string, questionIds: string[]) { return this.request<{ questionCount: number }>('saveExamQuestions', { token, examId, questionIds }); }
  listQuestionPackages(token: string) { return this.request<QuestionPackageSummary[]>('listQuestionPackages', { token }); }
  applyQuestionPackage(token: string, examId: string, category: string, packageName: string) { return this.request<{ questionCount: number }>('applyQuestionPackage', { token, examId, category, packageName }); }
  listQuestions(token: string, examId?: string) { return this.request<QuestionRecord[]>('listQuestions', { token, examId }); }
  saveQuestion(token: string, input: AdminQuestionInput) { return this.request<QuestionRecord>('saveQuestion', { token, input }); }
  deleteQuestion(token: string, questionId: string) { return this.request<void>('deleteQuestion', { token, questionId }); }
  importQuestionsCsv(token: string, csvText: string) { return this.request<{ imported: number; errors: string[] }>('importQuestionsCsv', { token, csvText }); }
  uploadQuestionImage(token: string, file: { name: string; mimeType: string; base64: string }) { return this.request<UploadImageResponse>('uploadQuestionImage', { token, file }); }
  listStudents(token: string) { return this.request<StudentRecord[]>('listStudents', { token }); }
  saveStudent(token: string, input: AdminStudentInput) { return this.request<StudentRecord>('saveStudent', { token, input }); }
  deleteStudent(token: string, userId: string) { return this.request<void>('deleteStudent', { token, userId }); }
  importStudents(token: string, rows: ImportStudentRow[], defaultPassword?: string) { return this.request<ImportStudentsResult>('importStudents', { token, rows, defaultPassword }); }
  listUsers(token: string) { return this.request<User[]>('listUsers', { token }); }
  saveUser(token: string, input: AdminUserInput) { return this.request<User>('saveUser', { token, input }); }
  deleteUser(token: string, userId: string) { return this.request<void>('deleteUser', { token, userId }); }
  listTeachers(token: string) { return this.request<TeacherRecord[]>('listTeachers', { token }); }
  saveTeacher(token: string, input: TeacherInput) { return this.request<TeacherRecord>('saveTeacher', { token, input }); }
  deleteTeacher(token: string, userId: string) { return this.request<void>('deleteTeacher', { token, userId }); }
  getMonitoring(token: string, examId?: string) { return this.request<MonitoringRow[]>('getMonitoring', { token, examId }); }
  setAttemptPaused(token: string, attemptId: string, paused: boolean) { return this.request<AttemptControl>('setAttemptPaused', { token, attemptId, paused }); }
  warnAttempt(token: string, attemptId: string, message: string) { return this.request<{ attemptId: string; warningMessage: string; warningAt: string }>('warnAttempt', { token, attemptId, message }); }
  getAttemptControl(token: string, attemptId: string) { return this.request<AttemptControl>('getAttemptControl', { token, attemptId }); }
  reportFocusViolation(token: string, attemptId: string, count = 1) { return this.request<{ attemptId: string; focusViolationCount: number }>('reportFocusViolation', { token, attemptId, count }); }
  resetAttempt(token: string, attemptId: string) { return this.request<{ attemptId: string; reset: boolean }>('resetAttempt', { token, attemptId }); }
  getAdminResults(token: string, examId?: string) { return this.request<AdminResultRow[]>('getAdminResults', { token, examId }); }
}
