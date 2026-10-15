import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withAuth } from '@/lib/rbac';
import { optionalTextSchema, parseJson } from '@/lib/validation';

// GET /api/users/profile - Get current user profile
export async function GET(request: NextRequest) {
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        phone: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// The profile form always sends all four fields; a blank phone/department clears it
const updateProfileSchema = z.object({
  firstName: z.string('First name is required').trim().min(1, 'First name is required').max(100),
  lastName: z.string('Last name is required').trim().min(1, 'Last name is required').max(100),
  phone: optionalTextSchema,
  department: optionalTextSchema,
});

// PUT /api/users/profile - Update current user profile
export async function PUT(request: NextRequest) {
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const data = await parseJson(request, updateProfileSchema);
  if (data instanceof NextResponse) return data;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        phone: true,
        avatar: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
