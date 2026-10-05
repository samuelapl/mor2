import { ConflictException } from '@nestjs/common';
import { NewsStatus } from '@prisma/client';
import { assertTransition, canTransition } from './news-status.util';
import { slugCandidates, slugForId } from './news-slug.util';
import { buildSummary, htmlToPlainText, sanitizeNewsHtml } from './news-content.util';

describe('news status transitions', () => {
  const allowed: [NewsStatus, NewsStatus][] = [
    [NewsStatus.DRAFT, NewsStatus.PENDING_REVIEW],
    [NewsStatus.PENDING_REVIEW, NewsStatus.PUBLISHED],
    [NewsStatus.PENDING_REVIEW, NewsStatus.REJECTED],
    [NewsStatus.REJECTED, NewsStatus.PENDING_REVIEW],
    [NewsStatus.PUBLISHED, NewsStatus.ARCHIVED],
    [NewsStatus.ARCHIVED, NewsStatus.PUBLISHED],
  ];

  it.each(allowed)('allows %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it('rejects every other transition', () => {
    const statuses = Object.values(NewsStatus);
    for (const from of statuses) {
      for (const to of statuses) {
        if (allowed.some(([f, t]) => f === from && t === to)) continue;
        expect(() => assertTransition(from, to)).toThrow(ConflictException);
      }
    }
  });
});

describe('short slug from id', () => {
  const id = '3f9a2c71-0b4e-4d2a-9c1e-5a7b8c9d0e1f';

  it('uses the first 5 characters of the id', () => {
    expect(slugForId(id, [])).toBe('3f9a2');
  });

  it('takes one more character for each prefix already in use', () => {
    expect(slugForId(id, ['3f9a2'])).toBe('3f9a2c');
    expect(slugForId(id, ['3f9a2', '3f9a2c'])).toBe('3f9a2c7');
  });

  it('never includes hyphens and ends at the full id', () => {
    const candidates = slugCandidates(id);
    expect(candidates.every((c) => !c.includes('-'))).toBe(true);
    expect(candidates[candidates.length - 1]).toBe(id.replace(/-/g, ''));
  });
});

describe('news content', () => {
  it('keeps allow-listed tags, drops attributes and dangerous tags', () => {
    const html =
      '<p onclick="x()">Hi <strong class="a">there</strong></p><script>alert(1)</script><img src=x onerror=y>';
    expect(sanitizeNewsHtml(html)).toBe('<p>Hi <strong>there</strong></p>');
  });

  it('extracts plain text with spaces between blocks and decoded entities', () => {
    expect(htmlToPlainText('<p>One &amp; two.</p><p>Three</p>')).toBe('One & two. Three');
  });

  it('prefers an explicit summary over the content', () => {
    expect(buildSummary('  Given  ', '<p>Body</p>')).toBe('Given');
  });

  it('cuts a long content summary at a word boundary', () => {
    const summary = buildSummary(null, `<p>${'alpha '.repeat(60)}</p>`, 50)!;
    expect(summary.endsWith('…')).toBe(true);
    expect(summary).not.toMatch(/alph…$/);
    expect(summary.length).toBeLessThanOrEqual(51);
  });

  it('returns null when there is no content', () => {
    expect(buildSummary(null, null)).toBeNull();
    expect(buildSummary('', '<p></p>')).toBeNull();
  });
});
