/**
 * The platform runs on one time zone (EAT by default): session times are entered, shown,
 * announced and rescheduled in it, whatever time zone the server or a browser is in.
 * Times are still stored as UTC instants.
 */
export const APP_TIME_ZONE = process.env.APP_TIMEZONE || 'Africa/Addis_Ababa';

/** Short label shown next to times, e.g. "EAT". */
export const APP_TIME_ZONE_LABEL = process.env.APP_TIMEZONE_LABEL || 'EAT';

/** Wall-clock parts of an instant in the app time zone. */
function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: get('weekday'),
  };
}

/** Offset of the app time zone from UTC at that instant, in ms (EAT: +3h). */
function zoneOffsetMs(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Day of the week in the app time zone (0 = Sunday). */
export function appDayOfWeek(date: Date): number {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(zonedParts(date).weekday);
}

/** Calendar date in the app time zone, as YYYY-MM-DD. */
export function appDateKey(date: Date): string {
  const p = zonedParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/**
 * The instant `days` calendar days after `base`, at the wall-clock time of `timeOf`, both read
 * in the app time zone. Used to keep a rescheduled session at the same local start time.
 */
export function addAppDaysAtTimeOf(base: Date, days: number, timeOf: Date): Date {
  const b = zonedParts(base);
  const t = zonedParts(timeOf);
  const wallClock = Date.UTC(b.year, b.month - 1, b.day + days, t.hour, t.minute, t.second);
  // Convert the wall-clock time back to an instant (one correction covers a DST change).
  let instant = wallClock - zoneOffsetMs(new Date(wallClock));
  instant = wallClock - zoneOffsetMs(new Date(instant));
  return new Date(instant);
}

/** Next calendar day in the app time zone, same wall-clock time. */
export function nextAppDay(date: Date): Date {
  return addAppDaysAtTimeOf(date, 1, date);
}

/** e.g. "Fri, Oct 23, 2026, 11:00 AM EAT". */
export function formatAppDateTime(date: Date | string): string {
  const formatted = new Date(date).toLocaleString('en-US', {
    timeZone: APP_TIME_ZONE,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${formatted} ${APP_TIME_ZONE_LABEL}`;
}

/**
 * Whole seconds until an upcoming (SCHEDULED, future) session starts, measured on the server
 * clock at request time; null otherwise. Clients show it as "starts in …" without counting.
 */
export function startsInSeconds(
  session: { status: string; scheduledAt: Date | string | null },
  now: Date = new Date(),
): number | null {
  if (session.status !== 'SCHEDULED' || !session.scheduledAt) return null;
  const diff = new Date(session.scheduledAt).getTime() - now.getTime();
  return diff > 0 ? Math.floor(diff / 1000) : null;
}
