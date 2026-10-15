import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { createEmployeeRecord, isUniqueViolation } from '@/lib/employee';
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

const emailTaken = () =>
  NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });

// POST /api/auth/register - public self sign-up; always creates an EMPLOYEE
export async function POST(request: NextRequest) {
  const data = await parseJson(request, registerSchema);
  if (data instanceof NextResponse) return data;

  try {
    // Older accounts may have mixed-case emails, so compare case-insensitively
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: 'insensitive' } },
    });
    if (existingUser) return emailTaken();

    const hashedPassword = await hashPassword(data.password);

    // Create user and employee record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          department: data.department,
          phone: data.phone,
          role: 'EMPLOYEE', // Self-registration never grants elevated roles
          active: true,
        },
      });

      // Create employee record (unique ID) and leave balance
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
          id: result.id,
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          role: result.role,
          department: result.department,
          phone: result.phone,
          createdAt: result.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Another registration with this email landed at the same moment
    if (isUniqueViolation(error)) return emailTaken();
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
