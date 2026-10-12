/**
 * Whether a live-quiz answer is right. Apps send the chosen options by position ("0", "1", …),
 * or the typed text for short answers. The answer key is stored either as a position or as
 * the option text (question bank `correctAnswer`), so both are compared by option position
 * when possible and by text otherwise, ignoring case and surrounding spaces.
 */
export function isAnswerCorrect(
  key: { options: unknown[]; correctAnswer: string | number | null | undefined },
  selected: string[],
): boolean {
  if (key.correctAnswer === null || key.correctAnswer === undefined || key.correctAnswer === '') {
    return false;
  }
  const options = key.options.map((o) => normalize(String(o)));
  const toIndex = (value: string): number | null => {
    const v = value.trim();
    if (/^\d+$/.test(v) && Number(v) < options.length) return Number(v);
    const byText = options.indexOf(normalize(v));
    return byText >= 0 ? byText : null;
  };

  const correct = String(key.correctAnswer);
  const correctIndex = toIndex(correct);
  if (correctIndex === null) {
    // Free-text answer (short answer, or a key that matches no option).
    return selected.some((s) => normalize(s) === normalize(correct));
  }
  const picked = new Set(selected.map(toIndex).filter((i): i is number => i !== null));
  return picked.size === 1 && picked.has(correctIndex);
}

const normalize = (s: string) => s.replace(/<[^>]*>/g, '').trim().toLowerCase();
