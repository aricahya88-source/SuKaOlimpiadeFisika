import type { QuestionRecord, ScoringMode } from './api/types';

type GradeableQuestion = Pick<
  QuestionRecord,
  | 'questionType' | 'scoringMode' | 'correctAnswers' | 'correctAnswer'
  | 'maxScore' | 'score' | 'optionA' | 'optionB' | 'optionC' | 'optionD'
  | 'optionE' | 'interactionData'
>;

export interface QuestionGrade {
  blank: boolean;
  correct: boolean;
  points: number;
  max: number;
}

const tokens = (value: unknown) => String(value ?? '').split(',').map((part) => part.trim().toUpperCase());

/**
 * "Parsial tanpa penalti" was a legacy setting. For complex multiple-choice
 * questions it is deliberately upgraded at scoring time, so old questions
 * cannot award full points when every option is selected.
 */
export function isCorrectedPartialMode(mode: ScoringMode | string | undefined) {
  return mode === 'PARTIAL_CORRECTED' || mode === 'PARTIAL_NO_PENALTY';
}

/** Correct guesses earn credit; selected distractors cancel proportional credit. */
export function correctedMultipleChoiceRatio(
  selectedKeys: readonly string[],
  correctKeys: readonly string[],
  availableKeys: readonly string[],
): number {
  const correct = new Set(correctKeys.map((key) => key.toUpperCase()).filter(Boolean));
  const available = new Set(availableKeys.map((key) => key.toUpperCase()).filter(Boolean));
  if (!correct.size || !available.size) return 0;
  const selected = new Set(selectedKeys.map((key) => key.toUpperCase()).filter(Boolean));
  const correctHits = [...selected].filter((key) => correct.has(key)).length;
  const incorrectHits = [...selected].filter((key) => !correct.has(key)).length;
  const distractorCount = [...available].filter((key) => !correct.has(key)).length;
  const positive = correctHits / correct.size;
  const penalty = distractorCount ? incorrectHits / distractorCount : incorrectHits;
  return Math.max(0, Math.min(1, positive - penalty));
}

function matchingKey(value: string) {
  const result: Record<string, string> = {};
  value.split('|').forEach((pair) => {
    const [left, right] = pair.split(':').map(Number);
    if (left > 0 && right > 0) result[`L${left}`] = `R${right}`;
  });
  return result;
}

function matchingAnswer(value: unknown): Record<string, string> {
  try {
    const parsed = JSON.parse(String(value || '{}'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch { /* Invalid answers receive no points. */ }
  return {};
}

export function gradeQuestion(question: GradeableQuestion, answer: unknown): QuestionGrade {
  const max = Number(question.maxScore || question.score || 1);
  const empty = (blank: boolean): QuestionGrade => ({ blank, correct: false, points: 0, max });
  const keyText = String(question.correctAnswers || question.correctAnswer || '');

  if (question.questionType === 'MATCHING') {
    const expected = matchingKey(keyText);
    const actual = matchingAnswer(answer);
    if (!Object.values(actual).some(Boolean)) return empty(true);
    const pairs = Object.keys(expected);
    const hits = pairs.filter((left) => actual[left] === expected[left]).length;
    const exact = pairs.length > 0 && hits === pairs.length;
    if (exact) return { blank: false, correct: true, points: max, max };
    const leftCount = question.interactionData?.left?.length || 0;
    const points = question.scoringMode === 'PARTIAL_NO_PENALTY'
      ? max * hits / Math.max(pairs.length, leftCount, 1) : 0;
    return { blank: false, correct: false, points, max };
  }

  const raw = tokens(answer);
  const key = tokens(keyText).filter(Boolean);
  const answerKeys = question.questionType === 'TRUE_FALSE'
    ? raw : [...new Set(raw.filter(Boolean))];
  if (!answerKeys.some(Boolean)) return empty(true);
  const exact = answerKeys.length === key.length && (
    question.questionType === 'TRUE_FALSE'
      ? answerKeys.join('|') === key.join('|')
      : [...answerKeys].sort().join('|') === [...key].sort().join('|')
  );
  if (exact) return { blank: false, correct: true, points: max, max };

  let points = 0;
  if (question.questionType === 'MULTIPLE_CHOICE' && isCorrectedPartialMode(question.scoringMode)) {
    const options = (['A', 'B', 'C', 'D', 'E'] as const)
      .filter((letter) => Boolean(question[`option${letter}`]));
    points = max * correctedMultipleChoiceRatio(answerKeys, key, options);
  } else if (question.questionType === 'TRUE_FALSE' && question.scoringMode === 'PARTIAL_NO_PENALTY' && key.length) {
    points = max * key.filter((value, index) => answerKeys[index] === value).length / key.length;
  }
  return { blank: false, correct: false, points, max };
}
