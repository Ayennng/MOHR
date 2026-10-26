import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { errorResponse } from '@/lib/http';
import { fromDbDate } from '@/lib/dates';

// GET /api/bookings - the current user's upcoming and in-progress room bookings, soonest
// first. Past and cancelled bookings are left out.
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const bookings = await prisma.roomBooking.findMany({
      where: {
        employee: { userId: authResult.user.id },
        status: { not: 'CANCELLED' },
        endTime: { gte: new Date() },
      },
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
    return errorResponse(error, 'Failed to list bookings');
  }
}
