import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { BALANCE_FIELDS, getLeaveBalance, remainingLeaveDays } from '@/lib/employee';
import { countWorkingDays, fromDbDate } from '@/lib/dates';
import { parseJson } from '@/lib/validation';

const decisionSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('APPROVED') }),
  z.object({
    status: z.literal('REJECTED'),
    rejectionReason: z
      .string('A reason is required when rejecting')
      .trim()
      .min(3, 'A reason is required when rejecting')
      .max(500),
  }),
], 'Status must be APPROVED or REJECTED');

/** An expected failure with a message for the client. */
class DecisionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// PUT /api/leave/:id/approve - ADMIN/MANAGER approve or reject a PENDING request
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await withAuth(req, ['ADMIN', 'MANAGER']);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const decision = await parseJson(req, decisionSchema);
  if (decision instanceof NextResponse) return decision;

  try {
    const leaveRequest = await prisma.$transaction(async (tx) => {
      const leave = await tx.leaveRequest.findUnique({
        where: { id },
        include: { employee: { select: { userId: true } } },
      });

      if (!leave) throw new DecisionError(404, 'Leave request not found');
      if (leave.employee.userId === user.id) {
        throw new DecisionError(403, 'You cannot approve or reject your own leave request');
      }
      if (leave.status !== 'PENDING') {
        throw new DecisionError(409, `This request has already been ${leave.status.toLowerCase()}`);
      }

      if (decision.status === 'APPROVED' && leave.leaveType in BALANCE_FIELDS) {
        // Lock the balance row so concurrent approvals for this employee can't overdraw it
        await tx.$queryRaw`SELECT id FROM "LeaveBalance" WHERE "employeeId" = ${leave.employeeId} FOR UPDATE`;
        const balance = await getLeaveBalance(leave.employeeId, tx);

        const days = countWorkingDays(leave.startDate, leave.endDate);
        const remaining = remainingLeaveDays(balance, leave.leaveType) ?? 0;
        if (days > remaining) {
          throw new DecisionError(
            400,
            `Not enough ${leave.leaveType.toLowerCase()} leave left: ${days} working days requested, ${remaining} available`
          );
        }

        const { used } = BALANCE_FIELDS[leave.leaveType as keyof typeof BALANCE_FIELDS];
        await tx.leaveBalance.update({
          where: { employeeId: leave.employeeId },
          data: { [used]: { increment: days } },
        });
      }

      // Only a PENDING request can change, so a concurrent decision can't apply twice
      const { count } = await tx.leaveRequest.updateMany({
        where: { id: leave.id, status: 'PENDING' },
        data: {
          status: decision.status,
          approvedBy: user.id,
          approvalDate: new Date(),
          rejectionReason: decision.status === 'REJECTED' ? decision.rejectionReason : null,
        },
      });
      if (count === 0) throw new DecisionError(409, 'This request has already been decided');

      return tx.leaveRequest.findUniqueOrThrow({
        where: { id: leave.id },
        include: {
          employee: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          approver: { select: { firstName: true, lastName: true } },
        },
      });
    });

    return NextResponse.json({
      id: leaveRequest.id,
      employeeId: leaveRequest.employeeId,
      employeeName: `${leaveRequest.employee.user.firstName} ${leaveRequest.employee.user.lastName}`,
      leaveType: leaveRequest.leaveType,
      startDate: fromDbDate(leaveRequest.startDate),
      endDate: fromDbDate(leaveRequest.endDate),
      reason: leaveRequest.reason,
      status: leaveRequest.status,
      approvedBy: leaveRequest.approver
        ? `${leaveRequest.approver.firstName} ${leaveRequest.approver.lastName}`
        : undefined,
      approvalDate: leaveRequest.approvalDate?.toISOString(),
      rejectionReason: leaveRequest.rejectionReason,
    });
  } catch (error) {
    if (error instanceof DecisionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error deciding leave request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
