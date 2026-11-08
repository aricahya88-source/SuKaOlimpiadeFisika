import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isExamActiveForStudent,
  isExamStartableNow,
  isExamUpcoming,
  isExamVisibleToStudents,
} from '../src/lib/exam-availability';
import type { ExamSummary, ExamStatus } from '../src/lib/api/types';

const start = Date.parse('2026-11-08T02:00:00.000Z'); // 09.00 WIB
const end = Date.parse('2026-11-08T03:00:00.000Z');   // 10.00 WIB

function exam(status: ExamStatus = 'SCHEDULED', attemptStatus?: ExamSummary['attemptStatus']): ExamSummary {
  return {
    examId: 'EX-test', title: 'Simulasi jadwal', subject: 'Fisika', className: 'XI',
    startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(),
    durationMinutes: 60, questionCount: 5, status, resultVisibility: 'immediate',
    attemptStatus,
  };
}

test('ujian terjadwal berpindah dari upcoming menjadi active tepat pada waktu mulai WIB', () => {
  const scheduled = exam();
  assert.equal(isExamUpcoming(scheduled, start - 1), true);
  assert.equal(isExamActiveForStudent(scheduled, start - 1), false);
  assert.equal(isExamUpcoming(scheduled, start), false);
  assert.equal(isExamStartableNow(scheduled, start), true);
  assert.equal(isExamActiveForStudent(scheduled, start), true);
  assert.equal(isExamActiveForStudent(scheduled, end - 1), true);
  assert.equal(isExamStartableNow(scheduled, end), false);
  assert.equal(isExamActiveForStudent(scheduled, end), false);
});

test('status administrasi menentukan visibilitas dan izin mulai ujian', () => {
  assert.equal(isExamVisibleToStudents('DRAFT'), false);
  assert.equal(isExamVisibleToStudents('ARCHIVED'), false);
  assert.equal(isExamVisibleToStudents('SCHEDULED'), true);
  for (const status of ['DRAFT', 'PAUSED', 'ENDED', 'CLOSED', 'ARCHIVED'] as ExamStatus[]) {
    assert.equal(isExamStartableNow(exam(status), start + 1), false, status);
    assert.equal(isExamUpcoming(exam(status), start - 1), false, status);
  }
  assert.equal(isExamActiveForStudent(exam('DRAFT'), start + 1), false);
});

test('pengerjaan dapat dilanjutkan, tetapi yang sudah submit/expired tidak dapat dimulai lagi', () => {
  assert.equal(isExamActiveForStudent(exam('SCHEDULED', 'IN_PROGRESS'), end + 1), true);
  assert.equal(isExamActiveForStudent(exam('SCHEDULED', 'PAUSED'), end + 1), true);
  assert.equal(isExamActiveForStudent(exam('SCHEDULED', 'SUBMITTED'), start + 1), false);
  assert.equal(isExamActiveForStudent(exam('SCHEDULED', 'EXPIRED'), start + 1), false);
});

test('jadwal waktu yang tidak valid tidak pernah dianggap aktif', () => {
  const invalid = { ...exam(), startTime: 'not-a-date' };
  assert.equal(isExamStartableNow(invalid, start + 1), false);
  assert.equal(isExamUpcoming(invalid, start - 1), false);
});
