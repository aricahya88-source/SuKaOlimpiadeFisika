import type { ExamStatus, ExamSummary } from './api/types';

type ExamSchedule = Pick<ExamSummary, 'status' | 'startTime' | 'endTime'>;

// Keep the student's visibility and availability rules in one place for
// the Neon backend, demo backend, and live student dashboard.
const visibleStatuses = new Set<ExamStatus>([
  'SCHEDULED', 'OPEN', 'PAUSED', 'ENDED', 'PUBLISHED', 'ACTIVE', 'CLOSED',
]);
const startableStatuses = new Set<ExamStatus>([
  'SCHEDULED', 'OPEN', 'PUBLISHED', 'ACTIVE',
]);

export function isExamVisibleToStudents(status: ExamStatus): boolean {
  return visibleStatuses.has(status);
}

export function isExamStartableNow(exam: ExamSchedule, nowMs = Date.now()): boolean {
  if (!startableStatuses.has(exam.status)) return false;
  const startMs = Date.parse(exam.startTime);
  const endMs = Date.parse(exam.endTime);
  return Number.isFinite(startMs) && Number.isFinite(endMs)
    && startMs <= nowMs && nowMs < endMs;
}

export function isExamUpcoming(exam: ExamSchedule, nowMs = Date.now()): boolean {
  return startableStatuses.has(exam.status) && Date.parse(exam.startTime) > nowMs;
}

export function isExamActiveForStudent(exam: ExamSummary, nowMs = Date.now()): boolean {
  if (!isExamVisibleToStudents(exam.status)) return false;
  if (exam.attemptStatus === 'IN_PROGRESS' || exam.attemptStatus === 'PAUSED') return true;
  if (exam.attemptStatus === 'SUBMITTED' || exam.attemptStatus === 'EXPIRED') return false;
  // Calculate from the time window as well: the backend's availableNow flag
  // reflects the last fetch and becomes stale at the scheduled start time.
  return isExamStartableNow(exam, nowMs);
}
