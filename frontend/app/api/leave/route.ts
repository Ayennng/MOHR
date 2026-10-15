import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/api/leave');
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/api/leave');
}
