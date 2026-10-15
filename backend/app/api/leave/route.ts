import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { LeaveStatus, LeaveType, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/rbac';
import { ensureEmployee, getLeaveBalance, remainingLeaveDays } from '@/lib/employee';
import { countWorkingDays, getCompanyTimezone, toDbDate, zonedDateString } from '@/lib/dates';
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
    const today = toDbDate(zonedDateString(new Date(), await getCompanyTimezone()));

    if (start.getTime() < today.getTime() - MAX_BACKDATE_DAYS * DAY_MS) {
      return NextResponse.json(
        { error: `Leave cannot start more than ${MAX_BACKDATE_DAYS} days ago` },
        { status: 400 }
      );
    }

    if (end.getTime() - start.getTime() > MAX_SPAN_DAYS * DAY_MS) {
      return NextResponse.json(
        { error: 'A single leave request cannot exceed one year' },
        { status: 400 }
      );
    }

    const workingDays = countWorkingDays(start, end);
    if (workingDays === 0) {
      return NextResponse.json(
        { error: 'The selected dates fall entirely on a weekend' },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: 'You already have a pending or approved leave request for these dates' },
        { status: 409 }
      );
    }

    const remaining = remainingLeaveDays(await getLeaveBalance(employee.id), leaveType);
    if (remaining !== null && workingDays > remaining) {
      return NextResponse.json(
        { error: `Not enough ${leaveType.toLowerCase()} leave: ${workingDays} working days requested, ${remaining} available` },
        { status: 400 }
      );
    }

    const attachment = formData.get('attachment');
    if (attachment instanceof File && attachment.size > 0) {
      if (attachment.size > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json(
          { error: 'Attachment must be 5MB or smaller' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await attachment.arrayBuffer());
      // Decide the type from the file's bytes, never from its name
      const type = detectFileType(buffer);
      if (!type) {
        return NextResponse.json(
          { error: 'Attachment must be a PDF, JPEG, PNG or WebP file' },
          { status: 400 }
        );
      }

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

    return NextResponse.json({ ...leaveRequest, workingDays }, { status: 201 });
  } catch (error) {
    // Don't leave an orphaned attachment if the request wasn't saved
    await deleteUpload(attachmentUrl).catch(() => {});
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
  const { id: userId, role: userRole } = authResult.user;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    if (status && !(status in LeaveStatus)) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }

    // ADMIN and MANAGER can see all leaves, EMPLOYEE sees only their own
    const whereClause: Prisma.LeaveRequestWhereInput = status
      ? { status: status as LeaveStatus }
      : {};

    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      const employee = await prisma.employee.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!employee) {
        // No employee record yet means no leave requests
        return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 0 });
      }

      whereClause.employeeId = employee.id;
    }

    const { page, pageSize, skip, take } = parsePagination(searchParams);
    const dir = parseSortDirection(searchParams);
    const sort = searchParams.get('sort') ?? 'startDate';
    const sortOrder = LEAVE_SORTS[sort];
    if (!sortOrder) {
      return NextResponse.json(
        { error: `sort must be one of: ${Object.keys(LEAVE_SORTS).join(', ')}` },
        { status: 400 }
      );
    }

    const [total, leaves] = await Promise.all([
      prisma.leaveRequest.count({ where: whereClause }),
      prisma.leaveRequest.findMany({
        where: whereClause,
        skip,
        take,
        include: {
          employee: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
          approver: {
            select: { firstName: true, lastName: true },
          },
        },
        // Newest request breaks ties so paging is stable
        orderBy: [sortOrder(dir), { createdAt: 'desc' }, { id: 'asc' }],
      }),
    ]);

    // Transform the data to match frontend expectations
    const items = leaves.map((leave) => ({
      id: leave.id,
      employeeId: leave.employeeId,
      employeeName: `${leave.employee.user.firstName} ${leave.employee.user.lastName}`,
      // Lets approvers' UI hide Approve/Reject on their own requests (the API refuses them too)
      isOwn: leave.employee.userId === userId,
      leaveType: leave.leaveType,
      startDate: leave.startDate.toISOString().split('T')[0],
      endDate: leave.endDate.toISOString().split('T')[0],
      workingDays: countWorkingDays(leave.startDate, leave.endDate),
      reason: leave.reason,
      attachment: leave.attachment,
      status: leave.status,
      approvedBy: leave.approver
        ? `${leave.approver.firstName} ${leave.approver.lastName}`
        : undefined,
      approvalDate: leave.approvalDate?.toISOString(),
      rejectionReason: leave.rejectionReason,
    }));

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}