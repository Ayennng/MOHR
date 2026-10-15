import { NextRequest, NextResponse } from 'next/server';
import type { Attendance } from '@prisma/client';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { fromDbDate, getCompanyTimezone, toDbDate, zonedDateString } from '@/lib/dates';

function serialize(record: Attendance) {
  return {
    ...record,
    date: fromDbDate(record.date),
    checkInTime: record.checkInTime?.toISOString() ?? null,
    checkOutTime: record.checkOutTime?.toISOString() ?? null,
    // Worked minutes, once checked out
    duration:
      record.checkInTime && record.checkOutTime
        ? Math.round((record.checkOutTime.getTime() - record.checkInTime.getTime()) / 60000)
        : null,
  };
}

// GET /api/attendance?month=MM&year=YYYY - the current user's attendance for one month
// (default: the current month in company time), so the list stays small however long
// someone has worked here. Returns { today, month, todayRecord, records }: `today` is the
// company-timezone date and `todayRecord` is always included, whichever month is shown.
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const userId = authResult.user.id;

  try {
    const today = zonedDateString(new Date(), await getCompanyTimezone());
    const [currentYear, currentMonth] = today.split('-').map(Number);

    const { searchParams } = new URL(req.url);
    const month = searchParams.has('month') ? Number(searchParams.get('month')) : currentMonth;
    const year = searchParams.has('year') ? Number(searchParams.get('year')) : currentYear;

    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1970 || year > 9999) {
      return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 });
    }

    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!employee) {
      // No employee record yet means no attendance
      return NextResponse.json({ today, month: monthKey, todayRecord: null, records: [] });
    }

    const [records, todayRecord] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          date: {
            gte: toDbDate(`${monthKey}-01`),
            lte: toDbDate(`${monthKey}-${String(lastDay).padStart(2, '0')}`),
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId: employee.id, date: toDbDate(today) } },
      }),
    ]);

    return NextResponse.json({
      today,
      month: monthKey,
      todayRecord: todayRecord ? serialize(todayRecord) : null,
      records: records.map(serialize),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
