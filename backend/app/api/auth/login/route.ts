import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { parseJson } from '@/lib/validation';
import { createRateLimiter, tooManyAttemptsMessage } from '@/lib/rate-limit';

// 5 failed attempts per email per 15 minutes; a successful login clears the count
const failedLogins = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });

// Compared against when the email is unknown, so both cases take a bcrypt's time
// and response timing doesn't reveal which emails have accounts
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword('not-a-real-password'));

const loginSchema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

// Every failure gets the same answer so the endpoint can't be used to discover
// which emails exist or which accounts are deactivated.
const invalidCredentials = () =>
  NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

// POST /api/auth/login - called server-side by the frontend's NextAuth authorize()
export async function POST(request: NextRequest) {
  const data = await parseJson(request, loginSchema);
  if (data instanceof NextResponse) return data;

  const limitKey = data.email.toLowerCase();
  const retryAfter = failedLogins.retryAfter(limitKey);
  if (retryAfter > 0) {
    return NextResponse.json(
      { error: tooManyAttemptsMessage(retryAfter) },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  try {
    // Case-insensitive: older accounts may have been stored with mixed-case emails
    const user = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: 'insensitive' } },
    });

    // Check the password before the active flag, so a deactivated account is
    // indistinguishable from a wrong password
    const isPasswordValid = await verifyPassword(data.password, user?.password ?? (await getDummyHash()));
    if (!user || !isPasswordValid || !user.active) {
      failedLogins.hit(limitKey);
      return invalidCredentials();
    }

    failedLogins.reset(limitKey);

    // Return user data (without password)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      department: user.department,
      phone: user.phone,
      avatar: user.avatar,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
