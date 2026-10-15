import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { fromDbDate } from '@/lib/dates';

// GET /api/bookings - the current user's upcoming and in-progress room bookings, soonest
// first. Past bookings are left out so the list doesn't grow forever.
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const employee = await prisma.employee.findUnique({
      where: { userId: authResult.user.id },
    });

    if (!employee) {
      return NextResponse.json([]);
    }

    const bookings = await prisma.roomBooking.findMany({
      where: { employeeId: employee.id, endTime: { gte: new Date() } },
      include: {
        room: { select: { name: true, location: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json(
      bookings.map((b) => ({
        id: b.id,
        roomId: b.roomId,
        roomName: b.room.name,
        location: b.room.location,
        date: fromDbDate(b.bookedDate),
        startTime: b.startTime.toISOString(),
        endTime: b.endTime.toISOString(),
        purpose: b.purpose,
        status: b.status,
      }))
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
