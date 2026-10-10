/**
 * Recomputes CurriculumModule.durationMinutes and Course.estimatedHours from lesson times for
 * every existing course, using the same rules CurriculumService.replaceAll applies on each save:
 * a module is the sum of its lessons and sub-lessons (or keeps its stored minutes when its
 * lessons have none), and a course is the sum of its modules, stored as unrounded hours.
 *
 * Needed once for courses saved before those rules existed (and for published courses, whose
 * curriculum can no longer be re-saved). Safe to run repeatedly.
 *
 * Run: npm run durations:recalculate
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      code: true,
      estimatedHours: true,
      modules: {
        where: { deletedAt: null },
        select: {
          id: true,
          durationMinutes: true,
          // Sub-lessons are lesson rows of the same module, so this covers both levels.
          lessons: { where: { deletedAt: null }, select: { durationMinutes: true } },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  for (const course of courses) {
    let courseMinutes = 0;
    for (const mod of course.modules) {
      const fromLessons = mod.lessons.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);
      const minutes = fromLessons > 0 ? fromLessons : (mod.durationMinutes ?? 0);
      courseMinutes += minutes;
      if (minutes !== mod.durationMinutes) {
        await prisma.curriculumModule.update({ where: { id: mod.id }, data: { durationMinutes: minutes } });
      }
    }

    const estimatedHours = courseMinutes > 0 ? courseMinutes / 60 : null;
    if (estimatedHours !== course.estimatedHours) {
      await prisma.course.update({ where: { id: course.id }, data: { estimatedHours } });
    }
    console.log(`${course.code}: ${course.estimatedHours ?? '—'} h → ${courseMinutes} min`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
