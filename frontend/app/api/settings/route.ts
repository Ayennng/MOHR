import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/api/settings');
}

export async function PUT(request: NextRequest) {
  return proxyToBackend(request, '/api/settings');
}
