/**
 * Sequential-unlock computation.
 *
 * Modules unlock in order: module N is unlocked when every module with a
 * smaller `order` is completed by the user (the first module is always
 * unlocked). Lessons unlock within their module: a lesson is unlocked when
 * every lesson with a smaller `order` in the same module is completed
 * (the first lesson is always unlocked).
 *
 * `moduleCompletions` maps moduleId → whether the user completed that module.
 * `lessonCompletions` is the set of lessonIds the user has completed.
 */

export interface ModuleUnlockRow {
  id: string;
  order: number | null;
  lessons: { id: string; order: number }[];
}

export function computeSequentialUnlocks(
  modules: ModuleUnlockRow[],
  moduleCompletions: Map<string, boolean>,
  lessonCompletions: Set<string>,
): {
  moduleUnlocked: Map<string, boolean>;
  lessonUnlocked: Map<string, boolean>;
} {
  const moduleUnlocked = new Map<string, boolean>();
  const lessonUnlocked = new Map<string, boolean>();

  const sortedModules = [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const mod of sortedModules) {
    const modOrder = mod.order ?? 0;
    const previousModulesDone = sortedModules
      .filter((m) => (m.order ?? 0) < modOrder)
      .every((m) => moduleCompletions.get(m.id) === true);

    const unlocked = modOrder === 0 ? true : previousModulesDone;
    moduleUnlocked.set(mod.id, unlocked);

    const sortedLessons = [...mod.lessons].sort((a, b) => a.order - b.order);
    for (const lesson of sortedLessons) {
      const previousLessonsDone = sortedLessons
        .filter((l) => l.order < lesson.order)
        .every((l) => lessonCompletions.has(l.id));
      lessonUnlocked.set(lesson.id, unlocked && (lesson.order === 0 ? true : previousLessonsDone));
    }
  }

  return { moduleUnlocked, lessonUnlocked };
}

export async function loadUserCompletionState(
  prisma: {
    moduleCompletion: {
      findMany: (args: {
        where: Record<string, unknown>;
        select: { userId: true; moduleId: true; completed: true };
      }) => Promise<Array<{ userId: string; moduleId: string; completed: boolean }>>;
    };
    lessonCompletion: {
      findMany: (args: {
        where: Record<string, unknown>;
        select: { userId: true; lessonId: true; completed: true };
      }) => Promise<Array<{ userId: string; lessonId: string; completed: boolean }>>;
    };
  },
  userId: string,
  moduleIds: string[],
  lessonIds: string[],
): Promise<{
  moduleCompletions: Map<string, boolean>;
  lessonCompletions: Set<string>;
}> {
  const [moduleRows, lessonRows] = await Promise.all([
    prisma.moduleCompletion.findMany({
      where: { userId, moduleId: { in: moduleIds } },
      select: { userId: true, moduleId: true, completed: true },
    }),
    prisma.lessonCompletion.findMany({
      where: { userId, lessonId: { in: lessonIds } },
      select: { userId: true, lessonId: true, completed: true },
    }),
  ]);

  const moduleCompletions = new Map<string, boolean>();
  for (const row of moduleRows) {
    moduleCompletions.set(row.moduleId, row.completed);
  }

  const lessonCompletions = new Set<string>();
  for (const row of lessonRows) {
    if (row.completed) lessonCompletions.add(row.lessonId);
  }

  return { moduleCompletions, lessonCompletions };
}
