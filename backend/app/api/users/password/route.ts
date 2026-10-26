import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { errorResponse, jsonError } from '@/lib/http';
import { parseJson, passwordSchema } from '@/lib/validation';
import { createRateLimiter, tooManyAttemptsMessage } from '@/lib/rate-limit';
import { assertNotDemoAccount } from '@/lib/demo';

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
  const userId = authResult.user.id;

  const data = await parseJson(req, changePasswordSchema);
  if (data instanceof NextResponse) return data;

  // A stolen session shouldn't allow unlimited guessing of the current password
  const retryAfter = wrongCurrentPassword.retryAfter(userId);
  if (retryAfter > 0) {
    return NextResponse.json(
      { error: tooManyAttemptsMessage(retryAfter) },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  try {
    assertNotDemoAccount(authResult.user.email);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { password: true },
    });

    if (!(await verifyPassword(data.currentPassword, user.password))) {
      wrongCurrentPassword.hit(userId);
      return jsonError(400, 'Current password is incorrect', { field: 'currentPassword' });
    }
    wrongCurrentPassword.reset(userId);

    await prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(data.newPassword) },
    });

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (error) {
    return errorResponse(error, 'Failed to change password');
  }
}
