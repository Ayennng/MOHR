import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { errorResponse } from '@/lib/http';
import { companyToday } from '@/lib/dates';

// GET /api/dashboard/stats - today's headline numbers for the dashboard
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const today = await companyToday();
    const isApprover = user.role === 'ADMIN' || user.role === 'MANAGER';

    const [totalEmployees, presentToday, onLeaveToday, pendingLeaves, myBookingsToday] = await Promise.all([
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.attendance.count({
        where: {
          date: today,
          status: { in: ['PRESENT', 'LATE', 'HALF_DAY'] },
          employee: { status: 'ACTIVE' },
        },
      }),
      prisma.employee.count({
        where: {
          status: 'ACTIVE',
          attendances: { none: { date: today } },
          leaveRequests: {
            some: { status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } },
          },
        },
      }),
      // Approvers see the whole queue; employees see their own pending requests
      prisma.leaveRequest.count({
        where: isApprover
          ? { status: 'PENDING' }
          : { status: 'PENDING', employee: { userId: user.id } },
      }),
      prisma.roomBooking.count({
        where: {
          bookedDate: today,
          status: { not: 'CANCELLED' },
          employee: { userId: user.id },
        },
      }),
    ]);

    return NextResponse.json({
      totalEmployees,
      pendingLeaves,
      presentToday,
      onLeaveToday,
      myBookingsToday,
      // Active employees who have neither checked in nor are on approved leave today
      absentToday: Math.max(totalEmployees - presentToday - onLeaveToday, 0),
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch dashboard stats');
  }
}
