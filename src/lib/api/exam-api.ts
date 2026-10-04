import type {
  AdminExamInput,
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
  AttemptControl,
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
  ValidationAssignment,
} from './types';

export interface ExamApi {
  login(username: string, password: string): Promise<Session>;
  logout(token: string): Promise<void>;
  getSession(token: string): Promise<Session>;

  getAvailableExams(token: string): Promise<ExamSummary[]>;
  startExam(token: string, examId: string, examToken?: string): Promise<StartExamResponse>;
  resumeAttempt(token: string, attemptId: string, offset?: number, limit?: number): Promise<ResumeAttemptResponse>;
  getQuestionsBatch(token: string, attemptId: string, offset: number, limit: number): Promise<{ questions: Question[]; offset: number; hasMore: boolean }>;
  saveAnswers(token: string, attemptId: string, revision: number, answers: Record<string, string>): Promise<SaveAnswersResponse>;
  submitExam(token: string, input: { attemptId: string; submissionId: string; revision: number; answers: Record<string, string> }): Promise<SubmitResponse>;
  getResult(token: string, attemptId: string): Promise<ExamResult | null>;
  getMyResults(token: string): Promise<ExamResult[]>;

  getDashboardStats(token: string): Promise<DashboardStats>;
  listExams(token: string): Promise<ExamRecord[]>;
  saveExam(token: string, input: AdminExamInput): Promise<ExamRecord>;
  deleteExam(token: string, examId: string): Promise<void>;
  duplicateExam(token: string, examId: string): Promise<ExamRecord>;
  getExamQuestionIds(token: string, examId: string): Promise<string[]>;
  saveExamQuestions(token: string, examId: string, questionIds: string[]): Promise<{ questionCount: number }>;
  listQuestionPackages(token: string): Promise<QuestionPackageSummary[]>;
  applyQuestionPackage(token: string, examId: string, category: string, packageName: string): Promise<{ questionCount: number }>;
  listQuestions(token: string, examId?: string): Promise<QuestionRecord[]>;
  validateQuestion(token: string, questionId: string, decision: 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED', note?: string): Promise<QuestionRecord>;
  listValidators(token: string): Promise<User[]>;
  listAssignments(token: string): Promise<ValidationAssignment[]>;
  saveAssignments(token: string, questionIds: string[], validatorIds: string[]): Promise<ValidationAssignment[]>;
  saveQuestion(token: string, input: AdminQuestionInput): Promise<QuestionRecord>;
  deleteQuestion(token: string, questionId: string): Promise<void>;
  importQuestionsCsv(token: string, csvText: string): Promise<{ imported: number; errors: string[] }>;
  uploadQuestionImage(token: string, file: { name: string; mimeType: string; base64: string }): Promise<UploadImageResponse>;
  listStudents(token: string): Promise<StudentRecord[]>;
  saveStudent(token: string, input: AdminStudentInput): Promise<StudentRecord>;
  deleteStudent(token: string, userId: string): Promise<void>;
  importStudents(token: string, rows: ImportStudentRow[], defaultPassword?: string): Promise<ImportStudentsResult>;
  listUsers(token: string): Promise<User[]>;
  saveUser(token: string, input: AdminUserInput): Promise<User>;
  deleteUser(token: string, userId: string): Promise<void>;
  listTeachers(token: string): Promise<TeacherRecord[]>;
  saveTeacher(token: string, input: TeacherInput): Promise<TeacherRecord>;
  deleteTeacher(token: string, userId: string): Promise<void>;
  getMonitoring(token: string, examId?: string): Promise<MonitoringRow[]>;
  setAttemptPaused(token: string, attemptId: string, paused: boolean): Promise<AttemptControl>;
  warnAttempt(token: string, attemptId: string, message: string): Promise<{ attemptId: string; warningMessage: string; warningAt: string }>;
  resetAttempt(token: string, attemptId: string): Promise<{ attemptId: string; reset: boolean }>;
  getAttemptControl(token: string, attemptId: string): Promise<AttemptControl>;
  reportFocusViolation(token: string, attemptId: string, count?: number): Promise<{ attemptId: string; focusViolationCount: number }>; 
  getAdminResults(token: string, examId?: string): Promise<AdminResultRow[]>;
}
