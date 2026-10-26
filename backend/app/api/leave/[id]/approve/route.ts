import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { BALANCE_FIELDS, getLeaveBalance, isBalancedLeaveType, leaveInclude, remainingLeaveDays, serializeLeave } from '@/lib/leave';
import { ApiError, errorResponse } from '@/lib/http';
import { countWorkingDays } from '@/lib/dates';
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

// PUT /api/leave/:id/approve - ADMIN/MANAGER approve or reject a PENDING request
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

      if (!leave) throw new ApiError(404, 'Leave request not found');
      if (leave.employee.userId === user.id) {
        throw new ApiError(403, 'You cannot approve or reject your own leave request');
      }
      if (leave.status !== 'PENDING') {
        throw new ApiError(409, `This request has already been ${leave.status.toLowerCase()}`);
      }

      if (decision.status === 'APPROVED' && isBalancedLeaveType(leave.leaveType)) {
        // Lock the balance row so concurrent approvals for this employee can't overdraw it
        await tx.$queryRaw`SELECT id FROM "LeaveBalance" WHERE "employeeId" = ${leave.employeeId} FOR UPDATE`;
        const balance = await getLeaveBalance(leave.employeeId, tx);

        const days = countWorkingDays(leave.startDate, leave.endDate);
        const remaining = remainingLeaveDays(balance, leave.leaveType) ?? 0;
        if (days > remaining) {
          throw new ApiError(
            400,
            `Not enough ${leave.leaveType.toLowerCase()} leave left: ${days} working days requested, ${remaining} available`
          );
        }

        await tx.leaveBalance.update({
          where: { employeeId: leave.employeeId },
          data: { [BALANCE_FIELDS[leave.leaveType].used]: { increment: days } },
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
      if (count === 0) throw new ApiError(409, 'This request has already been decided');

      return tx.leaveRequest.findUniqueOrThrow({ where: { id: leave.id }, include: leaveInclude });
    });

    return NextResponse.json(serializeLeave(leaveRequest, user.id));
  } catch (error) {
    return errorResponse(error, 'Failed to decide leave request');
  }
}
