const DEFAULT_DATE: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

/** A YYYY-MM-DD calendar date for display. Read and shown in UTC, so it never shifts by a day. */
export function formatDate(day: string, options: Intl.DateTimeFormatOptions = DEFAULT_DATE) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
}

/** "2026-10" as "October 2026". */
export const formatMonth = (month: string) => formatDate(`${month}-01`, { month: 'long', year: 'numeric' });

/** Time of day of an ISO instant, in the browser's timezone. */
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

/** Minutes as "7h 45m". */
export const formatMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

/** Whole-number percentage of `part` in `whole` (0 when `whole` is 0). */
export const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** "ON_LEAVE" as "On Leave". */
export const humanize = (value: string) =>
  value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
