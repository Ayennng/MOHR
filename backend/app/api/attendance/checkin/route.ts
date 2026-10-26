import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { ensureEmployee } from '@/lib/employee';
import { errorResponse, isUniqueViolation, jsonError } from '@/lib/http';
import { getCompanyTimezone, toDbDate, zonedDateString, zonedMinutesOfDay } from '@/lib/dates';

// Check-ins after 09:30 company time are marked LATE
const LATE_AFTER_MINUTES = 9 * 60 + 30;

const alreadyCheckedIn = () => jsonError(400, 'Already checked in. Please check out first.');

// POST /api/attendance/checkin - start today's attendance record
export async function POST(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const employee = await ensureEmployee(authResult.user);

    const now = new Date();
    const timeZone = await getCompanyTimezone();
    const today = toDbDate(zonedDateString(now, timeZone));

    // One attendance record per day
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
    });
    if (existing) {
      return existing.checkOutTime
        ? jsonError(400, 'You have already completed attendance for today.')
        : alreadyCheckedIn();
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: today,
        checkInTime: now,
        status: zonedMinutesOfDay(now, timeZone) > LATE_AFTER_MINUTES ? 'LATE' : 'PRESENT',
      },
    });

    return NextResponse.json(attendance, { status: 201 });
  } catch (error) {
    // A simultaneous check-in already created today's record
    if (isUniqueViolation(error)) return alreadyCheckedIn();
    return errorResponse(error, 'Check-in failed');
  }
}
