import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isLastActiveAdmin, withAuth } from '@/lib/rbac';
import { employeeDetailsSchema } from '@/lib/employee';
import { ApiError, errorResponse, isUniqueViolation, jsonError } from '@/lib/http';
import { fromDbDate, toDbDate } from '@/lib/dates';
import { dateStringSchema, parseJson } from '@/lib/validation';
import { assertNotDemoAccount } from '@/lib/demo';

type Context = { params: Promise<{ id: string }> };

const employeeSelect = {
  id: true,
  userId: true,
  employeeId: true,
  position: true,
  hireDate: true,
  status: true,
  user: {
    select: { email: true, firstName: true, lastName: true, department: true, phone: true },
  },
} as const satisfies Prisma.EmployeeSelect;

const serialize = ({ hireDate, ...employee }: Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>) => ({
  ...employee,
  hireDate: fromDbDate(hireDate),
});

const notFound = () => jsonError(404, 'Employee not found');
const lastAdmin = () => new ApiError(400, 'At least one active admin is required');

/** The employee being changed by an admin; refuses demo accounts. */
async function findEditable(id: string) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { userId: true, user: { select: { email: true } } },
  });
  if (employee) assertNotDemoAccount(employee.user.email);
  return employee;
}

// GET /api/employees/:id - ADMIN/MANAGER can view anyone, employees only themselves
export async function GET(req: NextRequest, { params }: Context) {
  const { id } = await params;
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const employee = await prisma.employee.findUnique({ where: { id }, select: employeeSelect });

    // 404 rather than 403 so employees can't probe which IDs exist
    if (!employee || (user.role === 'EMPLOYEE' && employee.userId !== user.id)) return notFound();

    return NextResponse.json(serialize(employee));
  } catch (error) {
    return errorResponse(error, 'Failed to fetch employee');
  }
}

const updateEmployeeSchema = employeeDetailsSchema.extend({
  hireDate: dateStringSchema,
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']),
});

// PUT /api/employees/:id - ADMIN only
export async function PUT(req: NextRequest, { params }: Context) {
  const { id } = await params;
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  const data = await parseJson(req, updateEmployeeSchema);
  if (data instanceof NextResponse) return data;

  try {
    const existing = await findEditable(id);
    if (!existing) return notFound();

    if (existing.userId === authResult.user.id && data.status === 'INACTIVE') {
      return jsonError(400, 'You cannot deactivate your own account');
    }

    const employee = await prisma.$transaction(async (tx) => {
      if (data.status === 'INACTIVE' && (await isLastActiveAdmin(tx, existing.userId))) throw lastAdmin();

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
        select: employeeSelect,
      });
    });

    return NextResponse.json(serialize(employee));
  } catch (error) {
    if (isUniqueViolation(error)) return jsonError(409, 'Another user already has this email');
    return errorResponse(error, 'Failed to update employee');
  }
}

// DELETE /api/employees/:id - ADMIN only. Soft delete: the employee is marked
// INACTIVE and can no longer sign in, but their leave and attendance history is kept.
export async function DELETE(req: NextRequest, { params }: Context) {
  const { id } = await params;
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const existing = await findEditable(id);
    if (!existing) return notFound();

    if (existing.userId === authResult.user.id) {
      return jsonError(400, 'You cannot deactivate your own account');
    }

    await prisma.$transaction(async (tx) => {
      if (await isLastActiveAdmin(tx, existing.userId)) throw lastAdmin();

      await tx.employee.update({
        where: { id },
        data: { status: 'INACTIVE', user: { update: { active: false } } },
      });
    });

    return NextResponse.json({ message: 'Employee deactivated' });
  } catch (error) {
    return errorResponse(error, 'Failed to deactivate employee');
  }
}
