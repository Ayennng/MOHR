import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { ensureEmployee } from '@/lib/employee';
import { ApiError, errorResponse, jsonError } from '@/lib/http';
import { getCompanyTimezone, toDbDate, zonedTimeToUtc } from '@/lib/dates';
import { dateStringSchema, parseJson } from '@/lib/validation';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Times must be in HH:MM format');

// Date and times are wall-clock values in the company timezone
const bookingSchema = z
  .object({
    roomId: z.string().min(1, 'Room is required'),
    date: dateStringSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    purpose: z.string().trim().min(3, 'Purpose is required').max(200),
  })
  .refine((b) => b.endTime > b.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

// POST /api/rooms/book - book a room for a future time slot
export async function POST(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const data = await parseJson(req, bookingSchema);
  if (data instanceof NextResponse) return data;

  try {
    const timeZone = await getCompanyTimezone();
    const startTime = zonedTimeToUtc(data.date, data.startTime, timeZone);
    const endTime = zonedTimeToUtc(data.date, data.endTime, timeZone);

    if (startTime <= new Date()) return jsonError(400, 'Bookings must start in the future');

    const room = await prisma.room.findUnique({ where: { id: data.roomId } });
    if (!room || room.status !== 'AVAILABLE') {
      return jsonError(404, 'Room not found or not available for booking');
    }

    const employee = await ensureEmployee(authResult.user);

    const booking = await prisma.$transaction(async (tx) => {
      // Serialise bookings per room so two overlapping requests can't both pass the check
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${room.id}))`;

      const conflict = await tx.roomBooking.findFirst({
        where: {
          roomId: room.id,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      });
      if (conflict) throw new ApiError(409, 'Room is already booked for this time');

      return tx.roomBooking.create({
        data: {
          roomId: room.id,
          employeeId: employee.id,
          bookedDate: toDbDate(data.date),
          startTime,
          endTime,
          purpose: data.purpose,
          status: 'CONFIRMED',
        },
      });
    });

    return NextResponse.json({ id: booking.id }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Failed to book room');
  }
}
