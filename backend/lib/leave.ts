import type { LeaveBalance, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { countWorkingDays, fromDbDate } from '@/lib/dates';

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

export type BalancedLeaveType = keyof typeof BALANCE_FIELDS;

export function isBalancedLeaveType(leaveType: string): leaveType is BalancedLeaveType {
  return leaveType in BALANCE_FIELDS;
}

/** Days left for `leaveType`, or null if the type isn't limited by a balance. */
export function remainingLeaveDays(balance: LeaveBalance, leaveType: string) {
  if (!isBalancedLeaveType(leaveType)) return null;
  const fields = BALANCE_FIELDS[leaveType];
  return balance[fields.total] - balance[fields.used];
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

/** Load a leave request with the names `serializeLeave` needs. */
export const leaveInclude = {
  employee: { include: { user: { select: { firstName: true, lastName: true } } } },
  approver: { select: { firstName: true, lastName: true } },
} as const satisfies Prisma.LeaveRequestInclude;

type LeaveWithNames = Prisma.LeaveRequestGetPayload<{ include: typeof leaveInclude }>;

const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`;

/** A leave request as the API returns it. `isOwn` lets approvers' UI hide Approve/Reject on their own requests. */
export function serializeLeave(leave: LeaveWithNames, viewerId: string) {
  return {
    id: leave.id,
    employeeId: leave.employeeId,
    employeeName: fullName(leave.employee.user),
    isOwn: leave.employee.userId === viewerId,
    leaveType: leave.leaveType,
    startDate: fromDbDate(leave.startDate),
    endDate: fromDbDate(leave.endDate),
    workingDays: countWorkingDays(leave.startDate, leave.endDate),
    reason: leave.reason,
    attachment: leave.attachment,
    status: leave.status,
    approvedBy: leave.approver ? fullName(leave.approver) : undefined,
    approvalDate: leave.approvalDate?.toISOString(),
    rejectionReason: leave.rejectionReason,
  };
}
