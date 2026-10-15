'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Clock, LogIn, LogOut, Calendar, CheckCircle, XCircle, AlertCircle, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, Column, Button, StatusBadge } from '@/components/ui';
import AttendanceConfirmationModal from '@/components/attendance/attendance-confirmation-modal';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  duration: number | null; // worked minutes
}

/** "2026-10" shifted by `delta` months, e.g. shiftMonth("2026-01", -1) === "2025-12". */
function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const d = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default function AttendancePage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<keyof AttendanceRecord>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'checkin' | 'checkout'>('checkin');
  const [isProcessing, setIsProcessing] = useState(false);
  // Company-timezone date (YYYY-MM-DD) reported by the backend
  const [today, setToday] = useState<string>('');
  // Month requested by the user (YYYY-MM, '' = current) and the month actually shown
  const [month, setMonth] = useState<string>('');
  const [viewedMonth, setViewedMonth] = useState<string>('');

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch one month of records ('' = current month). The backend says which date is
  // "today" in company time and always includes today's record for the check-in button.
  const loadRecords = useCallback(async () => {
    const [year, monthNumber] = month ? month.split('-') : [];
    const query = month ? `?year=${year}&month=${Number(monthNumber)}` : '';
    const response = await fetch(`/api/attendance${query}`);
    if (!response.ok) throw new Error(`Attendance request failed (${response.status})`);
    const data: {
      today: string;
      month: string;
      todayRecord: AttendanceRecord | null;
      records: AttendanceRecord[];
    } = await response.json();

    setRecords(data.records);
    setToday(data.today);
    setViewedMonth(data.month);

    // Checked in = today's record has a check-in and no check-out yet
    setCheckedIn(!!(data.todayRecord?.checkInTime && !data.todayRecord.checkOutTime));
  }, [month]);

  useEffect(() => {
    setLoading(true);
    loadRecords()
      .catch((error) => {
        console.error('Failed to fetch attendance records:', error);
        setRecords([]);
      })
      .finally(() => setLoading(false));
  }, [loadRecords]);

  const handleCheckInClick = () => {
    setConfirmAction('checkin');
    setShowConfirmModal(true);
  };

  const handleCheckOutClick = () => {
    setConfirmAction('checkout');
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/attendance/${confirmAction}`, { method: 'POST' });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to ${confirmAction === 'checkin' ? 'check in' : 'check out'}`);
      }

      await loadRecords();
      setShowConfirmModal(false);

      alert(confirmAction === 'checkin' ? '✓ Successfully checked in!' : '✓ Successfully checked out!');
    } catch (error) {
      console.error(`${confirmAction} failed:`, error);
      alert(error instanceof Error ? error.message : `Failed to ${confirmAction}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const sortedRecords = [...records].sort((a, b) => {
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (typeof aValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(String(bValue))
        : String(bValue).localeCompare(aValue);
    }
    return sortDirection === 'asc'
      ? Number(aValue) - Number(bValue)
      : Number(bValue) - Number(aValue);
  });

  const handleSort = (column: keyof AttendanceRecord) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Stats describe the month being viewed (the backend returns one month at a time)
  const thisMonthRecords = records;
  const monthLabel = viewedMonth
    ? new Date(`${viewedMonth}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    : '';

  const presentDays = thisMonthRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  const absentDays = thisMonthRecords.filter(r => r.status === 'ABSENT').length;
  const lateDays = thisMonthRecords.filter(r => r.status === 'LATE').length;
  
  // Calculate average hours per day (for records with duration)
  const recordsWithDuration = thisMonthRecords.filter(r => r.duration);
  const avgDuration = recordsWithDuration.length > 0
    ? recordsWithDuration.reduce((sum, r) => sum + (r.duration || 0), 0) / recordsWithDuration.length
    : 0;
  const avgHours = (avgDuration / 60).toFixed(1);
  
  // Calculate attendance rate
  const totalDays = thisMonthRecords.length;
  const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0';

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (value) =>
        // A calendar date, not an instant: format in UTC so it never shifts a day
        new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }),
    },
    {
      key: 'checkInTime',
      label: 'Check In',
      render: (value) => {
        if (!value) return '-';
        const time = new Date(value);
        return time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      },
    },
    {
      key: 'checkOutTime',
      label: 'Check Out',
      render: (value) => {
        if (!value) return '-';
        const time = new Date(value);
        return time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      },
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (value) => (value != null ? `${Math.floor(value / 60)}h ${value % 60}m` : '-'),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => <StatusBadge status={value} size="sm" />,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Confirmation Modal */}
      <AttendanceConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmAction}
        type={confirmAction}
        currentTime={currentTime}
      />

      {/* Header - Enhanced */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 p-8 rounded-3xl bg-linear-to-br from-moss-50 to-emerald-50 border-2 border-moss-100">
        <div className="flex-1">
          <div className="inline-block px-4 py-2 bg-moss-600 text-white rounded-full text-xs font-bold mb-3">
            ATTENDANCE MODULE
          </div>
          <h1 className="text-5xl font-extrabold bg-linear-to-r from-moss-900 to-moss-700 bg-clip-text text-transparent mb-3 pb-2">
            Attendance Tracking
          </h1>
          <p className="text-moss-600 text-lg">Monitor your daily presence and work hours</p>
        </div>
        <div className="text-right bg-white rounded-2xl p-6 shadow-lg border-2 border-moss-200">
          <p className="text-xs font-bold text-moss-800 uppercase tracking-wider mb-2">Current Rate</p>
          <p className="text-5xl font-extrabold text-moss-900">{attendanceRate}%</p>
          <p className="text-xs text-green-600 font-semibold mt-2 flex items-center justify-end gap-1">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            {totalDays > 0 ? (parseFloat(attendanceRate) >= 90 ? 'Excellent' : parseFloat(attendanceRate) >= 80 ? 'Good' : 'Needs Improvement') : 'No Data'}
          </p>
        </div>
      </div>

      {/* Check-in/Check-out Card - Redesigned */}
      <div className="relative overflow-hidden rounded-3xl p-10 text-white shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(74, 124, 89, 1) 0%, rgba(45, 80, 22, 1) 100%)',
        }}>
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="flex-1">
            <div className="inline-block px-3 py-1 bg-white bg-opacity-30 backdrop-blur-sm rounded-full text-xs font-semibold mb-4 text-moss-800 shadow-sm">
              Live Clock
            </div>
            <p className="text-white font-semibold text-sm uppercase tracking-wide mb-2">Current Time</p>
            <p className="text-7xl font-extrabold mt-2 mb-4 tracking-tight text-white">{currentTime}</p>
            <p className="text-white text-opacity-90 text-lg font-medium">
              {currentTime ? new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }) : ''}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {!checkedIn ? (
              <button
                onClick={handleCheckInClick}
                disabled={isProcessing}
                className="group px-8 py-5 bg-white text-moss-800 rounded-2xl font-bold text-lg hover:bg-moss-50 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn size={24} className="group-hover:translate-x-1 transition-transform" />
                Check In
              </button>
            ) : (
              <button
                onClick={handleCheckOutClick}
                disabled={isProcessing}
                className="group px-8 py-5 bg-red-500 text-white rounded-2xl font-bold text-lg hover:bg-red-600 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut size={24} className="group-hover:translate-x-1 transition-transform" />
                Check Out
              </button>
            )}
            <div className="px-6 py-5 bg-moss-800 bg-opacity-90 backdrop-blur-lg rounded-2xl border border-moss-700 text-center shadow-lg">
              <p className="text-xs font-semibold text-moss-200 uppercase mb-1">Status</p>
              <p className="text-2xl font-bold text-white">{checkedIn ? '✓ Active' : '○ Inactive'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Modern Card Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Present Days */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-moss-100">
          <div className="absolute inset-0 bg-linear-to-br from-moss-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-linear-to-br from-moss-600 to-moss-700 rounded-xl transition-transform hover:scale-110">
                <CheckCircle className="text-white" size={24} />
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">{presentDays > 0 ? '✓' : '—'}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-moss-600 uppercase tracking-wide">Present Days</p>
              <p className="text-4xl font-bold text-moss-900 mt-1">{presentDays}</p>
            </div>
            <p className="text-xs text-moss-500 font-medium">This month</p>
          </div>
        </div>

        {/* Absent Days */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-red-100">
          <div className="absolute inset-0 bg-linear-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-linear-to-br from-red-600 to-red-700 rounded-xl transition-transform hover:scale-110">
                <XCircle className="text-white" size={24} />
              </div>
              <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">{absentDays > 0 ? '⚠' : '✓'}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-600 uppercase tracking-wide">Absent Days</p>
              <p className="text-4xl font-bold text-red-900 mt-1">{absentDays}</p>
            </div>
            <p className="text-xs text-red-600 font-medium">{absentDays > 0 ? `In ${monthLabel}` : 'No absences'}</p>
          </div>
        </div>

        {/* Late Arrivals */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-amber-100">
          <div className="absolute inset-0 bg-linear-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-linear-to-br from-amber-600 to-amber-700 rounded-xl transition-transform hover:scale-110">
                <AlertCircle className="text-white" size={24} />
              </div>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">{lateDays > 0 ? '⚠' : '✓'}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide">Late Arrivals</p>
              <p className="text-4xl font-bold text-amber-900 mt-1">{lateDays}</p>
            </div>
            <p className="text-xs text-amber-600 font-medium">Times in {monthLabel}</p>
          </div>
        </div>

        {/* Avg Duration */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-emerald-100">
          <div className="absolute inset-0 bg-linear-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-linear-to-br from-emerald-600 to-emerald-700 rounded-xl transition-transform hover:scale-110">
                <TrendingUp className="text-white" size={24} />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{avgDuration > 0 ? '✓' : '—'}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Daily Average</p>
              <p className="text-4xl font-bold text-emerald-900 mt-1">{avgDuration > 0 ? `${avgHours}h` : '—'}</p>
            </div>
            <p className="text-xs text-emerald-600 font-medium">Per day average</p>
          </div>
        </div>
      </div>

      {/* Attendance Records Table - Enhanced */}
      <div className="bg-white rounded-3xl border-2 border-moss-100 p-8 shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-extrabold text-moss-900 flex items-center gap-3">
            <span className="w-2 h-8 bg-linear-to-b from-moss-500 to-moss-700 rounded-full"></span>
            Attendance History
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(viewedMonth, -1))}
              disabled={!viewedMonth || loading}
              className="p-2 rounded-full hover:bg-moss-100 text-moss-700 disabled:opacity-40"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-moss-900 bg-moss-100 px-4 py-2 rounded-full font-semibold border border-moss-200 min-w-36 text-center">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(viewedMonth, 1))}
              disabled={!viewedMonth || loading || viewedMonth >= today.slice(0, 7)}
              className="p-2 rounded-full hover:bg-moss-100 text-moss-700 disabled:opacity-40"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <Table<AttendanceRecord>
          columns={columns}
          data={sortedRecords}
          loading={loading}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </div>
    </div>
  );
}
