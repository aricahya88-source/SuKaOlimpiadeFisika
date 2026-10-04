export type Role = 'super_admin' | 'teacher' | 'validator' | 'student';
export type ExamStatus = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'PAUSED' | 'ENDED' | 'ARCHIVED' | 'PUBLISHED' | 'ACTIVE' | 'CLOSED';
export type AttemptStatus = 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'EXPIRED';
export type MonitoringStatus = 'NOT_STARTED' | AttemptStatus;
export type ResultVisibility = 'immediate' | 'after_exam_closed' | 'manual_publish' | 'hidden';
export type SaveStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'local-only';
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MATCHING';
export type ScoringMode = 'EXACT_MATCH' | 'PARTIAL_NO_PENALTY';
export type QuestionStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface MatchingItem { id: string; text: string; }
export interface MatchingInteractionData { left: MatchingItem[]; right: MatchingItem[]; }
export interface QuestionPackageSummary { category: string; packageName: string; questionCount: number; publishedCount?: number; subject?: string; }

export interface User {
  userId: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  className?: string;
  subject?: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Session { token: string; user: User; expiresAt: string; }

export interface ExamSummary {
  examId: string;
  title: string;
  subject: string;
  className: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  questionCount: number;
  status: ExamStatus;
  resultVisibility: ResultVisibility;
  attemptStatus?: AttemptStatus;
  availableNow?: boolean;
  attemptId?: string;
  score?: number | null;
  tokenRequired?: boolean;
  descriptionHtml?: string;
  rulesHtml?: string;
  instructions?: string;
}

export interface ExamConfig extends ExamSummary {
  descriptionHtml?: string;
  instructions: string;
  rulesHtml?: string;
  randomizeQuestion: boolean;
  randomizeOption: boolean;
  attemptPolicy: 'single' | 'allow_reset_by_admin';
}

export interface QuestionOption { key: string; label: string; }
export interface Question {
  questionId: string;
  number: number;
  text: string;
  questionHtml?: string;
  questionType: QuestionType;
  scoringMode?: ScoringMode;
  options: QuestionOption[];
  interactionData?: MatchingInteractionData | null;
  imageUrl?: string | null;
  imageFileId?: string | null;
  difficulty?: string;
  tag?: string;
  maxScore?: number;
  simulationEnabled?: boolean;
  simulationUrl?: string;
  simulationTitle?: string;
  simulationDescription?: string;
  simulationAspectRatio?: string;
}

export interface Attempt {
  attemptId: string; examId: string; studentId: string; startedAt: string; expiresAt: string; serverTime: string;
  revision: number; status: AttemptStatus; questionCount: number; batchSize: number; exam: ExamConfig;
}
export interface StartExamResponse { attempt: Attempt; initialQuestions: Question[]; offset: number; hasMore: boolean; }
export interface ResumeAttemptResponse { attempt: Attempt; answers: Record<string, string>; questions: Question[]; offset: number; hasMore: boolean; }
export interface SaveAnswersResponse { attemptId: string; revision: number; lastSyncAt: string; }
export interface SubmitResponse { submissionId: string; attemptId: string; accepted: boolean; alreadySubmitted?: boolean; submittedAt: string; result?: ExamResult | null; }

export interface ExamResult {
  examId: string; attemptId: string; title: string; subject: string; score: number; correctCount: number; wrongCount: number;
  blankCount: number; questionCount: number; submittedAt: string; visible: boolean;
}

export interface PreflightResult { online: boolean; storageAvailable: boolean; indexedDbAvailable: boolean; quotaBytes?: number; usageBytes?: number; message?: string; }
export interface DashboardStats { activeExams: number; upcomingExams: number; students: number; inProgress: number; submitted: number; notSubmitted: number; }

export interface ExamRecord extends ExamConfig {
  token?: string;
  ownerId?: string;
  ownerName?: string;
}

export interface QuestionRecord {
  questionId: string;
  examId?: string; // legacy migration reference only; bank soal is reusable
  authorId?: string;
  authorName?: string;
  topicCode?: string;
  blueprintCode?: string;
  code?: string;
  stimulusOrder?: number;
  questionText: string;
  questionHtml?: string;
  explanation?: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  interactionData?: MatchingInteractionData | null;
  correctAnswer?: string;
  correctAnswers?: string;
  score?: number;
  maxScore?: number;
  simulationEnabled?: boolean;
  simulationUrl?: string;
  simulationTitle?: string;
  simulationDescription?: string;
  simulationAspectRatio?: string;
  imageFileId?: string;
  imageUrl?: string;
  questionType: QuestionType;
  scoringMode: ScoringMode;
  difficulty: string;
  tag: string;
  category?: string;
  packageName?: string;
  status: QuestionStatus;
}

export interface StudentRecord extends User { className: string; }
export interface TeacherRecord extends User { subject: string; }
export interface ValidatorRecord extends User { subject?: string; }
export interface ValidationAssignment { assignmentId: string; questionId: string; questionCode?: string; questionText?: string; validatorId: string; validatorName: string; status: 'PENDING' | 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED'; note?: string; updatedAt?: string; authorId?: string; authorName?: string; }
export interface TeacherInput { userId?: string; name: string; username: string; email?: string; phone?: string; subject: string; password?: string; status: 'ACTIVE' | 'INACTIVE'; }
export interface AdminUserInput { userId?: string; name: string; username: string; email?: string; phone?: string; role: Role; className?: string; subject?: string; password?: string; status: 'ACTIVE' | 'INACTIVE'; }

export interface MonitoringRow { attemptId?: string; studentId: string; studentName: string; className: string; examId: string; examTitle: string; status: MonitoringStatus; startedAt?: string; lastSyncAt?: string; revision: number; submittedAt?: string; focusViolationCount: number; warningMessage?: string; warningAt?: string; expiresAt?: string; }
export interface AttemptControl { attemptId: string; status: AttemptStatus; expiresAt: string; serverTime: string; focusViolationCount: number; warningMessage?: string; warningAt?: string; }
export interface AdminResultRow { submissionId: string; attemptId: string; studentId: string; studentName: string; className: string; examId: string; examTitle: string; score: number; correctCount: number; wrongCount: number; blankCount: number; submittedAt: string; }

export interface AdminExamInput {
  examId?: string;
  ownerId?: string;
  title: string;
  subject: string;
  className: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  questionCount: number;
  status: ExamStatus;
  randomizeQuestion: boolean;
  randomizeOption: boolean;
  resultVisibility: ResultVisibility;
  token?: string;
  attemptPolicy: 'single' | 'allow_reset_by_admin';
  descriptionHtml?: string;
  instructions: string;
  rulesHtml?: string;
}

export interface AdminQuestionInput {
  questionId?: string;
  examId?: string; // optional: map imported/new question directly to this exam
  authorId?: string;
  topicCode?: string;
  blueprintCode?: string;
  code?: string;
  stimulusOrder?: number;
  questionText?: string;
  questionHtml: string;
  explanation?: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  interactionData?: MatchingInteractionData | null;
  correctAnswers: string;
  score?: number;
  maxScore: number;
  simulationEnabled?: boolean;
  simulationUrl?: string;
  simulationTitle?: string;
  simulationDescription?: string;
  simulationAspectRatio?: string;
  imageFileId?: string;
  questionType: QuestionType;
  scoringMode: ScoringMode;
  difficulty: string;
  tag: string;
  category?: string;
  packageName?: string;
  status: QuestionStatus;
}

export interface ExamQuestionMapping { examId: string; questionId: string; orderNo: number; }

export interface AdminStudentInput { userId?: string; name: string; username: string; email?: string; phone?: string; className: string; password?: string; status: 'ACTIVE' | 'INACTIVE'; }
export interface ImportStudentRow { name: string; username: string; className: string; password?: string; email?: string; phone?: string; status: 'ACTIVE' | 'INACTIVE'; }
export interface ImportStudentsResult { created: number; updated: number; skipped: number; errors: string[]; }
export interface UploadImageResponse { fileId: string; imageUrl: string; name: string; }
