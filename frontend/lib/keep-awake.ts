// Free Render services sleep after 15 minutes without inbound traffic. In working hours the
// frontend requests its own public /api/health every 10 minutes; the request goes out
// through Render's proxy, so it counts as traffic, and that route pings the backend, so
// both services stay awake. Outside working hours the requests stop and both sleep, which
// keeps them within the workspace's 750 free instance hours a month.
//
// This replaces an external uptime pinger: Render refused cron-job.org's requests to the
// sleeping services (429/503) instead of waking them. Something still has to wake the
// services each morning; .github/workflows/wake.yml does, and so does the first visitor.

const INTERVAL_MS = 10 * 60 * 1000;

// Weekdays 08:00–22:00 company time
const TIME_ZONE = 'Asia/Kuala_Lumpur';
const FIRST_HOUR = 8;
const END_HOUR = 22;

const clock = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  hour: 'numeric',
  hourCycle: 'h23',
});

export function isWorkingHours(date: Date): boolean {
  const parts = Object.fromEntries(clock.formatToParts(date).map(({ type, value }) => [type, value]));
  const hour = Number(parts.hour);
  return parts.weekday !== 'Sat' && parts.weekday !== 'Sun' && hour >= FIRST_HOUR && hour < END_HOUR;
}

export function startKeepAwake(publicUrl: string) {
  const healthUrl = `${publicUrl.replace(/\/+$/, '')}/api/health`;
  const timer = setInterval(() => {
    if (!isWorkingHours(new Date())) return;
    fetch(healthUrl, { cache: 'no-store', signal: AbortSignal.timeout(60_000) }).catch(() => {});
  }, INTERVAL_MS);
  // Don't hold the process open on shutdown
  timer.unref();
}
