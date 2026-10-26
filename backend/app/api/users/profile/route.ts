import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { errorResponse } from '@/lib/http';
import { optionalTextSchema, parseJson } from '@/lib/validation';
import { assertNotDemoAccount } from '@/lib/demo';

const profileSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  department: true,
  phone: true,
  avatar: true,
} as const;

// GET /api/users/profile - the signed-in user's profile
export async function GET(request: NextRequest) {
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: authResult.user.id },
      select: profileSelect,
    });
    return NextResponse.json(user);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch profile');
  }
}

// The profile form always sends all four fields; a blank phone/department clears it
const updateProfileSchema = z.object({
  firstName: z.string('First name is required').trim().min(1, 'First name is required').max(100),
  lastName: z.string('Last name is required').trim().min(1, 'Last name is required').max(100),
  phone: optionalTextSchema,
  department: optionalTextSchema,
});

// PUT /api/users/profile - update the signed-in user's profile
export async function PUT(request: NextRequest) {
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const data = await parseJson(request, updateProfileSchema);
  if (data instanceof NextResponse) return data;

  try {
    assertNotDemoAccount(authResult.user.email);
    const user = await prisma.user.update({
      where: { id: authResult.user.id },
      data,
      select: profileSelect,
    });
    return NextResponse.json(user);
  } catch (error) {
    return errorResponse(error, 'Failed to update profile');
  }
}
