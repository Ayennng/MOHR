import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { generateTemporaryPassword, hashPassword } from '@/lib/auth';
import { withAuth } from '@/lib/rbac';
import { createEmployeeRecord, isUniqueViolation } from '@/lib/employee';
import { toDbDate } from '@/lib/dates';
import { dateStringSchema, emailSchema, optionalTextSchema, parseJson } from '@/lib/validation';

const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: emailSchema,
  phone: optionalTextSchema,
  department: optionalTextSchema,
  position: z.string().trim().min(2, 'Position is required').max(100),
  hireDate: dateStringSchema.optional(),
});

export async function POST(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  const data = await parseJson(req, createEmployeeSchema);
  if (data instanceof NextResponse) return data;

  try {
    // Older accounts may have mixed-case emails, so compare case-insensitively
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: 'insensitive' } },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Each new account gets its own random password, shown to the admin once
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(temporaryPassword);

    // Create user, employee record and leave balance together
    const employee = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          department: data.department,
          phone: data.phone,
          role: 'EMPLOYEE',
        },
      });

      return createEmployeeRecord(tx, {
        userId: user.id,
        position: data.position,
        hireDate: data.hireDate ? toDbDate(data.hireDate) : undefined,
      });
    });

    return NextResponse.json(
      {
        message: 'Employee created',
        id: employee.id,
        employeeId: employee.employeeId,
        temporaryPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
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

// GET /api/employees - full directory incl. phone numbers and leave balances,
// so ADMIN/MANAGER only (matches the sidebar, which hides Employees from others)
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN', 'MANAGER']);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            department: true,
            phone: true,
          },
        },
        leaveBalance: true,
      },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}