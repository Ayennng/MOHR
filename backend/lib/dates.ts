import prisma from '@/lib/prisma';

const SERVER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function isValidTimezone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || !timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The company timezone from Settings, falling back to the server's timezone. */
export async function getCompanyTimezone() {
  const settings = await prisma.settings.findFirst({ select: { timezone: true } });
  return isValidTimezone(settings?.timezone) ? settings.timezone : SERVER_TIMEZONE;
}

export function defaultTimezone() {
  return SERVER_TIMEZONE;
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

/** Calendar date (YYYY-MM-DD) that `date` falls on in `timeZone`. */
export function zonedDateString(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Minutes since local midnight in `timeZone`. */
export function zonedMinutesOfDay(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return Number(p.hour) * 60 + Number(p.minute);
}

/** How far `timeZone` is ahead of UTC at `date`, in milliseconds. */
function zoneOffsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const wallClockAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return wallClockAsUtc - Math.floor(date.getTime() / 60000) * 60000;
}

/** The instant at which the wall clock in `timeZone` shows `dateString` (YYYY-MM-DD) and `time` (HH:MM). */
export function zonedTimeToUtc(dateString: string, time: string, timeZone: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Second pass corrects the offset when the first guess lands across a DST change
  const firstGuess = wallClockAsUtc - zoneOffsetMs(new Date(wallClockAsUtc), timeZone);
  return new Date(wallClockAsUtc - zoneOffsetMs(new Date(firstGuess), timeZone));
}

/** Value to store in, or compare against, a `@db.Date` column for a YYYY-MM-DD string. */
export function toDbDate(dateString: string) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

/**
 * Monday–Friday days between two dates, inclusive. Both are calendar dates at
 * UTC midnight (as produced by `toDbDate`). Public holidays are not excluded.
 */
export function countWorkingDays(start: Date, end: Date) {
  let days = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const weekday = d.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days++;
  }
  return days;
}

/** YYYY-MM-DD for a `@db.Date` value read from the database. */
export function fromDbDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
