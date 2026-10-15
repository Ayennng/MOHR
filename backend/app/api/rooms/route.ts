import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { isUniqueViolation } from '@/lib/employee';
import { parseJson } from '@/lib/validation';

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
      include: {
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
      rooms.map(({ bookings, amenities, createdBy: _createdBy, ...room }) => ({
        ...room,
        amenities: parseAmenities(amenities),
        bookable: room.status === 'AVAILABLE',
        inUseNow: bookings.length > 0,
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
      data: {
        name: data.name,
        capacity: data.capacity,
        location: data.location,
        amenities: JSON.stringify(data.amenities),
        createdBy: authResult.user.id,
      },
    });

    return NextResponse.json(
      { ...room, amenities: data.amenities, bookable: true, inUseNow: false },
      { status: 201 }
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: 'A room with this name already exists' },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
