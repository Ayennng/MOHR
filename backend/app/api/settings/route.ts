import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { errorResponse } from '@/lib/http';
import { SERVER_TIMEZONE, isValidTimezone } from '@/lib/dates';
import { parseJson } from '@/lib/validation';

const settingsSelect = {
  companyName: true,
  companyEmail: true,
  companyAddress: true,
  timezone: true,
} as const;

// GET /api/settings - company settings (ADMIN); the single row is created on first read
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const settings =
      (await prisma.settings.findFirst({ select: settingsSelect })) ??
      (await prisma.settings.create({ data: { timezone: SERVER_TIMEZONE }, select: settingsSelect }));
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch settings');
  }
}

const updateSettingsSchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required').max(200).optional(),
  companyEmail: z.string().trim().toLowerCase().pipe(z.email('Invalid company email')).optional(),
  companyAddress: z.string().trim().max(500).optional(),
  timezone: z.string().refine(isValidTimezone, 'Invalid timezone').optional(),
});

// PUT /api/settings - update company settings (ADMIN)
export async function PUT(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  const data = await parseJson(req, updateSettingsSchema);
  if (data instanceof NextResponse) return data;

  try {
    const existing = await prisma.settings.findFirst({ select: { id: true } });
    const settings = existing
      ? await prisma.settings.update({ where: { id: existing.id }, data, select: settingsSelect })
      : await prisma.settings.create({ data: { timezone: SERVER_TIMEZONE, ...data }, select: settingsSelect });

    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error, 'Failed to update settings');
  }
}
