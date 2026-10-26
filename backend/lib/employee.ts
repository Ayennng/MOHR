import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { isUniqueViolation } from '@/lib/http';
import { DEFAULT_LEAVE_ALLOWANCE } from '@/lib/leave';
import { emailSchema, optionalTextSchema } from '@/lib/validation';

/** Fields an admin sets when adding or editing an employee. */
export const employeeDetailsSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: emailSchema,
  phone: optionalTextSchema,
  department: optionalTextSchema,
  position: z.string().trim().min(2, 'Position is required').max(100),
});

export function formatEmployeeId(n: number) {
  return `EMP${String(n).padStart(4, '0')}`;
}

/**
 * Creates the Employee row (and its leave balance) for a user. Must run inside a
 * transaction: it takes an advisory lock so concurrent callers can't compute the
 * same next employee ID. IDs follow the highest existing number, so deletions
 * never cause a duplicate.
 */
export async function createEmployeeRecord(
  tx: Prisma.TransactionClient,
  data: { userId: string; position: string; hireDate?: Date }
) {
  // 727001 is an arbitrary advisory-lock key reserved for employee ID generation.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(727001)`;

  const rows = await tx.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING("employeeId" FROM 4) AS INTEGER)) AS max
    FROM "Employee"
    WHERE "employeeId" ~ '^EMP[0-9]+$'
  `;
  const employeeId = formatEmployeeId(Number(rows[0]?.max ?? 0) + 1);

  return tx.employee.create({
    data: {
      employeeId,
      userId: data.userId,
      position: data.position,
      hireDate: data.hireDate ?? new Date(),
      status: 'ACTIVE',
      leaveBalance: {
        create: { year: new Date().getFullYear(), ...DEFAULT_LEAVE_ALLOWANCE },
      },
    },
  });
}

/** Returns the user's Employee row, creating it on first use. */
export async function ensureEmployee(user: { id: string; department: string | null }) {
  const existing = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (existing) return existing;

  try {
    return await prisma.$transaction((tx) =>
      createEmployeeRecord(tx, {
        userId: user.id,
        position: user.department || 'Employee',
      })
    );
  } catch (error) {
    // Another request created it at the same moment.
    if (isUniqueViolation(error)) {
      const created = await prisma.employee.findUnique({ where: { userId: user.id } });
      if (created) return created;
    }
    throw error;
  }
}

/** Case-insensitive, because older accounts may have been stored with mixed-case emails. */
export function findUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
}
