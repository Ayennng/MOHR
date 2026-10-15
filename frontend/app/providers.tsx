'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';

// `session` comes from the server (root layout), so the first render already knows
// the user and their role instead of rendering signed-out, then filling in.
export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
