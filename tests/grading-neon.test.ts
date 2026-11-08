import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { execute } from '../src/lib/server/service';
import { hashPassword } from '../src/lib/server/password';

test('Neon service scores an actual five-question submission with strict and corrected grading', async () => {
  const postgres = new PGlite();
  try {
    await postgres.exec(await readFile('database/001-schema.sql', 'utf8'));
    const client = {
      query: async (sql: string, params?: unknown[]) =>
        sql.includes('pg_advisory_xact_lock') || sql.startsWith('SET LOCAL')
          ? { rows: [] } : postgres.query(sql, params),
      release() {},
    };
    const database = { connect: async () => client } as any;
    const call = (action: string, params: unknown[]) => execute(action, params, 'grading-test', database);
    const admin = { userId: 'A', username: 'admin', name: 'Panitia', role: 'super_admin', status: 'ACTIVE' };
    const student = { userId: 'S', username: 'siswa', name: 'Peserta', role: 'student', className: 'XI', status: 'ACTIVE' };
    await postgres.query('INSERT INTO suka_users(id,username,password_hash,data) VALUES($1,$2,$3,$4)',
      [admin.userId, admin.username, hashPassword('Admin-Test-123'), JSON.stringify(admin)]);
    await postgres.query('INSERT INTO suka_users(id,username,password_hash,data) VALUES($1,$2,$3,$4)',
      [student.userId, student.username, hashPassword('Siswa-Test-123'), JSON.stringify(student)]);
    const manager = await call('login', ['admin', 'Admin-Test-123']);
    const participant = await call('login', ['siswa', 'Siswa-Test-123']);
    const exam = await call('saveExam', [manager.token, {
      title: 'Validasi penilaian', subject: 'Fisika', className: 'XI',
      startTime: new Date(Date.now() - 60_000).toISOString(),
      endTime: new Date(Date.now() + 3_600_000).toISOString(),
      durationMinutes: 30, questionCount: 5, status: 'OPEN',
      resultVisibility: 'immediate', randomizeQuestion: false, randomizeOption: false,
      attemptPolicy: 'single', instructions: '',
    }]);
    const original = {
      questionHtml: '<p>Pilih jawaban benar.</p>',
      optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', optionE: 'E',
      correctAnswers: 'A,C', maxScore: 1,
      questionType: 'MULTIPLE_CHOICE', difficulty: 'Sedang', tag: 'Fisika', status: 'PUBLISHED',
    };
    const modes = ['EXACT_MATCH', 'PARTIAL_CORRECTED', 'PARTIAL_NO_PENALTY', 'PARTIAL_CORRECTED', 'EXACT_MATCH'];
    const questions = [];
    for (let index = 0; index < modes.length; index++) {
      questions.push(await call('saveQuestion', [manager.token, { ...original, code: `SCORE-${index}`, scoringMode: modes[index] }]));
    }
    await call('saveExamQuestions', [manager.token, exam.examId, questions.map((q) => q.questionId)]);
    const started = await call('startExam', [participant.token, exam.examId]);
    const answers = Object.fromEntries(questions.map((q, index) =>
      [q.questionId, ['A,B,C', 'A,B,C', 'A,B,C,D,E', 'A', 'A,C'][index]]));
    const submitted = await call('submitExam', [participant.token, {
      attemptId: started.attempt.attemptId,
      submissionId: 'GRADE-SUB',
      revision: 1,
      answers,
    }]);
    // 0 + 2/3 + 0 (old unsafe mode) + 1/2 + 1 = 2.1667 / 5 = 43.33%.
    assert.equal(submitted.result.score, 43.33);
    assert.equal(submitted.result.correctCount, 1);
    assert.equal(submitted.result.wrongCount, 4);
    assert.equal(submitted.result.blankCount, 0);
  } finally {
    await postgres.close();
  }
});
