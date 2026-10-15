import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { id: userId, role: userRole } = authResult.user;

  try {
    let count = 0;

    if (userRole === 'ADMIN' || userRole === 'MANAGER') {
      // For admins/managers: count all pending leave requests
      count = await prisma.leaveRequest.count({
        where: { status: 'PENDING' },
      });
    } else {
      // For employees: count their own leaves with status updates (approved/rejected)
      const employee = await prisma.employee.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (employee) {
        count = await prisma.leaveRequest.count({
          where: {
            employeeId: employee.id,
            status: { in: ['APPROVED', 'REJECTED'] },
            // Only count recent status updates (last 7 days)
            updatedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        });
      }
    }

    return NextResponse.json({ count });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
