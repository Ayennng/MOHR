import { ApiError } from '@/lib/http';

/**
 * Shared demo logins created by scripts/reset-demo.mjs (keep the two lists in step).
 * Their passwords are public, so anything that would lock the next visitor out
 * (password, profile, role and status changes) is refused for them.
 */
export const DEMO_EMAILS = [
  'demo.admin@example.com',
  'demo.manager@example.com',
  'demo.employee@example.com',
];

export function isDemoAccount(email: string | null | undefined) {
  return !!email && DEMO_EMAILS.includes(email.toLowerCase());
}

/** Throws a 403 ApiError if `email` is a demo login. */
export function assertNotDemoAccount(email: string | null | undefined) {
  if (isDemoAccount(email)) {
    throw new ApiError(403, "Demo accounts can't be changed. The demo data resets every night.");
  }
}
