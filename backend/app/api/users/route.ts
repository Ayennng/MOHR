import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isLastActiveAdmin, withAuth } from '@/lib/rbac';
import { parseJson } from '@/lib/validation';

// Accounts are created through POST /api/employees (which also creates the employee
// record and a temporary password) and are deactivated rather than deleted, so this
// route only lists users and changes their role / active flag.

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  department: true,
  phone: true,
  avatar: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

// GET /api/users - List all users (ADMIN)
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

const updateUserSchema = z
  .object({
    id: z.string().min(1, 'User ID is required'),
    role: z.enum(UserRole, 'Role must be ADMIN, MANAGER or EMPLOYEE').optional(),
    active: z.boolean('Active must be true or false').optional(),
  })
  .refine((u) => u.role !== undefined || u.active !== undefined, 'Nothing to update');

/** An expected failure with a message for the client. */
class UpdateError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// PUT /api/users - change a user's role and/or active flag (ADMIN)
export async function PUT(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  const data = await parseJson(req, updateUserSchema);
  if (data instanceof NextResponse) return data;

  if (data.id === authResult.user.id) {
    return NextResponse.json(
      { error: 'You cannot change your own role or deactivate yourself' },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: data.id } });
      if (!target) throw new UpdateError(404, 'User not found');

      const removesAdmin = (data.role !== undefined && data.role !== 'ADMIN') || data.active === false;
      if (removesAdmin && (await isLastActiveAdmin(tx, data.id))) {
        throw new UpdateError(400, 'At least one active admin is required');
      }

      if (data.active !== undefined) {
        // Keep the employee record in step: inactive users have left (status INACTIVE).
        // updateMany, because not every user has an employee record yet.
        await tx.employee.updateMany({
          where: { userId: data.id },
          data: { status: data.active ? 'ACTIVE' : 'INACTIVE' },
        });
      }

      return tx.user.update({
        where: { id: data.id },
        data: { role: data.role, active: data.active },
        select: userSelect,
      });
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof UpdateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
