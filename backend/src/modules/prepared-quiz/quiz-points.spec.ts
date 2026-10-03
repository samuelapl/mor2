import { isEvenSplit, splitEvenly } from './quiz-points';

describe('splitEvenly', () => {
  it('gives the remainder to the first questions', () => {
    expect(splitEvenly(10, 3)).toEqual([4, 3, 3]);
  });

  it('splits exactly when the weight divides evenly', () => {
    expect(splitEvenly(10, 5)).toEqual([2, 2, 2, 2, 2]);
  });

  it('gives 0 to extra questions when there are more questions than points', () => {
    expect(splitEvenly(2, 3)).toEqual([1, 1, 0]);
  });

  it('returns nothing for an empty quiz', () => {
    expect(splitEvenly(10, 0)).toEqual([]);
  });
});

describe('isEvenSplit', () => {
  it('accepts the even split in any order', () => {
    expect(isEvenSplit([3, 4, 3], 10)).toBe(true);
  });

  it('rejects customised points', () => {
    expect(isEvenSplit([5, 3, 2], 10)).toBe(false);
  });

  it('treats an empty quiz as even', () => {
    expect(isEvenSplit([], 10)).toBe(true);
  });
});
