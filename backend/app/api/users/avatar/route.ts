import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { deleteUpload, detectFileType, saveUpload } from '@/lib/uploads';
import { rejectIfTooLarge } from '@/lib/validation';
import sharp from 'sharp';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

const avatarUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatar: true,
} as const;

// POST /api/users/avatar - Upload profile picture
export async function POST(request: NextRequest) {
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const tooLarge = rejectIfTooLarge(request, MAX_AVATAR_BYTES + 64 * 1024);
  if (tooLarge) return tooLarge;

  try {
    const formData = await request.formData();
    const file = formData.get('avatar');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Check the actual bytes; the browser-supplied MIME type can be anything
    const type = detectFileType(buffer);
    if (type !== 'jpg' && type !== 'png' && type !== 'webp') {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    const metadata = await sharp(buffer).metadata();
    if ((metadata.width || 0) > 4000 || (metadata.height || 0) > 4000) {
      return NextResponse.json(
        { error: 'Image dimensions must not exceed 4000x4000 pixels' },
        { status: 400 }
      );
    }

    // Re-encoding also strips anything embedded in the original file
    const processedImage = await sharp(buffer)
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 90 })
      .toBuffer();

    const previous = await prisma.user.findUniqueOrThrow({
      where: { id: authResult.user.id },
      select: { avatar: true },
    });

    const avatarUrl = await saveUpload('avatars', 'jpg', processedImage);

    let updatedUser;
    try {
      updatedUser = await prisma.user.update({
        where: { id: authResult.user.id },
        data: { avatar: avatarUrl },
        select: avatarUserSelect,
      });
    } catch (dbError) {
      // Don't leave an orphaned file behind
      await deleteUpload(avatarUrl).catch(() => {});
      throw dbError;
    }

    // Only remove the old file once the new one is saved and recorded
    await deleteUpload(previous.avatar).catch((error) =>
      console.warn('Failed to delete old avatar file:', error)
    );

    return NextResponse.json({
      message: 'Avatar uploaded successfully',
      avatar: avatarUrl,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Failed to upload avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/avatar - Remove profile picture
export async function DELETE(request: NextRequest) {
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const previous = await prisma.user.findUniqueOrThrow({
      where: { id: authResult.user.id },
      select: { avatar: true },
    });

    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.id },
      data: { avatar: null },
      select: avatarUserSelect,
    });

    await deleteUpload(previous.avatar).catch((error) =>
      console.warn('Failed to delete avatar file:', error)
    );

    return NextResponse.json({
      message: 'Avatar removed successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Failed to remove avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
