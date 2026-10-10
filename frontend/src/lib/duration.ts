/**
 * Course duration rules, shared by every screen that shows or saves a duration.
 *
 * Durations build bottom-up: a lesson's own minutes plus its sub-lessons make the lesson,
 * lessons make the module, modules make the course. Assessment rows (module/lesson quizzes,
 * which the course studio keeps alongside lessons) carry no study time and are skipped.
 * The backend applies the same rules when a curriculum is saved (CurriculumService.replaceAll).
 */

export interface DurationItem {
  durationMin?: number;
  contentType?: string;
  subLessons?: DurationItem[];
}

export interface DurationModule {
  lessons?: DurationItem[];
  durationMinutes?: number;
}

const isAssessmentItem = (item: DurationItem) =>
  item.contentType === 'ASSESSMENT' || item.contentType === 'QUIZ';

/** Minutes for one lesson including its sub-lessons; assessments count as zero. */
export function calculateLessonDuration(lesson: DurationItem): number {
  if (isAssessmentItem(lesson)) return 0;
  const subLessons = (lesson.subLessons ?? []).reduce(
    (sum, sub) => (isAssessmentItem(sub) ? sum : sum + (sub.durationMin || 0)),
    0,
  );
  return (lesson.durationMin || 0) + subLessons;
}

/**
 * Minutes for a module: the sum of its lessons. Falls back to the stored module duration
 * when lesson times aren't available (e.g. a module loaded without its lessons).
 */
export function calculateModuleDuration(module: DurationModule): number {
  const fromLessons = (module.lessons ?? []).reduce((sum, lesson) => sum + calculateLessonDuration(lesson), 0);
  return fromLessons > 0 ? fromLessons : module.durationMinutes || 0;
}

/** Minutes for a whole course: the sum of its modules. */
export function calculateCourseDuration(modules: DurationModule[] | undefined | null): number {
  return (modules ?? []).reduce((sum, module) => sum + calculateModuleDuration(module), 0);
}

/**
 * Minutes to show for a course. Course lists come back without modules, so they fall back to
 * Course.estimatedHours, which the backend derives from the same lesson times on every save.
 */
export function getCourseDurationMinutes(course: {
  modules?: DurationModule[] | null;
  estimatedHours?: number | null;
}): number {
  const fromContent = calculateCourseDuration(course.modules);
  if (fromContent > 0) return fromContent;
  return course.estimatedHours && course.estimatedHours > 0 ? Math.round(course.estimatedHours * 60) : 0;
}

/** Minutes as hours rounded to one decimal, for places that state hours (e.g. certificates). */
export function calculateEstimatedHours(totalMinutes: number): number {
  if (!totalMinutes || totalMinutes <= 0) return 0;
  return Math.round((totalMinutes / 60) * 10) / 10;
}

/** "45 mins", "1 hr", "3 hrs", "2 hrs 25 mins" (or the Amharic equivalents); 0 reads as self-paced. */
export function formatDuration(minutes: number | null | undefined, isAmharic = false): string {
  const total = Math.round(minutes || 0);
  if (total <= 0) return isAmharic ? 'በግል ፍጥነት' : 'Self-paced';

  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours === 0) return isAmharic ? `${mins} ደቂቃ` : `${mins} min${mins === 1 ? '' : 's'}`;
  if (mins === 0) {
    if (isAmharic) return hours === 1 ? '1 ሰዓት' : `${hours} ሰዓታት`;
    return hours === 1 ? '1 hr' : `${hours} hrs`;
  }
  return isAmharic
    ? `${hours} ሰዓት ${mins} ደቂቃ`
    : `${hours} hr${hours === 1 ? '' : 's'} ${mins} min${mins === 1 ? '' : 's'}`;
}

/** formatDuration for a value stored in hours (Course.estimatedHours). */
export function formatHours(hours: number | null | undefined, isAmharic = false): string {
  return formatDuration(hours && hours > 0 ? hours * 60 : 0, isAmharic);
}
