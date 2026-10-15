import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

type Context = { params: Promise<{ path: string[] }> };

// Uploaded files (avatars, leave attachments); the backend checks who may see each one
export async function GET(request: NextRequest, { params }: Context) {
  const { path } = await params;
  return proxyToBackend(request, `/api/files/${path.map(encodeURIComponent).join('/')}`);
}
