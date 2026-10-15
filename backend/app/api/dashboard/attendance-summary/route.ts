import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { getCompanyTimezone, zonedDateString } from '@/lib/dates';

export async function GET(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN', 'MANAGER']);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(req.url);
    const [currentYear, currentMonth] = zonedDateString(new Date(), await getCompanyTimezone())
      .split('-')
      .map(Number);
    const month = Number(searchParams.get('month')) || currentMonth;
    const year = Number(searchParams.get('year')) || currentYear;

    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
      return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 });
    }

    // @db.Date values are stored at UTC midnight, so build the range in UTC
    const attendance = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        date: {
          gte: new Date(Date.UTC(year, month - 1, 1)),
          lte: new Date(Date.UTC(year, month, 0)),
        },
      },
      _count: true,
    });

    return NextResponse.json({
      month,
      year,
      summary: attendance,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
