import { BadRequestException } from '@nestjs/common';
import { assertAssessmentPointsMatchWeights, assertCourseWeightsTotal } from './weights.util';

const db = (rows: Array<{ weight: number; questions: unknown }>) =>
  ({ assessment: { findMany: jest.fn().mockResolvedValue(rows) } }) as any;
const q = [{ id: 'q1' }];

describe('assertCourseWeightsTotal', () => {
  it('accepts exactly 100% on submit', async () => {
    await expect(
      assertCourseWeightsTotal(
        db([
          { weight: 40, questions: q },
          { weight: 60, questions: q },
        ]),
        'c',
        'exact',
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects a submit below 100%', async () => {
    await expect(
      assertCourseWeightsTotal(
        db([
          { weight: 20, questions: q },
          { weight: 40, questions: q },
        ]),
        'c',
        'exact',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('ignores assessments without questions, matching the studio', async () => {
    await expect(
      assertCourseWeightsTotal(
        db([
          { weight: 100, questions: q },
          { weight: 30, questions: [] },
        ]),
        'c',
        'exact',
      ),
    ).resolves.toBeUndefined();
  });

  it('allows a course with no graded assessments', async () => {
    await expect(assertCourseWeightsTotal(db([]), 'c', 'exact')).resolves.toBeUndefined();
  });

  it('while editing, allows under 100% but not over', async () => {
    await expect(
      assertCourseWeightsTotal(db([{ weight: 40, questions: q }]), 'c', 'atMost'),
    ).resolves.toBeUndefined();
    await expect(
      assertCourseWeightsTotal(
        db([
          { weight: 70, questions: q },
          { weight: 40, questions: q },
        ]),
        'c',
        'atMost',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('assertCourseWeightsTotal with session quizzes', () => {
  it('counts a session quiz before its questions are prepared', async () => {
    const rows = [
      { weight: 80, questions: q, type: 'FINAL_ASSESSMENT' },
      { weight: 20, questions: [], type: 'SESSION_ASSESSMENT' },
    ];
    await expect(assertCourseWeightsTotal(db(rows as any), 'c', 'exact')).resolves.toBeUndefined();
  });
});

describe('assertAssessmentPointsMatchWeights', () => {
  const rows = (...r: Array<{ weight: number; questions: unknown }>) =>
    db(r.map((x, i) => ({ titleEn: `A${i}`, ...x })) as any);

  it('accepts points that total the weight', async () => {
    await expect(
      assertAssessmentPointsMatchWeights(rows({ weight: 20, questions: [{ points: 15 }, { points: 5 }] }), 'c'),
    ).resolves.toBeUndefined();
  });

  it('rejects points that do not total the weight', async () => {
    await expect(
      assertAssessmentPointsMatchWeights(rows({ weight: 20, questions: [{ points: 10 }, { points: 20 }] }), 'c'),
    ).rejects.toThrow('"A0" has 30 points but weighs 20%');
  });

  it('skips 0% assessments and assessments without questions', async () => {
    await expect(
      assertAssessmentPointsMatchWeights(
        rows({ weight: 0, questions: [{ points: 10 }] }, { weight: 30, questions: [] }),
        'c',
      ),
    ).resolves.toBeUndefined();
  });
});
