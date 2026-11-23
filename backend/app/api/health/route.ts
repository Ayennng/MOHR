import { NextResponse } from 'next/server';

// GET /api/health - Public liveness check. The frontend's /api/health calls it.
// Deliberately skips the database so checks don't use up Neon's free compute hours.
export function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
}
