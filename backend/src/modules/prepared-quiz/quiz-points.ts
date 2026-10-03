/**
 * Points of a weighted session quiz must total its course weight (a 10% quiz has 10 points),
 * so one point is one percent of the course grade. Ungraded quizzes have no total.
 */

/** `total` split over `count` questions; earlier questions take the remainder (10 / 3 → 4, 3, 3). */
export function splitEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * True when `points` is an even split of `total` in any order (the trainer has not customised
 * it; reordering questions keeps it even). An empty quiz counts as even.
 */
export function isEvenSplit(points: number[], total: number): boolean {
  const even = splitEvenly(total, points.length);
  const sorted = [...points].sort((a, b) => b - a);
  return sorted.every((p, i) => p === even[i]);
}
