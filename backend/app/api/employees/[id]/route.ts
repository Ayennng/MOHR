import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { isLastActiveAdmin, withAuth } from '@/lib/rbac';
import { isUniqueViolation } from '@/lib/employee';
import { toDbDate } from '@/lib/dates';
import { dateStringSchema, emailSchema, optionalTextSchema, parseJson } from '@/lib/validation';

class LastAdminError extends Error {
  constructor() {
    super('At least one active admin is required');
  }
}

const employeeInclude = {
  user: {
    select: {
      email: true,
      firstName: true,
      lastName: true,
      department: true,
      phone: true,
      role: true,
      active: true,
    },
  },
  leaveBalance: true,
} as const;

// GET /api/employees/:id - ADMIN/MANAGER can view anyone, employees only themselves
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: employeeInclude,
    });

    // 404 rather than 403 so employees can't probe which IDs exist
    if (!employee || (user.role === 'EMPLOYEE' && employee.userId !== user.id)) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const updateEmployeeSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: emailSchema,
  phone: optionalTextSchema,
  department: optionalTextSchema,
  position: z.string().trim().min(2, 'Position is required').max(100),
  hireDate: dateStringSchema,
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']),
});

// PUT /api/employees/:id - ADMIN only
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  const data = await parseJson(req, updateEmployeeSchema);
  if (data instanceof NextResponse) return data;

  try {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (existing.userId === authResult.user.id && data.status === 'INACTIVE') {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 }
      );
    }

    const employee = await prisma.$transaction(async (tx) => {
      if (data.status === 'INACTIVE' && (await isLastActiveAdmin(tx, existing.userId))) {
        throw new LastAdminError();
      }

      return tx.employee.update({
        where: { id },
        data: {
          position: data.position,
          status: data.status,
          hireDate: toDbDate(data.hireDate),
          user: {
            update: {
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              phone: data.phone,
              department: data.department,
              // An INACTIVE employee has left the company and can no longer sign in
              active: data.status !== 'INACTIVE',
            },
          },
        },
        include: employeeInclude,
      });
    });

    return NextResponse.json(employee);
  } catch (error) {
    if (error instanceof LastAdminError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: 'Another user already has this email' },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/:id - ADMIN only. Soft delete: the employee is marked
// INACTIVE and can no longer sign in, but their leave and attendance history is kept.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (existing.userId === authResult.user.id) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (await isLastActiveAdmin(tx, existing.userId)) throw new LastAdminError();

      await tx.employee.update({
        where: { id },
        data: {
          status: 'INACTIVE',
          user: { update: { active: false } },
        },
      });
    });

    return NextResponse.json({ message: 'Employee deactivated' });
  } catch (error) {
    if (error instanceof LastAdminError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
