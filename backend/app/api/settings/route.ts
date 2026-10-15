import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { z } from 'zod';
import { defaultTimezone, isValidTimezone } from '@/lib/dates';
import { parseJson } from '@/lib/validation';

// GET /api/settings - Fetch settings
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  try {

    // Get or create settings
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.settings.create({
        data: {
          companyName: 'MoHR Systems',
          companyEmail: 'admin@mohr.com',
          companyAddress: '',
          timezone: defaultTimezone(),
          dateFormat: 'MM/DD/YYYY',
          sessionTimeout: 30,
          require2FA: false,
          ipWhitelist: false,
          notifyLeaveRequests: true,
          notifyAttendanceAlert: true,
          notifySystemUpdates: true,
          notifyBirthdays: true,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// Only settings the app actually uses can be changed. Security, notification and
// date-format options are not implemented yet, so they are read-only in the UI and
// ignored here (unknown keys are stripped by zod).
const updateSettingsSchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required').max(200).optional(),
  companyEmail: z.string().trim().toLowerCase().pipe(z.email('Invalid company email')).optional(),
  companyAddress: z.string().trim().max(500).optional(),
  timezone: z.string().refine(isValidTimezone, 'Invalid timezone').optional(),
});

// PUT /api/settings - Update settings
export async function PUT(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  const data = await parseJson(req, updateSettingsSchema);
  if (data instanceof NextResponse) return data;

  try {
    // Only one settings row exists; create it on first save
    const existing = await prisma.settings.findFirst({ select: { id: true } });
    const settings = existing
      ? await prisma.settings.update({ where: { id: existing.id }, data })
      : await prisma.settings.create({ data: { timezone: defaultTimezone(), ...data } });

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
