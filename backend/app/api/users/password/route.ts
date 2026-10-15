import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { parseJson, passwordSchema } from '@/lib/validation';
import { createRateLimiter, tooManyAttemptsMessage } from '@/lib/rate-limit';

const wrongCurrentPassword = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });

const changePasswordSchema = z
  .object({
    currentPassword: z.string('Current password is required').min(1, 'Current password is required').max(200),
    newPassword: passwordSchema,
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  });

// PUT /api/users/password - change the signed-in user's own password
export async function PUT(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const data = await parseJson(req, changePasswordSchema);
  if (data instanceof NextResponse) return data;

  // A stolen session shouldn't allow unlimited guessing of the current password
  const retryAfter = wrongCurrentPassword.retryAfter(authResult.user.id);
  if (retryAfter > 0) {
    return NextResponse.json(
      { error: tooManyAttemptsMessage(retryAfter) },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: authResult.user.id },
      select: { password: true },
    });

    if (!(await verifyPassword(data.currentPassword, user.password))) {
      wrongCurrentPassword.hit(authResult.user.id);
      return NextResponse.json(
        { error: 'Current password is incorrect', field: 'currentPassword' },
        { status: 400 }
      );
    }
    wrongCurrentPassword.reset(authResult.user.id);

    await prisma.user.update({
      where: { id: authResult.user.id },
      data: { password: await hashPassword(data.newPassword) },
    });

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Failed to change password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
