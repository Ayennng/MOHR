import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health - Public liveness check for the frontend. It also pings the backend, so
 * the login page warms the backend's function while the visitor types. It answers 200
 * whatever the backend does, and waits at most 5 seconds for it.
 */
export async function GET() {
  const backend = await fetch(`${BACKEND_URL}/api/health`, { cache: 'no-store', signal: AbortSignal.timeout(5_000) })
    .then((response) => (response.ok ? 'ok' : 'error'))
    .catch(() => 'unreachable');

  return NextResponse.json({ status: 'ok', backend }, { headers: { 'cache-control': 'no-store' } });
}
