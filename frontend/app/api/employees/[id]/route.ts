import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return proxyToBackend(request, `/api/employees/${encodeURIComponent(id)}`);
}

export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return proxyToBackend(request, `/api/employees/${encodeURIComponent(id)}`);
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return proxyToBackend(request, `/api/employees/${encodeURIComponent(id)}`);
}
