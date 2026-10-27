import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health - Public check that also pings the backend, so one request (from the
 * uptime pinger or the login page) wakes both free Render services. Returns 503 when the
 * backend doesn't answer in time. The backend request keeps running after that, because
 * a sleeping free service takes about a minute to wake and an aborted request doesn't
 * wake it.
 */
export async function GET() {
  const ping = fetch(`${BACKEND_URL}/api/health`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(120_000),
  })
    .then((response) => response.ok)
    .catch(() => false);

  // Answer within the uptime pinger's 30-second timeout
  const waited = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 20_000));
  const backend = (await Promise.race([ping, waited])) ? 'ok' : 'down';

  return NextResponse.json(
    { status: backend === 'ok' ? 'ok' : 'degraded', backend },
    { status: backend === 'ok' ? 200 : 503, headers: { 'cache-control': 'no-store' } }
  );
}
