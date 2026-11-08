import test from 'node:test';
import assert from 'node:assert/strict';
import { correctedMultipleChoiceRatio, gradeQuestion } from '../src/lib/grading';

const question = {
  questionType: 'MULTIPLE_CHOICE' as const,
  scoringMode: 'EXACT_MATCH' as const,
  correctAnswers: 'A,C',
  maxScore: 1,
  optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', optionE: 'E',
};

test('Olimpiade: exact match is the default, no partial credit', () => {
  assert.deepEqual(gradeQuestion(question, 'A,C'), { blank: false, correct: true, points: 1, max: 1 });
  for (const selected of ['A', 'A,B,C', 'A,B,C,D,E', 'B,D', 'C', '']) {
    assert.equal(gradeQuestion(question, selected).points, 0, selected);
  }
});

test('Latihan: corrected partial penalizes every selected distractor', () => {
  const partial = { ...question, scoringMode: 'PARTIAL_CORRECTED' as const };
  assert.equal(gradeQuestion(partial, 'A,C').points, 1);
  assert.equal(gradeQuestion(partial, 'A').points, .5);
  assert.ok(Math.abs(gradeQuestion(partial, 'A,B,C').points - 2 / 3) < 0.00001);
  assert.equal(gradeQuestion(partial, 'A,B,C,D,E').points, 0);
  assert.equal(gradeQuestion(partial, 'B,C,D,E').points, 0);
  assert.equal(gradeQuestion(partial, 'B').points, 0);
  assert.ok(Math.abs(correctedMultipleChoiceRatio(['A', 'A', 'B'], ['A', 'C'], ['A', 'B', 'C', 'D', 'E']) - 1 / 6) < 0.00001);
});

test('Legacy partial complex MC no longer rewards choosing all options', () => {
  assert.equal(gradeQuestion({ ...question, scoringMode: 'PARTIAL_NO_PENALTY' }, 'A,B,C,D,E').points, 0);
  assert.equal(gradeQuestion({ ...question, scoringMode: 'PARTIAL_NO_PENALTY' }, 'A').points, .5);
});

test('Existing matching and true/false partial assessment keeps its semantics', () => {
  const truth = { ...question, questionType: 'TRUE_FALSE' as const, correctAnswers: 'B,S,B', scoringMode: 'PARTIAL_NO_PENALTY' as const };
  assert.equal(gradeQuestion(truth, 'B,S,S').points, 2 / 3);
  const matching = { ...question, questionType: 'MATCHING' as const, correctAnswers: '1:2|2:1',
    scoringMode: 'PARTIAL_NO_PENALTY' as const, interactionData: { left: [{ id: 'L1', text: '' }, { id: 'L2', text: '' }], right: [] } };
  assert.equal(gradeQuestion(matching, JSON.stringify({ L1: 'R2', L2: 'R2' })).points, .5);
});

test('Five equally weighted strict questions: two correct equals 40, not 75', () => {
  const responses = ['A,C', 'A,C', 'A', 'A,B,C', 'B,D'];
  const points = responses.reduce((sum, response) => sum + gradeQuestion(question, response).points, 0);
  assert.equal(points / responses.length * 100, 40);
});
