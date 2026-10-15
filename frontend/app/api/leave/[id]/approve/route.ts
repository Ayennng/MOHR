import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return proxyToBackend(request, `/api/leave/${encodeURIComponent(id)}/approve`);
}
