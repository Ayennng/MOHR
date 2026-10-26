import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { errorResponse, jsonError } from '@/lib/http';
import { CONTENT_TYPES, FileType, isValidKey, readUpload } from '@/lib/uploads';

// GET /api/files/<folder>/<name> - serves an uploaded file after an access check.
// Avatars: any signed-in user. Leave attachments: the requester, ADMIN or MANAGER.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const key = path.join('/');
  const notFound = jsonError(404, 'File not found');

  if (!isValidKey(key)) return notFound;

  try {
    if (key.startsWith('leave-attachments/')) {
      const leave = await prisma.leaveRequest.findFirst({
        where: { attachment: `/api/files/${key}` },
        select: { employee: { select: { userId: true } } },
      });
      const canView =
        user.role === 'ADMIN' || user.role === 'MANAGER' || leave?.employee.userId === user.id;
      // 404 either way so the existence of other people's files isn't revealed
      if (!leave || !canView) return notFound;
    }

    const file = await readUpload(key);
    if (!file) return notFound;

    const type = key.slice(key.lastIndexOf('.') + 1) as FileType;
    const isAvatar = key.startsWith('avatars/');

    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': CONTENT_TYPES[type],
        'X-Content-Type-Options': 'nosniff',
        // Avatar filenames are unique per upload, so they can be cached; attachments are sensitive
        'Cache-Control': isAvatar ? 'private, max-age=86400' : 'private, no-store',
        ...(isAvatar ? {} : { 'Content-Disposition': 'inline' }),
      },
    });
  } catch (error) {
    return errorResponse(error, 'Failed to serve file');
  }
}
