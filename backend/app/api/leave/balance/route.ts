import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { ensureEmployee, getLeaveBalance } from '@/lib/employee';

export async function GET(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const employee = await ensureEmployee(authResult.user);
    const leaveBalance = await getLeaveBalance(employee.id);

    // Count pending leave requests
    const pendingRequests = await prisma.leaveRequest.count({
      where: {
        employeeId: employee.id,
        status: 'PENDING',
      },
    });

    // Calculate available days
    const response = {
      vacationDays: {
        total: leaveBalance.vacationDays,
        used: leaveBalance.usedVacation,
        available: leaveBalance.vacationDays - leaveBalance.usedVacation,
      },
      sickDays: {
        total: leaveBalance.sickDays,
        used: leaveBalance.usedSick,
        available: leaveBalance.sickDays - leaveBalance.usedSick,
      },
      personalDays: {
        total: leaveBalance.personalDays,
        used: leaveBalance.usedPersonal,
        available: leaveBalance.personalDays - leaveBalance.usedPersonal,
      },
      pendingRequests,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave balance' },
      { status: 500 }
    );
  }
}
