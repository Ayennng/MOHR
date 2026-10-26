import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { errorResponse, jsonError } from '@/lib/http';
import { deleteUpload, detectFileType, saveUpload } from '@/lib/uploads';
import { rejectIfTooLarge } from '@/lib/validation';
import { assertNotDemoAccount } from '@/lib/demo';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_AVATAR_PIXELS = 4000;

/** Points the user at `avatar` (or none), then deletes the file it replaces. */
async function replaceAvatar(userId: string, avatar: string | null) {
  const previous = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { avatar: true } });
  await prisma.user.update({ where: { id: userId }, data: { avatar } });

  // Only remove the old file once the new one is saved and recorded
  await deleteUpload(previous.avatar).catch((error) =>
    console.warn('Failed to delete old avatar file:', error)
  );
}

// POST /api/users/avatar - upload a profile picture (multipart field "avatar")
export async function POST(request: NextRequest) {
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const tooLarge = rejectIfTooLarge(request, MAX_AVATAR_BYTES + 64 * 1024);
  if (tooLarge) return tooLarge;

  let avatarUrl: string | null = null;
  try {
    assertNotDemoAccount(authResult.user.email);

    const file = (await request.formData()).get('avatar');
    if (!(file instanceof File) || file.size === 0) return jsonError(400, 'No file provided');
    if (file.size > MAX_AVATAR_BYTES) return jsonError(400, 'File size exceeds 5MB limit');

    const buffer = Buffer.from(await file.arrayBuffer());

    // Check the actual bytes; the browser-supplied MIME type can be anything
    const type = detectFileType(buffer);
    if (type !== 'jpg' && type !== 'png' && type !== 'webp') {
      return jsonError(400, 'Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }

    const { width = 0, height = 0 } = await sharp(buffer).metadata();
    if (width > MAX_AVATAR_PIXELS || height > MAX_AVATAR_PIXELS) {
      return jsonError(400, `Image dimensions must not exceed ${MAX_AVATAR_PIXELS}x${MAX_AVATAR_PIXELS} pixels`);
    }

    // Re-encoding also strips anything embedded in the original file
    const resized = await sharp(buffer)
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 90 })
      .toBuffer();

    avatarUrl = await saveUpload('avatars', 'jpg', resized);
    await replaceAvatar(authResult.user.id, avatarUrl);

    return NextResponse.json({ avatar: avatarUrl });
  } catch (error) {
    // Don't leave an orphaned file behind if it wasn't recorded
    if (avatarUrl) await deleteUpload(avatarUrl).catch(() => {});
    return errorResponse(error, 'Failed to upload avatar');
  }
}

// DELETE /api/users/avatar - remove the profile picture
export async function DELETE(request: NextRequest) {
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    assertNotDemoAccount(authResult.user.email);
    await replaceAvatar(authResult.user.id, null);
    return NextResponse.json({ avatar: null });
  } catch (error) {
    return errorResponse(error, 'Failed to remove avatar');
  }
}
