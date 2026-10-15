import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function PUT(request: NextRequest) {
  return proxyToBackend(request, '/api/users/password');
}
