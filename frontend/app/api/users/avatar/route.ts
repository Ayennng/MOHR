import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/api/users/avatar');
}

export async function DELETE(request: NextRequest) {
  return proxyToBackend(request, '/api/users/avatar');
}
