'use client';

import { useCallback, useEffect, useState } from 'react';

type ApiInit = Omit<RequestInit, 'body'> & {
  /** Sent as a JSON body. */
  json?: unknown;
  /** Sent as-is (e.g. FormData, which sets its own Content-Type). */
  body?: BodyInit;
};

/**
 * Calls one of our /api routes and resolves to the parsed JSON body. A failed
 * request throws an Error carrying the API's `{ error }` message.
 */
export async function api<T = unknown>(url: string, { json, headers, ...init }: ApiInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: json === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    body: json === undefined ? init.body : JSON.stringify(json),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body as T;
}

/**
 * Loads `url` (skipped while it's null) and reloads it whenever it changes. The last
 * result stays in `data` while a new one loads, so tables don't flash empty.
 */
export function useApi<T>(url: string | null) {
  const [result, setResult] = useState<{ url: string | null; data?: T; error?: string }>({ url: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!url) return;
    let current = true;
    api<T>(url).then(
      (data) => current && setResult({ url, data }),
      (error: Error) => current && setResult((prev) => ({ url, data: prev.data, error: error.message }))
    );
    return () => {
      current = false;
    };
  }, [url, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { data: result.data, error: result.error, loading: !!url && result.url !== url, reload };
}
