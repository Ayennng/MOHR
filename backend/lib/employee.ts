import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export const DEFAULT_LEAVE_ALLOWANCE = {
  vacationDays: 20,
  sickDays: 10,
  personalDays: 5,
};

/** LeaveBalance columns per leave type; other types (UNPAID, ...) don't use a balance. */
export const BALANCE_FIELDS = {
  VACATION: { total: 'vacationDays', used: 'usedVacation' },
  SICK: { total: 'sickDays', used: 'usedSick' },
  PERSONAL: { total: 'personalDays', used: 'usedPersonal' },
} as const;

/** Days left for `leaveType`, or null if the type isn't limited by a balance. */
export function remainingLeaveDays(
  balance: Prisma.LeaveBalanceGetPayload<object>,
  leaveType: string
) {
  if (!(leaveType in BALANCE_FIELDS)) return null;
  const fields = BALANCE_FIELDS[leaveType as keyof typeof BALANCE_FIELDS];
  return balance[fields.total] - balance[fields.used];
}

export function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

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

/**
 * Returns the employee's leave balance for the current year. The schema keeps one
 * balance row per employee, so on the first access in a new year the used-day
 * counters are reset in place.
 */
export async function getLeaveBalance(
  employeeId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
) {
  const year = new Date().getFullYear();

  const balance = await db.leaveBalance.upsert({
    where: { employeeId },
    create: { employeeId, year, ...DEFAULT_LEAVE_ALLOWANCE },
    update: {},
  });

  if (balance.year === year) return balance;

  return db.leaveBalance.update({
    where: { employeeId },
    data: { year, usedVacation: 0, usedSick: 0, usedPersonal: 0 },
  });
}
