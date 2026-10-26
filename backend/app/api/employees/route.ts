import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateTemporaryPassword, hashPassword } from '@/lib/auth';
import { withAuth } from '@/lib/rbac';
import { createEmployeeRecord, employeeDetailsSchema, findUserByEmail } from '@/lib/employee';
import { errorResponse, isUniqueViolation, jsonError } from '@/lib/http';
import { toDbDate } from '@/lib/dates';
import { dateStringSchema, parseJson } from '@/lib/validation';

const createEmployeeSchema = employeeDetailsSchema.extend({
  hireDate: dateStringSchema.optional(),
});

const emailTaken = () => jsonError(409, 'User with this email already exists');

// POST /api/employees - ADMIN creates an account and employee record
export async function POST(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  const data = await parseJson(req, createEmployeeSchema);
  if (data instanceof NextResponse) return data;

  try {
    if (await findUserByEmail(data.email)) return emailTaken();

    // Each new account gets its own random password, shown to the admin once
    const temporaryPassword = generateTemporaryPassword();
    const password = await hashPassword(temporaryPassword);

    const employee = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password,
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
      { id: employee.id, employeeId: employee.employeeId, temporaryPassword },
      { status: 201 }
    );
  } catch (error) {
    if (isUniqueViolation(error)) return emailTaken();
    return errorResponse(error, 'Failed to create employee');
  }
}

// GET /api/employees - full directory incl. phone numbers, so ADMIN/MANAGER only
// (matches the sidebar, which hides Employees from others)
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN', 'MANAGER']);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        position: true,
        status: true,
        user: {
          select: { email: true, firstName: true, lastName: true, department: true, phone: true },
        },
      },
    });
    return NextResponse.json(employees);
  } catch (error) {
    return errorResponse(error, 'Failed to list employees');
  }
}
