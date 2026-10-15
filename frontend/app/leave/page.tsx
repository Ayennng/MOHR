'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Calendar, Heart, User, Clock, Check, X, Eye } from 'lucide-react';
import Link from 'next/link';
import { Table, Column, Button, Badge, StatusBadge, Modal, Pagination } from '@/components/ui';

const PAGE_SIZE = 25;

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  isOwn: boolean;
  workingDays: number;
  leaveType: 'VACATION' | 'SICK' | 'PERSONAL' | 'UNPAID';
  startDate: string;
  endDate: string;
  reason: string;
  attachment?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
}

interface LeaveBalance {
  vacationDays: { total: number; used: number; available: number };
  sickDays: { total: number; used: number; available: number };
  personalDays: { total: number; used: number; available: number };
  pendingRequests: number;
}

export default function LeavePage() {
  const { data: session } = useSession();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<keyof LeaveRequest>('startDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalLeaves, setTotalLeaves] = useState(0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);

  // The server pages and sorts the list, so sorting covers every request, not just this page
  const loadLeaves = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sort: sortColumn,
      dir: sortDirection,
    });
    const response = await fetch(`/api/leave?${params}`);
    if (!response.ok) throw new Error(`Leave request list failed (${response.status})`);
    const data: { items: LeaveRequest[]; total: number } = await response.json();
    setLeaves(data.items);
    setTotalLeaves(data.total);
  }, [page, sortColumn, sortDirection]);

  useEffect(() => {
    setLoading(true);
    loadLeaves()
      .catch((error) => {
        console.error('Failed to fetch leave requests:', error);
        setLeaves([]);
      })
      .finally(() => setLoading(false));
  }, [loadLeaves]);

  useEffect(() => {
    fetch('/api/leave/balance')
      // An error body has no balance fields; rendering it would crash the page
      .then(async (response) => setLeaveBalance(response.ok ? await response.json() : null))
      .catch((error) => console.error('Failed to fetch leave balance:', error));
  }, []);

  const handleSort = (column: keyof LeaveRequest) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const handleApprove = async (leaveId: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/leave/${leaveId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to approve leave');
      }

      // Refresh the leave list
      await loadLeaves();

      alert('Leave request approved successfully!');
    } catch (error: any) {
      console.error('Failed to approve leave:', error);
      const errorMessage = error?.message || 'Failed to approve leave request. Please try again.';
      alert(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClick = (leaveId: string) => {
    setSelectedLeaveId(leaveId);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedLeaveId) return;
    
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/leave/${selectedLeaveId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to reject leave');
      }

      // Refresh the leave list
      await loadLeaves();

      setShowRejectModal(false);
      setSelectedLeaveId(null);
      setRejectionReason('');

      alert('Leave request rejected.');
    } catch (error: any) {
      console.error('Failed to reject leave:', error);
      const errorMessage = error?.message || 'Failed to reject leave request. Please try again.';
      alert(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectCancel = () => {
    setShowRejectModal(false);
    setSelectedLeaveId(null);
    setRejectionReason('');
  };

  const handleViewDetails = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedLeave(null);
  };

  const isAdmin = session?.user?.role === 'ADMIN';
  const isManager = session?.user?.role === 'MANAGER';
  const canApprove = isAdmin || isManager;

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'employeeName',
      label: 'Employee',
      sortable: true,
    },
    {
      key: 'leaveType',
      label: 'Type',
      sortable: true,
      render: (value) => (
        <Badge variant="info" size="sm">
          {value}
        </Badge>
      ),
    },
    {
      key: 'startDate',
      label: 'Start Date',
      sortable: true,
      render: (value) => {
        const date = new Date(value + 'T00:00:00Z');
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      },
    },
    {
      key: 'endDate',
      label: 'End Date',
      sortable: true,
      render: (value) => {
        const date = new Date(value + 'T00:00:00Z');
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => <StatusBadge status={value} size="sm" />,
    },
    {
      key: 'id',
      label: 'Details',
      sortable: false,
      render: (value, row) => (
        <button
          onClick={() => handleViewDetails(row)}
          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
          title="View Details"
        >
          <Eye size={14} />
          View
        </button>
      ),
    },
  ];

  // Add Actions column for managers and admins
  if (canApprove) {
    columns.push({
      key: 'id',
      label: 'Actions',
      sortable: false,
      render: (value, row) => {
        if (row.status !== 'PENDING') {
          return <span className="text-xs text-gray-400">No actions</span>;
        }
        if (row.isOwn) {
          return <span className="text-xs text-gray-400">Awaiting another approver</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleApprove(row.id)}
              disabled={actionLoading}
              className="p-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Approve"
            >
              <Check size={14} />
              Approve
            </button>
            <button
              onClick={() => handleRejectClick(row.id)}
              disabled={actionLoading}
              className="p-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Reject"
            >
              <X size={14} />
              Reject
            </button>
          </div>
        );
      },
    });
  }

  return (
    <div className="space-y-8">
      {/* Header - Enhanced */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 rounded-3xl bg-linear-to-br from-moss-50 to-emerald-50 border-2 border-moss-100">
        <div className="flex-1">
          <div className="inline-block px-4 py-2 bg-moss-600 text-white rounded-full text-xs font-bold mb-3">
            {canApprove ? 'ADMIN PANEL' : 'EMPLOYEE PORTAL'}
          </div>
          <h1 className="text-5xl font-extrabold bg-linear-to-r from-moss-900 to-moss-700 bg-clip-text text-transparent mb-3 pb-2">
            Leave Management
          </h1>
          <p className="text-moss-600 text-lg">
            {canApprove
              ? 'Manage employee leave requests and approvals'
              : 'View and request leaves for work-life balance'}
          </p>
        </div>
        <Link href="/leave/request">
          <button className="px-8 py-4 bg-linear-to-r from-moss-500 to-moss-600 text-white rounded-2xl font-bold text-lg hover:from-moss-600 hover:to-moss-700 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] flex items-center gap-3">
            <Plus size={24} />
            Request Leave
          </button>
        </Link>
      </div>

      {/* Leave Balance Section (if not admin) - Enhanced */}
      {!canApprove && (
        <div>
          <h2 className="text-3xl font-extrabold text-moss-900 mb-8 flex items-center gap-3">
            <span className="w-2 h-8 bg-linear-to-b from-moss-500 to-moss-700 rounded-full"></span>
            Your Leave Balance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Vacation Days */}
            <div className="group relative overflow-hidden rounded-3xl bg-white p-7 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-moss-100 hover:scale-[1.01]">
              <div className="absolute inset-0 bg-linear-to-br from-moss-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div className="p-4 bg-linear-to-br from-moss-600 to-moss-700 rounded-2xl transition-all duration-300 shadow-md hover:scale-110">
                    <Calendar className="text-white" size={28} />
                  </div>
                  <span className="text-xs font-bold text-moss-900 bg-moss-100 px-3 py-1.5 rounded-full border border-moss-200">{leaveBalance?.vacationDays.available || 0}/{leaveBalance?.vacationDays.total || 0}</span>
                </div>
                <p className="text-xs font-bold text-moss-600 uppercase tracking-wider mb-2">Vacation Days</p>
                <p className="text-5xl font-extrabold text-moss-900 mt-2 mb-4">{leaveBalance?.vacationDays.available || 0}</p>
                <div className="mt-4 w-full bg-moss-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-linear-to-r from-moss-500 to-moss-600 h-3 rounded-full transition-all duration-500" style={{width: `${leaveBalance ? (leaveBalance.vacationDays.available / leaveBalance.vacationDays.total * 100) : 0}%`}}></div>
                </div>
                <p className="text-xs text-moss-600 font-semibold mt-3 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-moss-500 rounded-full animate-pulse"></span>
                  {leaveBalance ? Math.round(leaveBalance.vacationDays.available / leaveBalance.vacationDays.total * 100) : 0}% available this year
                </p>
              </div>
            </div>

            {/* Sick Days */}
            <div className="group relative overflow-hidden rounded-3xl bg-white p-7 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-red-100 hover:scale-[1.01]">
              <div className="absolute inset-0 bg-linear-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div className="p-4 bg-linear-to-br from-red-600 to-red-700 rounded-2xl transition-all duration-300 shadow-md hover:scale-110">
                    <Heart className="text-white" size={28} />
                  </div>
                  <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1.5 rounded-full">{leaveBalance?.sickDays.available || 0}/{leaveBalance?.sickDays.total || 0}</span>
                </div>
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Sick Days</p>
                <p className="text-5xl font-extrabold text-red-900 mt-2 mb-4">{leaveBalance?.sickDays.available || 0}</p>
                <div className="mt-4 w-full bg-red-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-linear-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500" style={{width: `${leaveBalance ? (leaveBalance.sickDays.available / leaveBalance.sickDays.total * 100) : 0}%`}}></div>
                </div>
                <p className="text-xs text-red-600 font-semibold mt-3 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  {leaveBalance ? Math.round(leaveBalance.sickDays.available / leaveBalance.sickDays.total * 100) : 0}% available
                </p>
              </div>
            </div>

            {/* Personal Days */}
            <div className="group relative overflow-hidden rounded-3xl bg-white p-7 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-amber-100 hover:scale-[1.01]">
              <div className="absolute inset-0 bg-linear-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div className="p-4 bg-linear-to-br from-amber-600 to-amber-700 rounded-2xl transition-all duration-300 shadow-md hover:scale-110">
                    <User className="text-white" size={28} />
                  </div>
                  <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1.5 rounded-full border border-amber-200">{leaveBalance?.personalDays.available || 0}/{leaveBalance?.personalDays.total || 0}</span>
                </div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Personal Days</p>
                <p className="text-5xl font-extrabold text-amber-900 mt-2 mb-4">{leaveBalance?.personalDays.available || 0}</p>
                <div className="mt-4 w-full bg-amber-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-linear-to-r from-amber-500 to-amber-600 h-3 rounded-full transition-all duration-500" style={{width: `${leaveBalance ? (leaveBalance.personalDays.available / leaveBalance.personalDays.total * 100) : 0}%`}}></div>
                </div>
                <p className="text-xs text-amber-600 font-semibold mt-3 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  {leaveBalance ? Math.round(leaveBalance.personalDays.available / leaveBalance.personalDays.total * 100) : 0}% available
                </p>
              </div>
            </div>

            {/* Pending Approval */}
            <div className="group relative overflow-hidden rounded-3xl bg-white p-7 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-blue-100 hover:scale-[1.01]">
              <div className="absolute inset-0 bg-linear-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div className="p-4 bg-linear-to-br from-blue-600 to-blue-700 rounded-2xl transition-all duration-300 shadow-md hover:scale-110">
                    <Clock className="text-white" size={28} />
                  </div>
                  <span className="text-xs font-bold text-blue-900 bg-blue-100 px-3 py-1.5 rounded-full border border-blue-200">⏳ Soon</span>
                </div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Pending</p>
                <p className="text-5xl font-extrabold text-blue-900 mt-2 mb-4">{leaveBalance?.pendingRequests || 0}</p>
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-blue-600 font-semibold flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Requests awaiting approval
                  </p>
                  <p className="text-xs text-blue-500">{leaveBalance?.pendingRequests ? 'Review expected soon' : 'No pending requests'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Requests Table - Enhanced */}
      <div className="bg-white rounded-3xl border-2 border-moss-100 p-8 shadow-xl">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-moss-900 mb-3 flex items-center gap-3">
            <span className="w-2 h-8 bg-linear-to-b from-moss-500 to-moss-700 rounded-full"></span>
            Leave Requests
          </h2>
          <p className="text-moss-600">
            {canApprove ? 'Manage all employee leave requests and approvals' : 'Your leave request history and status'}
          </p>
        </div>
        <Table<LeaveRequest>
          columns={columns}
          data={leaves}
          loading={loading}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
        {totalLeaves > PAGE_SIZE && (
          <div className="mt-6">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(totalLeaves / PAGE_SIZE)}
              onPageChange={setPage}
              totalItems={totalLeaves}
              itemsPerPage={PAGE_SIZE}
            />
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={handleRejectCancel}
        title="Reject Leave Request"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Please provide a reason for rejecting this leave request:
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="w-full px-4 py-3 border text-gray-800 border-gray-300 rounded-lg focus:ring-2 focus:ring-moss-500 focus:border-transparent resize-none"
            rows={4}
            disabled={actionLoading}
          />
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={handleRejectCancel}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectConfirm}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              {actionLoading ? 'Rejecting...' : 'Reject Leave'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Leave Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={handleCloseDetails}
        title="Leave Request Details"
      >
        {selectedLeave && (
          <div className="space-y-6">
            {/* Employee Info */}
            <div className="bg-moss-50 rounded-lg p-4 border border-moss-200">
              <h3 className="text-sm font-bold text-moss-900 mb-3 uppercase tracking-wider">Employee Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-moss-600 mb-1">Employee Name</p>
                  <p className="text-sm font-semibold text-moss-900">{selectedLeave.employeeName}</p>
                </div>
                <div>
                  <p className="text-xs text-moss-600 mb-1">Leave Type</p>
                  <Badge variant="info" size="sm">{selectedLeave.leaveType}</Badge>
                </div>
              </div>
            </div>

            {/* Leave Period */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-bold text-blue-900 mb-3 uppercase tracking-wider">Leave Period</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-blue-600 mb-1">Start Date</p>
                  <p className="text-sm font-semibold text-blue-900">
                    {new Date(selectedLeave.startDate + 'T00:00:00Z').toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 mb-1">End Date</p>
                  <p className="text-sm font-semibold text-blue-900">
                    {new Date(selectedLeave.endDate + 'T00:00:00Z').toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-600 mb-1">Duration</p>
                <p className="text-sm font-semibold text-blue-900">
                  {Math.ceil((new Date(selectedLeave.endDate).getTime() - new Date(selectedLeave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                </p>
              </div>
            </div>

            {/* Reason */}
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h3 className="text-sm font-bold text-amber-900 mb-3 uppercase tracking-wider">Reason for Leave</h3>
              <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">{selectedLeave.reason}</p>
            </div>

            {/* Attachment */}
            {selectedLeave.attachment && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="text-sm font-bold text-purple-900 mb-3 uppercase tracking-wider">Attachment</h3>
                <a
                  href={selectedLeave.attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Attachment
                </a>
              </div>
            )}

            {/* Status */}
            <div className={`rounded-lg p-4 border ${
              selectedLeave.status === 'APPROVED' ? 'bg-green-50 border-green-200' :
              selectedLeave.status === 'REJECTED' ? 'bg-red-50 border-red-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <h3 className={`text-sm font-bold mb-3 uppercase tracking-wider ${
                selectedLeave.status === 'APPROVED' ? 'text-green-900' :
                selectedLeave.status === 'REJECTED' ? 'text-red-900' :
                'text-gray-900'
              }`}>Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Current Status:</span>
                  <StatusBadge status={selectedLeave.status} size="sm" />
                </div>
                {selectedLeave.approvedBy && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {selectedLeave.status === 'APPROVED' ? 'Approved by:' : 'Rejected by:'}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{selectedLeave.approvedBy}</span>
                  </div>
                )}
                {selectedLeave.approvalDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Date:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date(selectedLeave.approvalDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                {selectedLeave.rejectionReason && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs text-red-600 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-900 whitespace-pre-wrap">{selectedLeave.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="secondary" onClick={handleCloseDetails}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
