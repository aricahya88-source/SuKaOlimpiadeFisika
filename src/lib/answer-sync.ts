/** Compare the answers actually persisted by the server, not merely an HTTP 200.
 * A missing entry and an explicit empty answer both mean unanswered.
 * All other strings are compared exactly because they are graded as stored.
 */
export function differingAnswerIds(expected: Record<string, string>, confirmed?: Record<string, string> | null): string[] {
  if (!confirmed || typeof confirmed !== 'object' || Array.isArray(confirmed)) return Object.keys(expected);
  const ids = new Set([...Object.keys(expected), ...Object.keys(confirmed)]);
  return [...ids].filter((id) => (expected[id] ?? '') !== (confirmed[id] ?? ''));
}

export function confirmedAnswerCount(answers: Record<string, string>): number {
  return Object.values(answers).filter((answer) => Boolean(answer && answer.trim())).length;
}
