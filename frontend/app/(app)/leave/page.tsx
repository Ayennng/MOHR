'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Plus, Check, X, Eye, Download } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { formatDate, humanize } from '@/lib/format';
import { useSort } from '@/lib/sort';
import {
  Alert, Badge, Button, Card, Column, Field, Modal, ModalActions, PageHeader, Pagination, StatusBadge, Table,
  buttonClass, inputClass,
} from '@/components/ui';
import { LeaveBalanceCards } from '@/components/leave/leave-balance';

const PAGE_SIZE = 25;

interface LeaveRequest {
  id: string;
  employeeName: string;
  isOwn: boolean;
  workingDays: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachment: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason: string | null;
}

const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-moss-600 mb-1">{label}</p>
      <div className="text-sm font-semibold text-moss-900">{children}</div>
    </div>
  );
}

export default function LeavePage() {
  const { data: session } = useSession();
  const canApprove = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';

  // The server pages and sorts the list, so sorting covers every request, not just this page
  const sort = useSort('startDate', 'desc');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort: sort.column, dir: sort.direction });
  const { data, error, loading, reload } = useApi<{ items: LeaveRequest[]; total: number }>(`/api/leave?${params}`);

  const [viewing, setViewing] = useState<LeaveRequest | null>(null);
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const decide = async (leave: LeaveRequest, decision: { status: 'APPROVED' } | { status: 'REJECTED'; rejectionReason: string }) => {
    setDeciding(true);
    setDecisionError(null);
    try {
      await api(`/api/leave/${encodeURIComponent(leave.id)}/approve`, { method: 'PUT', json: decision });
      setRejecting(null);
      reload();
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : 'Failed to update the request');
    } finally {
      setDeciding(false);
    }
  };

  const openReject = (leave: LeaveRequest) => {
    setDecisionError(null);
    setRejectionReason('');
    setRejecting(leave);
  };

  const columns: Column<LeaveRequest>[] = [
    { key: 'employeeName', label: 'Employee', sortable: true },
    { key: 'leaveType', label: 'Type', sortable: true, render: (l) => <Badge variant="info">{humanize(l.leaveType)}</Badge> },
    { key: 'startDate', label: 'Start Date', sortable: true, render: (l) => formatDate(l.startDate) },
    { key: 'endDate', label: 'End Date', sortable: true, render: (l) => formatDate(l.endDate) },
    { key: 'workingDays', label: 'Days' },
    { key: 'status', label: 'Status', sortable: true, render: (l) => <StatusBadge status={l.status} /> },
    {
      key: 'id',
      label: 'Details',
      render: (l) => (
        <Button size="sm" variant="secondary" onClick={() => setViewing(l)}>
          <Eye size={14} />
          View
        </Button>
      ),
    },
  ];
  if (canApprove) {
    columns.push({
      key: 'id',
      label: 'Actions',
      render: (l) =>
        l.status !== 'PENDING' ? (
          <span className="text-xs text-gray-400">No actions</span>
        ) : l.isOwn ? (
          <span className="text-xs text-gray-400">Awaiting another approver</span>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="success" disabled={deciding} onClick={() => decide(l, { status: 'APPROVED' })}>
              <Check size={14} />
              Approve
            </Button>
            <Button size="sm" variant="danger" disabled={deciding} onClick={() => openReject(l)}>
              <X size={14} />
              Reject
            </Button>
          </div>
        ),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow={canApprove ? 'Approvals' : 'My Leave'}
        title="Leave Management"
        description={canApprove ? 'Manage employee leave requests and approvals' : 'View and request leave'}
        action={
          <Link href="/leave/request" className={buttonClass('primary', 'lg')}>
            <Plus size={24} />
            Request Leave
          </Link>
        }
      />

      {!canApprove && <LeaveBalanceCards />}

      {/* Errors from the Approve button; rejections show theirs in the modal */}
      {!rejecting && <Alert>{decisionError}</Alert>}

      <Card
        title="Leave Requests"
        description={canApprove ? 'All employee leave requests' : 'Your leave request history and status'}
      >
        {error && <Alert>Failed to load leave requests: {error}</Alert>}
        <Table
          columns={columns}
          data={data?.items ?? []}
          loading={loading}
          sortColumn={sort.column}
          sortDirection={sort.direction}
          onSort={(column) => {
            sort.toggle(column);
            setPage(1);
          }}
          emptyText="No leave requests yet"
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
      </Card>

      <Modal isOpen={!!rejecting} onClose={() => setRejecting(null)} title="Reject Leave Request">
        <div className="space-y-4">
          <Alert>{decisionError}</Alert>
          <Field label="Reason for rejecting">
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className={`${inputClass} resize-none`}
              rows={4}
              disabled={deciding}
            />
          </Field>
        </div>
        <ModalActions>
          <Button variant="ghost" onClick={() => setRejecting(null)} disabled={deciding}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={deciding}
            disabled={!rejectionReason.trim()}
            onClick={() => rejecting && decide(rejecting, { status: 'REJECTED', rejectionReason: rejectionReason.trim() })}
          >
            Reject Leave
          </Button>
        </ModalActions>
      </Modal>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Leave Request Details">
        {viewing && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-moss-50 rounded-lg p-4 border border-moss-200">
              <Detail label="Employee">{viewing.employeeName}</Detail>
              <Detail label="Leave Type">
                <Badge variant="info">{humanize(viewing.leaveType)}</Badge>
              </Detail>
              <Detail label="Start Date">{formatDate(viewing.startDate, LONG_DATE)}</Detail>
              <Detail label="End Date">{formatDate(viewing.endDate, LONG_DATE)}</Detail>
              <Detail label="Duration">
                {viewing.workingDays} working day{viewing.workingDays === 1 ? '' : 's'}
              </Detail>
              <Detail label="Status">
                <StatusBadge status={viewing.status} />
              </Detail>
            </div>

            <Detail label="Reason">
              <p className="font-normal whitespace-pre-wrap leading-relaxed">{viewing.reason}</p>
            </Detail>

            {viewing.attachment && (
              <a href={viewing.attachment} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary')}>
                <Download size={16} />
                Open Attachment
              </a>
            )}

            {viewing.approvedBy && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-moss-100">
                <Detail label={viewing.status === 'REJECTED' ? 'Rejected by' : 'Approved by'}>{viewing.approvedBy}</Detail>
                {viewing.approvalDate && <Detail label="On">{formatDate(viewing.approvalDate.slice(0, 10))}</Detail>}
              </div>
            )}

            {viewing.rejectionReason && <Alert>Rejection reason: {viewing.rejectionReason}</Alert>}
          </div>
        )}
        <ModalActions>
          <Button variant="ghost" onClick={() => setViewing(null)}>
            Close
          </Button>
        </ModalActions>
      </Modal>
    </>
  );
}
