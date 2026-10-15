import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { ensureEmployee, isUniqueViolation } from '@/lib/employee';
import { getCompanyTimezone, toDbDate, zonedDateString, zonedMinutesOfDay } from '@/lib/dates';

// Check-ins after 09:30 company time are marked LATE
const LATE_AFTER_MINUTES = 9 * 60 + 30;

export async function POST(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  try {
    const employee = await ensureEmployee(user);

    const now = new Date();
    const timeZone = await getCompanyTimezone();
    const today = toDbDate(zonedDateString(now, timeZone));

    // Check if already checked in (one attendance record per day)
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: { employeeId: employee.id, date: today },
      },
    });

    if (existingAttendance) {
      if (existingAttendance.checkOutTime) {
        return NextResponse.json(
          { error: 'You have already completed attendance for today.' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'Already checked in. Please check out first.' },
          { status: 400 }
        );
      }
    }

    const status =
      zonedMinutesOfDay(now, timeZone) > LATE_AFTER_MINUTES ? 'LATE' : 'PRESENT';

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: today,
        checkInTime: now,
        status,
      },
    });

    return NextResponse.json(attendance, { status: 201 });
  } catch (error) {
    // A simultaneous check-in already created today's record
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: 'Already checked in. Please check out first.' },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
