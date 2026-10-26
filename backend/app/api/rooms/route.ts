import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { errorResponse, isUniqueViolation, jsonError } from '@/lib/http';
import { parseJson } from '@/lib/validation';

/** Amenities are stored as a JSON array in a text column. */
function parseAmenities(amenities: string): string[] {
  try {
    const parsed = JSON.parse(amenities);
    return Array.isArray(parsed) ? parsed.filter((a) => typeof a === 'string') : [];
  } catch {
    return [];
  }
}

// GET /api/rooms - rooms with amenities as an array and whether each is free right now.
// Other people's bookings are not included.
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const now = new Date();
    const rooms = await prisma.room.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        capacity: true,
        location: true,
        amenities: true,
        status: true,
        // Only used to work out "in use now"; not returned
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'PENDING'] },
            startTime: { lte: now },
            endTime: { gt: now },
          },
          select: { id: true },
        },
      },
    });

    return NextResponse.json(
      rooms.map(({ bookings, amenities, status, ...room }) => ({
        ...room,
        amenities: parseAmenities(amenities),
        bookable: status === 'AVAILABLE',
        inUseNow: bookings.length > 0,
      }))
    );
  } catch (error) {
    return errorResponse(error, 'Failed to list rooms');
  }
}

const createRoomSchema = z.object({
  name: z.string().trim().min(1, 'Room name is required').max(100),
  capacity: z.coerce.number().int('Capacity must be a whole number').min(1, 'Capacity must be at least 1').max(1000),
  location: z.string().trim().min(1, 'Location is required').max(200),
  amenities: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
});

// POST /api/rooms - ADMIN only
export async function POST(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  const data = await parseJson(req, createRoomSchema);
  if (data instanceof NextResponse) return data;

  try {
    const room = await prisma.room.create({
      data: { ...data, amenities: JSON.stringify(data.amenities), createdBy: authResult.user.id },
    });

    return NextResponse.json(
      {
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        location: room.location,
        amenities: data.amenities,
        bookable: true,
        inUseNow: false,
      },
      { status: 201 }
    );
  } catch (error) {
    if (isUniqueViolation(error)) return jsonError(409, 'A room with this name already exists');
    return errorResponse(error, 'Failed to create room');
  }
}
