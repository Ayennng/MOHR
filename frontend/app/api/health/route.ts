import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health - Public check that also pings the backend, so one request (from the
 * uptime pinger or the login page) wakes both free Render services. Returns 503 when the
 * backend doesn't answer in time; the request still wakes it.
 */
export async function GET() {
  let backend = 'down';
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) backend = 'ok';
  } catch {
    // Unreachable or still waking up
  }

  return NextResponse.json(
    { status: backend === 'ok' ? 'ok' : 'degraded', backend },
    { status: backend === 'ok' ? 200 : 503, headers: { 'cache-control': 'no-store' } }
  );
}
