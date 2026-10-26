import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { ensureEmployee } from '@/lib/employee';
import { BALANCE_FIELDS, getLeaveBalance } from '@/lib/leave';
import { errorResponse } from '@/lib/http';

// GET /api/leave/balance - the signed-in user's leave balance for this year:
// { vacationDays: { total, used, available }, sickDays, personalDays, pendingRequests }
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const employee = await ensureEmployee(authResult.user);
    const [balance, pendingRequests] = await Promise.all([
      getLeaveBalance(employee.id),
      prisma.leaveRequest.count({ where: { employeeId: employee.id, status: 'PENDING' } }),
    ]);

    const summary = Object.fromEntries(
      Object.values(BALANCE_FIELDS).map(({ total, used }) => [
        total,
        { total: balance[total], used: balance[used], available: balance[total] - balance[used] },
      ])
    );

    return NextResponse.json({ ...summary, pendingRequests });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch leave balance');
  }
}
