import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { getCompanyTimezone, zonedTimeToUtc } from '@/lib/dates';
import { dateStringSchema, validationError } from '@/lib/validation';

const timeSchema = z.string('Time is required').regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Times must be in HH:MM format');

// Same wall-clock (company timezone) inputs as POST /api/rooms/book
const querySchema = z
  .object({
    date: dateStringSchema,
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((q) => q.endTime > q.startTime, { message: 'End time must be after start time', path: ['endTime'] });

// GET /api/rooms/availability?date=YYYY-MM-DD&startTime=HH:MM&endTime=HH:MM
// Bookable rooms with no overlapping booking in that slot.
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    date: searchParams.get('date') ?? undefined,
    startTime: searchParams.get('startTime') ?? undefined,
    endTime: searchParams.get('endTime') ?? undefined,
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const timeZone = await getCompanyTimezone();
    const startTime = zonedTimeToUtc(parsed.data.date, parsed.data.startTime, timeZone);
    const endTime = zonedTimeToUtc(parsed.data.date, parsed.data.endTime, timeZone);

    const availableRooms = await prisma.room.findMany({
      where: {
        status: 'AVAILABLE',
        bookings: {
          none: {
            status: { in: ['CONFIRMED', 'PENDING'] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        },
      },
      select: { id: true, name: true, capacity: true, location: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(availableRooms);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
