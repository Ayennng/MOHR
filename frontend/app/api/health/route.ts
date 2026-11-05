import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health - Public liveness check for the frontend. It also pings the backend, so
 * a request from the uptime pinger or the login page starts waking it, but it answers 200
 * whatever the backend does: a sleeping free service can take over a minute to wake, and
 * an uptime pinger that keeps getting errors disables its job. The backend has its own
 * pinger job on its own /api/health (see README).
 */
export async function GET() {
  // Keeps running after the response: an aborted request may not finish waking it
  const ping = fetch(`${BACKEND_URL}/api/health`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(180_000),
  })
    .then((response) => response.ok)
    .catch(() => false);

  // An awake backend answers in milliseconds; don't hold the pinger for a sleeping one
  const waited = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5_000));
  const backend = (await Promise.race([ping, waited])) ? 'ok' : 'waking';

  return NextResponse.json({ status: 'ok', backend }, { headers: { 'cache-control': 'no-store' } });
}
