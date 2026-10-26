import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { errorResponse, jsonError } from '@/lib/http';
import { companyToday } from '@/lib/dates';

const alreadyCheckedOut = () => jsonError(400, 'Already checked out today');

// POST /api/attendance/checkout - finish today's attendance record
export async function POST(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const employee = await prisma.employee.findUnique({ where: { userId: authResult.user.id } });
    if (!employee) return jsonError(400, 'Please check in first');

    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: await companyToday() } },
    });
    if (!attendance?.checkInTime) return jsonError(400, 'No check-in record found for today');
    if (attendance.checkOutTime) return alreadyCheckedOut();

    const now = new Date();
    if (now.getTime() - attendance.checkInTime.getTime() < 60_000) {
      return jsonError(400, 'You must be checked in for at least 1 minute before checking out.');
    }

    // Only update if still checked in, so two simultaneous check-outs can't both succeed
    const { count } = await prisma.attendance.updateMany({
      where: { id: attendance.id, checkOutTime: null },
      data: { checkOutTime: now },
    });
    if (count === 0) return alreadyCheckedOut();

    return NextResponse.json({ ...attendance, checkOutTime: now });
  } catch (error) {
    return errorResponse(error, 'Check-out failed');
  }
}
