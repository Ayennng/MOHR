import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { countWorkingDays, fromDbDate, getCompanyTimezone, toDbDate, zonedDateString } from '@/lib/dates';

const PERIODS = ['week', 'month', 'quarter', 'year'] as const;
type Period = (typeof PERIODS)[number];

// Statuses that count as "came to work"
const ATTENDED = ['PRESENT', 'LATE', 'HALF_DAY'] as const;

/** First day (UTC-midnight calendar date) of the reporting period ending on `today`. */
function periodStart(today: Date, period: Period) {
  const start = new Date(today);
  if (period === 'week') start.setUTCDate(start.getUTCDate() - 6);
  if (period === 'month') start.setUTCMonth(start.getUTCMonth() - 1);
  if (period === 'quarter') start.setUTCMonth(start.getUTCMonth() - 3);
  if (period === 'year') start.setUTCFullYear(start.getUTCFullYear() - 1);
  return start;
}

/** The last `count` Monday–Friday dates up to and including `today`, oldest first. */
function lastWorkingDays(today: Date, count: number) {
  const days: Date[] = [];
  for (const d = new Date(today); days.length < count; d.setUTCDate(d.getUTCDate() - 1)) {
    const weekday = d.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.unshift(new Date(d));
  }
  return days;
}

const percent = (part: number, whole: number) =>
  whole > 0 ? Math.min(100, Math.round((part / whole) * 1000) / 10) : 0;

// GET /api/reports?period=week|month|quarter|year - ADMIN/MANAGER analytics
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN', 'MANAGER']);
  if (authResult instanceof NextResponse) return authResult;

  const period = (new URL(req.url).searchParams.get('period') || 'month') as Period;
  if (!PERIODS.includes(period)) {
    return NextResponse.json(
      { error: `period must be one of: ${PERIODS.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const today = toDbDate(zonedDateString(new Date(), await getCompanyTimezone()));
    const startDate = periodStart(today, period);
    const trendDays = lastWorkingDays(today, 5);

    const [
      activeEmployees,
      newHires,
      attendedInPeriod,
      leaveCounts,
      pendingLeaves,
      attendedByDay,
    ] = await Promise.all([
      prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { user: { select: { department: true } } },
      }),
      prisma.employee.count({
        where: { status: 'ACTIVE', hireDate: { gte: startDate } },
      }),
      prisma.attendance.count({
        where: { date: { gte: startDate, lte: today }, status: { in: [...ATTENDED] } },
      }),
      prisma.leaveRequest.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: { _all: true },
      }),
      // Pending is "right now", not limited to the period
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.attendance.groupBy({
        by: ['date'],
        where: { date: { in: trendDays }, status: { in: [...ATTENDED] } },
        _count: { _all: true },
      }),
    ]);

    const totalEmployees = activeEmployees.length;

    // Attendance rate: check-ins against what full attendance would have been.
    // Approximation: uses today's headcount for every working day in the period.
    const workingDaysInPeriod = countWorkingDays(startDate, today);
    const avgAttendance = percent(attendedInPeriod, totalEmployees * workingDaysInPeriod);

    const departmentCounts = new Map<string, number>();
    for (const { user } of activeEmployees) {
      const name = user.department?.trim() || 'Unassigned';
      departmentCounts.set(name, (departmentCounts.get(name) ?? 0) + 1);
    }
    const departmentStats = [...departmentCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round(percent(count, totalEmployees)),
      }));

    const attendedOn = new Map(attendedByDay.map((row) => [fromDbDate(row.date), row._count._all]));
    const weeklyTrend = trendDays.map((day) => ({
      day: day.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
      date: fromDbDate(day),
      rate: Math.round(percent(attendedOn.get(fromDbDate(day)) ?? 0, totalEmployees)),
    }));

    const countFor = (status: string) =>
      leaveCounts.find((row) => row.status === status)?._count._all ?? 0;

    return NextResponse.json({
      period,
      metrics: {
        totalEmployees,
        newHires,
        avgAttendance,
        pendingLeaves,
        departmentCount: departmentStats.filter((d) => d.name !== 'Unassigned').length,
      },
      departmentStats,
      weeklyTrend,
      leaveStats: {
        approved: countFor('APPROVED'),
        pending: pendingLeaves,
        rejected: countFor('REJECTED'),
        cancelled: countFor('CANCELLED'),
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
