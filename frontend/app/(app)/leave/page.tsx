'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Plus, Check, X, Download } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { formatDate, humanize } from '@/lib/format';
import { useSort } from '@/lib/sort';
import {
  Alert, Button, Card, Column, Field, Modal, ModalActions, PageHeader, Pagination, StatusBadge, Table,
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
      <p className="mb-1 text-xs text-ink-500">{label}</p>
      <div className="text-sm font-medium text-ink-900">{children}</div>
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
    { key: 'employeeName', label: 'Employee', sortable: true, render: (l) => <span className="font-medium text-ink-900">{l.employeeName}</span> },
    { key: 'leaveType', label: 'Type', sortable: true, render: (l) => humanize(l.leaveType) },
    { key: 'startDate', label: 'Start', sortable: true, render: (l) => formatDate(l.startDate) },
    { key: 'endDate', label: 'End', sortable: true, render: (l) => formatDate(l.endDate) },
    { key: 'workingDays', label: 'Days', render: (l) => <span className="tabular-nums">{l.workingDays}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (l) => <StatusBadge status={l.status} /> },
    {
      key: 'id',
      label: 'Details',
      render: (l) => (
        <Button size="sm" variant="outline" onClick={() => setViewing(l)}>
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
          <span className="text-ink-400">-</span>
        ) : l.isOwn ? (
          <span className="text-[13px] text-ink-500">Needs another approver</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="success" disabled={deciding} onClick={() => decide(l, { status: 'APPROVED' })}>
              <Check size={14} />
              Approve
            </Button>
            <Button size="sm" variant="dangerSoft" disabled={deciding} onClick={() => openReject(l)}>
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
        title="Leave"
        description={canApprove ? 'Review requests from the team and decide on each one' : 'Your days left and every request you have made'}
        action={
          <Link href="/leave/request" className={buttonClass()}>
            <Plus size={16} />
            Request leave
          </Link>
        }
      />

      {!canApprove && <LeaveBalanceCards />}

      {/* Errors from the Approve button; rejections show theirs in the modal */}
      {!rejecting && <Alert>{decisionError}</Alert>}

      <Card
        title="Requests"
        description={canApprove ? 'Everyone’s requests, newest first' : 'Newest first'}
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

      <Modal isOpen={!!rejecting} onClose={() => setRejecting(null)} title="Reject leave request">
        <div className="space-y-4">
          <Alert>{decisionError}</Alert>
          <Field label="Reason for rejecting">
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="The employee sees this reason"
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
            Reject
          </Button>
        </ModalActions>
      </Modal>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Leave request">
        {viewing && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-ink-50 p-4">
              <Detail label="Employee">{viewing.employeeName}</Detail>
              <Detail label="Type">{humanize(viewing.leaveType)}</Detail>
              <Detail label="Start">{formatDate(viewing.startDate, LONG_DATE)}</Detail>
              <Detail label="End">{formatDate(viewing.endDate, LONG_DATE)}</Detail>
              <Detail label="Duration">
                {viewing.workingDays} working day{viewing.workingDays === 1 ? '' : 's'}
              </Detail>
              <Detail label="Status">
                <StatusBadge status={viewing.status} />
              </Detail>
            </div>

            <Detail label="Reason">
              <p className="whitespace-pre-wrap font-normal leading-relaxed text-ink-700">{viewing.reason}</p>
            </Detail>

            {viewing.attachment && (
              <a href={viewing.attachment} target="_blank" rel="noopener noreferrer" className={buttonClass('outline')}>
                <Download size={16} />
                Open attachment
              </a>
            )}

            {viewing.approvedBy && (
              <div className="grid grid-cols-2 gap-4 border-t border-ink-900/8 pt-4">
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
