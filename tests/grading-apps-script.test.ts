import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

test('Google Apps Script fallback also uses corrected partial, never pick-all scoring', async () => {
  const source = await readFile('apps-script/Exam.gs', 'utf8');
  const start = source.indexOf('function scoreQuestion_(');
  const finish = source.indexOf('function submitExam_(', start);
  assert.ok(start >= 0 && finish > start);
  const scoringFunction = source.slice(start, finish);
  const scope = {
    answerTokens_: (value: unknown) =>
      String(value || '').split(',').map((item) => item.trim().toUpperCase()).filter(Boolean),
  };
  const evaluate = runInNewContext(`${scoringFunction}\nscoreQuestion_`, scope) as (
    question: Record<string, unknown>, key: Record<string, unknown>, answer: string,
  ) => { correct: boolean; points: number };
  const question = {
    questionType: 'MULTIPLE_CHOICE', scoringMode: 'PARTIAL_CORRECTED',
    optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', optionE: 'E', maxScore: 1,
  };
  const key = { correctAnswers: 'A,C', maxScore: 1 };
  assert.equal(evaluate(question, key, 'A,B,C,D,E').points, 0);
  assert.equal(evaluate({ ...question, scoringMode: 'PARTIAL_NO_PENALTY' }, key, 'A,B,C,D,E').points, 0);
  assert.equal(evaluate(question, key, 'A').points, .5);
  assert.equal(evaluate({ ...question, scoringMode: 'EXACT_MATCH' }, key, 'A,B,C').points, 0);
  assert.equal(evaluate(question, key, 'A,C').points, 1);
});
