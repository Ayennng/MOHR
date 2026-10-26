import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { errorResponse } from '@/lib/http';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// GET /api/leave/pending-count - the number on the sidebar's Leave badge: requests
// waiting for a decision for approvers, the user's own requests decided this past
// week for everyone else
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { id: userId, role } = authResult.user;

  try {
    const count = await prisma.leaveRequest.count({
      where:
        role === 'ADMIN' || role === 'MANAGER'
          ? { status: 'PENDING' }
          : {
              employee: { userId },
              status: { in: ['APPROVED', 'REJECTED'] },
              updatedAt: { gte: new Date(Date.now() - WEEK_MS) },
            },
    });

    return NextResponse.json({ count });
  } catch (error) {
    return errorResponse(error, 'Failed to count leave requests');
  }
}
