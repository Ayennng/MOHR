import { NextResponse } from 'next/server';

// GET /api/health - Public liveness check, used to keep the free Render service awake.
// Deliberately skips the database so pings don't use up Neon's free compute hours.
export function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
}
