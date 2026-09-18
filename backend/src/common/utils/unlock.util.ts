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

export interface SubLessonUnlockRow {
  id: string;
  order: number;
}

export interface LessonUnlockRow {
  id: string;
  order: number;
  subLessons?: SubLessonUnlockRow[];
}

export interface ModuleUnlockRow {
  id: string;
  order: number | null;
  lessons: LessonUnlockRow[];
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

  const isLessonComplete = (l: LessonUnlockRow): boolean => {
    if (lessonCompletions.has(l.id)) return true;
    if (l.subLessons && l.subLessons.length > 0) {
      return l.subLessons.every((s) => lessonCompletions.has(s.id));
    }
    return false;
  };

  // `ModuleCompletion` is authoritative (it also captures the module's time
  // and assessment policy, which lesson completion alone cannot express).
  // Callers must reconcile `ModuleCompletion` rows (see
  // `ProgressService.reconcileModuleCompletions`) before computing unlocks.
  const isModuleDone = (m: ModuleUnlockRow): boolean => {
    if (moduleCompletions.get(m.id) === true) return true;
    return (!m.lessons || m.lessons.length === 0) && moduleCompletions.get(m.id) !== false;
  };

  const sortedModules = [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (let mIdx = 0; mIdx < sortedModules.length; mIdx++) {
    const mod = sortedModules[mIdx]!;
    const previousModulesDone = sortedModules.slice(0, mIdx).every((m) => isModuleDone(m));

    const unlocked = mIdx === 0 ? true : previousModulesDone;
    moduleUnlocked.set(mod.id, unlocked);

    const sortedLessons = [...mod.lessons].sort((a, b) => a.order - b.order);
    for (let lIdx = 0; lIdx < sortedLessons.length; lIdx++) {
      const lesson = sortedLessons[lIdx]!;
      const previousLessonsDone = sortedLessons.slice(0, lIdx).every((l) => isLessonComplete(l));

      const isLessonUnlocked = unlocked && (lIdx === 0 ? true : previousLessonsDone);
      lessonUnlocked.set(lesson.id, isLessonUnlocked);

      if (lesson.subLessons && lesson.subLessons.length > 0) {
        const sortedSubs = [...lesson.subLessons].sort((a, b) => a.order - b.order);
        for (let sIdx = 0; sIdx < sortedSubs.length; sIdx++) {
          const sub = sortedSubs[sIdx]!;
          const previousSubsDone = sortedSubs
            .slice(0, sIdx)
            .every((s) => lessonCompletions.has(s.id));
          const isSubUnlocked =
            isLessonUnlocked &&
            (sIdx === 0 || previousSubsDone || lessonCompletions.has(lesson.id));
          lessonUnlocked.set(sub.id, isSubUnlocked);
        }
      }
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
