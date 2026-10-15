/**
 * Small in-memory rate limiter (sliding window), same as backend/lib/rate-limit.ts.
 * State lives in this process, so it only protects a single server instance; use a
 * shared store (e.g. Redis) if the frontend is ever run as several instances.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  const recent = (key: string, now: number) =>
    (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  return {
    /** Seconds until `key` may try again, or 0 if it isn't blocked. */
    retryAfter(key: string) {
      const now = Date.now();
      const times = recent(key, now);
      return times.length >= limit ? Math.ceil((times[0] + windowMs - now) / 1000) : 0;
    },

    /** Records one attempt (e.g. a failed login) for `key`. */
    hit(key: string) {
      const now = Date.now();
      hits.set(key, [...recent(key, now), now]);

      // Keep memory bounded: drop keys whose attempts have all expired
      if (hits.size > 10_000) {
        for (const [k, times] of hits) {
          if (times.every((t) => now - t >= windowMs)) hits.delete(k);
        }
      }
    },

    reset(key: string) {
      hits.delete(key);
    },
  };
}

export function tooManyAttemptsMessage(retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}
