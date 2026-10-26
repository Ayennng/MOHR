import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { findUserByEmail } from '@/lib/employee';
import { errorResponse, jsonError } from '@/lib/http';
import { parseJson } from '@/lib/validation';
import { createRateLimiter, tooManyAttemptsMessage } from '@/lib/rate-limit';
import { isDemoAccount } from '@/lib/demo';

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

// POST /api/auth/login - called server-side by the frontend's NextAuth authorize()
export async function POST(request: NextRequest) {
  const data = await parseJson(request, loginSchema);
  if (data instanceof NextResponse) return data;

  const limitKey = data.email.toLowerCase();
  // Demo passwords are public, so a per-email lockout protects nothing and would let
  // anyone lock visitors out of the demo; the frontend's per-IP limit still applies
  const retryAfter = isDemoAccount(limitKey) ? 0 : failedLogins.retryAfter(limitKey);
  if (retryAfter > 0) {
    return NextResponse.json(
      { error: tooManyAttemptsMessage(retryAfter) },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  try {
    const user = await findUserByEmail(data.email);

    // Check the password before the active flag, so a deactivated account is
    // indistinguishable from a wrong password. Every failure gets the same answer, so
    // the endpoint can't be used to discover which emails exist.
    const isPasswordValid = await verifyPassword(data.password, user?.password ?? (await getDummyHash()));
    if (!user || !isPasswordValid || !user.active) {
      failedLogins.hit(limitKey);
      return jsonError(401, 'Invalid credentials');
    }

    failedLogins.reset(limitKey);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      avatar: user.avatar,
    });
  } catch (error) {
    return errorResponse(error, 'Login failed');
  }
}
