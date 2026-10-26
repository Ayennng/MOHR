import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

type Context = { params: Promise<{ path: string[] }> };

// Every /api/* request without a route of its own (auth, health) goes to the same path
// on the backend, which authorises it. Segments are re-encoded so a decoded "../" or
// "/" can't reach a different backend route.
async function proxy(request: NextRequest, { params }: Context) {
  const { path } = await params;
  return proxyToBackend(request, `/api/${path.map(encodeURIComponent).join('/')}`);
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
