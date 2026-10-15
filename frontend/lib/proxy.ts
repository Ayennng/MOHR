import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const MAX_BODY_BYTES = 6 * 1024 * 1024; // 5MB file + multipart overhead

/**
 * Forwards a request to the backend API.
 *
 * Only the session cookie is forwarded: the backend decodes it (shared NEXTAUTH_SECRET)
 * and loads the user itself, so no identity headers are sent. Request and response
 * bodies are passed through untouched, which works for JSON, multipart uploads and files.
 *
 * `backendPath` must not contain unescaped user input; wrap dynamic segments in
 * `encodeURIComponent` so they can't traverse to other backend routes.
 */
export async function proxyToBackend(
  request: NextRequest,
  backendPath: string,
  { requireSession = true }: { requireSession?: boolean } = {}
) {
  if (requireSession) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const headers = new Headers();
  const cookie = request.headers.get('cookie');
  const contentType = request.headers.get('content-type');
  if (cookie) headers.set('cookie', cookie);
  if (contentType) headers.set('content-type', contentType);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  // The body is buffered below, so refuse anything bigger than the largest legitimate
  // request (5MB uploads) before reading it
  if (hasBody && Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request too large (max 5MB)' }, { status: 413 });
  }

  try {
    const response = await fetch(`${BACKEND_URL}${backendPath}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    for (const name of ['content-type', 'content-disposition', 'cache-control', 'x-content-type-options']) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Backend request failed: ${request.method} ${backendPath}`, error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 502 });
  }
}
