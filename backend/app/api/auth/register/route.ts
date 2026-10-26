import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { createEmployeeRecord, findUserByEmail } from '@/lib/employee';
import { errorResponse, isUniqueViolation, jsonError } from '@/lib/http';
import { emailSchema, optionalTextSchema, parseJson, passwordSchema } from '@/lib/validation';

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  position: optionalTextSchema,
  department: optionalTextSchema,
  phone: optionalTextSchema,
});

const emailTaken = () => jsonError(409, 'User with this email already exists');

// POST /api/auth/register - public self sign-up; always creates an EMPLOYEE
export async function POST(request: NextRequest) {
  const data = await parseJson(request, registerSchema);
  if (data instanceof NextResponse) return data;

  try {
    if (await findUserByEmail(data.email)) return emailTaken();

    const password = await hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password,
          firstName: data.firstName,
          lastName: data.lastName,
          department: data.department,
          phone: data.phone,
          role: 'EMPLOYEE', // Self-registration never grants elevated roles
        },
      });

      await createEmployeeRecord(tx, {
        userId: user.id,
        position: data.position || data.department || 'Employee',
      });

      return user;
    });

    return NextResponse.json(
      {
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Another registration with this email landed at the same moment
    if (isUniqueViolation(error)) return emailTaken();
    return errorResponse(error, 'Registration failed');
  }
}
