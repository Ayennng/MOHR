import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { LeaveStatus, LeaveType, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { ensureEmployee } from '@/lib/employee';
import { getLeaveBalance, leaveInclude, remainingLeaveDays, serializeLeave } from '@/lib/leave';
import { errorResponse, jsonError } from '@/lib/http';
import { companyToday, countWorkingDays, toDbDate } from '@/lib/dates';
import { deleteUpload, detectFileType, saveUpload } from '@/lib/uploads';
import { dateStringSchema, rejectIfTooLarge, validationError } from '@/lib/validation';
import { parsePagination, parseSortDirection } from '@/lib/pagination';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB
// How far back a request may start (e.g. sick leave reported after the fact)
const MAX_BACKDATE_DAYS = 30;
const MAX_SPAN_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

const createLeaveSchema = z
  .object({
    leaveType: z.enum(LeaveType, 'Please select a valid leave type'),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    reason: z
      .string('Reason is required')
      .trim()
      .min(10, 'Reason must be at least 10 characters')
      .max(1000, 'Reason must be at most 1000 characters'),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

// POST /api/leave - request leave (multipart: the fields above plus an optional "attachment")
export async function POST(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  // 5MB attachment plus room for the text fields and multipart framing
  const tooLarge = rejectIfTooLarge(req, MAX_ATTACHMENT_BYTES + 64 * 1024);
  if (tooLarge) return tooLarge;

  let attachmentUrl: string | null = null;

  try {
    const formData = await req.formData();
    const parsed = createLeaveSchema.safeParse({
      leaveType: formData.get('leaveType'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      reason: formData.get('reason'),
    });
    if (!parsed.success) return validationError(parsed.error);
    const { leaveType, reason } = parsed.data;

    const start = toDbDate(parsed.data.startDate);
    const end = toDbDate(parsed.data.endDate);
    const today = await companyToday();

    if (start.getTime() < today.getTime() - MAX_BACKDATE_DAYS * DAY_MS) {
      return jsonError(400, `Leave cannot start more than ${MAX_BACKDATE_DAYS} days ago`);
    }
    if (end.getTime() - start.getTime() > MAX_SPAN_DAYS * DAY_MS) {
      return jsonError(400, 'A single leave request cannot exceed one year');
    }

    const workingDays = countWorkingDays(start, end);
    if (workingDays === 0) return jsonError(400, 'The selected dates fall entirely on a weekend');

    const employee = await ensureEmployee(authResult.user);

    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlapping) {
      return jsonError(409, 'You already have a pending or approved leave request for these dates');
    }

    const remaining = remainingLeaveDays(await getLeaveBalance(employee.id), leaveType);
    if (remaining !== null && workingDays > remaining) {
      return jsonError(
        400,
        `Not enough ${leaveType.toLowerCase()} leave: ${workingDays} working days requested, ${remaining} available`
      );
    }

    const attachment = formData.get('attachment');
    if (attachment instanceof File && attachment.size > 0) {
      if (attachment.size > MAX_ATTACHMENT_BYTES) return jsonError(400, 'Attachment must be 5MB or smaller');

      const buffer = Buffer.from(await attachment.arrayBuffer());
      // Decide the type from the file's bytes, never from its name
      const type = detectFileType(buffer);
      if (!type) return jsonError(400, 'Attachment must be a PDF, JPEG, PNG or WebP file');

      attachmentUrl = await saveUpload('leave-attachments', type, buffer);
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType,
        startDate: start,
        endDate: end,
        reason,
        attachment: attachmentUrl,
      },
    });

    return NextResponse.json({ id: leaveRequest.id, workingDays }, { status: 201 });
  } catch (error) {
    // Don't leave an orphaned attachment if the request wasn't saved
    await deleteUpload(attachmentUrl).catch(() => {});
    return errorResponse(error, 'Failed to create leave request');
  }
}

type SortDir = 'asc' | 'desc';

// Columns the leave table can sort by (?sort=...&dir=asc|desc)
const LEAVE_SORTS: Record<string, (dir: SortDir) => Prisma.LeaveRequestOrderByWithRelationInput> = {
  employeeName: (dir) => ({ employee: { user: { firstName: dir } } }),
  leaveType: (dir) => ({ leaveType: dir }),
  startDate: (dir) => ({ startDate: dir }),
  endDate: (dir) => ({ endDate: dir }),
  status: (dir) => ({ status: dir }),
  createdAt: (dir) => ({ createdAt: dir }),
};

// GET /api/leave?status=&page=&pageSize=&sort=&dir= - one page of leave requests:
// everyone's for ADMIN/MANAGER, otherwise the user's own. Returns { items, total, page, pageSize }.
export async function GET(req: NextRequest) {
  const authResult = await withAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { id: userId, role } = authResult.user;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  if (status && !(status in LeaveStatus)) return jsonError(400, 'Invalid status filter');

  const sortOrder = LEAVE_SORTS[searchParams.get('sort') ?? 'startDate'];
  if (!sortOrder) return jsonError(400, `sort must be one of: ${Object.keys(LEAVE_SORTS).join(', ')}`);

  const { page, pageSize, skip, take } = parsePagination(searchParams);

  try {
    const where: Prisma.LeaveRequestWhereInput = status ? { status: status as LeaveStatus } : {};
    // ADMIN and MANAGER can see all leaves, EMPLOYEE sees only their own
    if (role !== 'ADMIN' && role !== 'MANAGER') where.employee = { userId };

    const [total, leaves] = await Promise.all([
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.findMany({
        where,
        skip,
        take,
        include: leaveInclude,
        // Newest request breaks ties so paging is stable
        orderBy: [sortOrder(parseSortDirection(searchParams)), { createdAt: 'desc' }, { id: 'asc' }],
      }),
    ]);

    return NextResponse.json({
      items: leaves.map((leave) => serializeLeave(leave, userId)),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to list leave requests');
  }
}
