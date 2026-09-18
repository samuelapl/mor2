import { computeSequentialUnlocks, ModuleUnlockRow } from './unlock.util';

const modules: ModuleUnlockRow[] = [
  {
    id: 'm1',
    order: 1,
    lessons: [
      { id: 'l1', order: 1 },
      { id: 'l2', order: 2 },
    ],
  },
  {
    id: 'm2',
    order: 2,
    lessons: [{ id: 'l3', order: 1 }],
  },
];

describe('computeSequentialUnlocks — module assessment gating', () => {
  it('does not unlock the next module when all lessons are done but the module assessment was not passed', () => {
    const moduleCompletions = new Map([['m1', false]]);
    const lessonCompletions = new Set(['l1', 'l2']);

    const { moduleUnlocked } = computeSequentialUnlocks(modules, moduleCompletions, lessonCompletions);

    expect(moduleUnlocked.get('m1')).toBe(true); // first module is always unlocked
    expect(moduleUnlocked.get('m2')).toBe(false);
  });

  it('unlocks the next module once the module assessment is passed (ModuleCompletion.completed = true)', () => {
    const moduleCompletions = new Map([['m1', true]]);
    const lessonCompletions = new Set(['l1', 'l2']);

    const { moduleUnlocked } = computeSequentialUnlocks(modules, moduleCompletions, lessonCompletions);

    expect(moduleUnlocked.get('m2')).toBe(true);
  });

  it('treats a missing ModuleCompletion row as not-done when the module has lessons (must be reconciled first)', () => {
    const moduleCompletions = new Map<string, boolean>(); // no row at all for m1
    const lessonCompletions = new Set(['l1', 'l2']);

    const { moduleUnlocked } = computeSequentialUnlocks(modules, moduleCompletions, lessonCompletions);

    expect(moduleUnlocked.get('m2')).toBe(false);
  });

  it('treats a module with no lessons as done even without a ModuleCompletion row', () => {
    const emptyModules: ModuleUnlockRow[] = [
      { id: 'm1', order: 1, lessons: [] },
      { id: 'm2', order: 2, lessons: [{ id: 'l1', order: 1 }] },
    ];
    const { moduleUnlocked } = computeSequentialUnlocks(emptyModules, new Map(), new Set());

    expect(moduleUnlocked.get('m2')).toBe(true);
  });
});
