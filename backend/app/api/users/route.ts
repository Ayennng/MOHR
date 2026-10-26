import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isLastActiveAdmin, withAuth } from '@/lib/rbac';
import { ApiError, errorResponse, jsonError } from '@/lib/http';
import { parseJson } from '@/lib/validation';
import { assertNotDemoAccount } from '@/lib/demo';

// Accounts are created through POST /api/employees (which also creates the employee
// record and a temporary password) and are deactivated rather than deleted, so this
// route only lists users and changes their role / active flag.

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  active: true,
} as const;

// GET /api/users - List all users (ADMIN)
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    return errorResponse(error, 'Failed to list users');
  }
}

const updateUserSchema = z
  .object({
    id: z.string().min(1, 'User ID is required'),
    role: z.enum(UserRole, 'Role must be ADMIN, MANAGER or EMPLOYEE').optional(),
    active: z.boolean('Active must be true or false').optional(),
  })
  .refine((u) => u.role !== undefined || u.active !== undefined, 'Nothing to update');

// PUT /api/users - change a user's role and/or active flag (ADMIN)
export async function PUT(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  const data = await parseJson(req, updateUserSchema);
  if (data instanceof NextResponse) return data;

  if (data.id === authResult.user.id) {
    return jsonError(400, 'You cannot change your own role or deactivate yourself');
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: data.id } });
      if (!target) throw new ApiError(404, 'User not found');
      assertNotDemoAccount(target.email);

      const removesAdmin = (data.role !== undefined && data.role !== 'ADMIN') || data.active === false;
      if (removesAdmin && (await isLastActiveAdmin(tx, data.id))) {
        throw new ApiError(400, 'At least one active admin is required');
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
    return errorResponse(error, 'Failed to update user');
  }
}
