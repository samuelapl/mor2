/** Characters of the post id used for its public slug (e.g. /news/3f9a2). */
export const SLUG_LENGTH = 5;

/**
 * Slugs to try for a post, shortest first: the first 5 hex characters of its id, then 6,
 * 7, … up to the whole id. A longer one is only needed when a shorter one is taken.
 */
export function slugCandidates(id: string): string[] {
  const hex = id.replace(/-/g, '').toLowerCase();
  const candidates: string[] = [];
  for (let length = SLUG_LENGTH; length <= hex.length; length++) {
    candidates.push(hex.slice(0, length));
  }
  return candidates;
}

/** Shortest candidate slug for `id` that is not already taken. */
export function slugForId(id: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const candidates = slugCandidates(id);
  return candidates.find((slug) => !used.has(slug)) ?? candidates[candidates.length - 1];
}
