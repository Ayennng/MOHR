import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  department: string | null;
}

/**
 * Authenticates a request from the NextAuth session cookie the frontend forwards
 * (both apps share NEXTAUTH_SECRET). The user is reloaded from the database on every
 * call, so deactivation and role changes take effect immediately instead of when the
 * JWT expires. Never trust identity headers such as X-User-Id: callers can forge them.
 */
export async function withAuth(
  req: NextRequest,
  allowedRoles: UserRole[] = []
): Promise<{ user: AuthUser } | NextResponse> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    // Over HTTPS the frontend issues "__Secure-next-auth.session-token" (possibly split
    // into .0/.1 chunks); locally it's "next-auth.session-token". Read whichever was
    // sent. The name doesn't affect security: the contents are verified with the secret.
    secureCookie: req.cookies
      .getAll()
      .some((c) => c.name.startsWith('__Secure-next-auth.session-token')),
  });

  const userId = typeof token?.id === 'string' ? token.id : token?.sub;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      department: true,
      active: true,
    },
  });

  if (!user || !user.active) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden - Insufficient permissions' },
      { status: 403 }
    );
  }

  const { active: _active, ...authUser } = user;
  return { user: authUser };
}

/**
 * Call inside a transaction before demoting or deactivating `userId`. Serialises such
 * changes (advisory lock) and reports whether `userId` is the last active admin, so two
 * admins acting at the same moment can't lock everyone out.
 */
export async function isLastActiveAdmin(tx: Prisma.TransactionClient, userId: string) {
  // 727002 is an arbitrary advisory-lock key reserved for admin role/status changes
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(727002)`;

  const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, active: true } });
  if (!user || user.role !== 'ADMIN' || !user.active) return false;

  return (await tx.user.count({ where: { role: 'ADMIN', active: true } })) <= 1;
}
