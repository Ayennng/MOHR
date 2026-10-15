import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { getCompanyTimezone, toDbDate, zonedDateString } from '@/lib/dates';

export async function POST(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Please check in first' },
        { status: 400 }
      );
    }

    const now = new Date();
    const today = toDbDate(zonedDateString(now, await getCompanyTimezone()));

    // Find today's attendance record
    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: { employeeId: employee.id, date: today },
      },
    });

    if (!attendance || !attendance.checkInTime) {
      return NextResponse.json(
        { error: 'No check-in record found for today' },
        { status: 400 }
      );
    }

    if (attendance.checkOutTime) {
      return NextResponse.json(
        { error: 'Already checked out today' },
        { status: 400 }
      );
    }

    // Minimum work duration check (at least 1 minute since check-in)
    if (now.getTime() - attendance.checkInTime.getTime() < 60000) {
      return NextResponse.json(
        { error: 'You must be checked in for at least 1 minute before checking out.' },
        { status: 400 }
      );
    }

    // Only update if still checked in, so two simultaneous check-outs can't both succeed
    const { count } = await prisma.attendance.updateMany({
      where: { id: attendance.id, checkOutTime: null },
      data: { checkOutTime: now },
    });

    if (count === 0) {
      return NextResponse.json(
        { error: 'Already checked out today' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ...attendance, checkOutTime: now });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
