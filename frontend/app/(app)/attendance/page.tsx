'use client';

import { useState } from 'react';
import { LogIn, LogOut, CheckCircle, AlertCircle, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { formatDate, formatMinutes, formatMonth, formatTime } from '@/lib/format';
import { sortRows, useSort } from '@/lib/sort';
import { Alert, Card, Column, PageHeader, StatCard, StatusBadge, Table } from '@/components/ui';
import AttendanceConfirmationModal from '@/components/attendance/attendance-confirmation-modal';
import { LiveClock } from '@/components/attendance/live-clock';

interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  duration: number | null; // worked minutes
}

interface AttendanceMonth {
  today: string; // company-timezone date
  month: string; // YYYY-MM actually shown
  todayRecord: AttendanceRecord | null;
  records: AttendanceRecord[];
}

/** "2026-10" shifted by `delta` months, e.g. shiftMonth("2026-01", -1) === "2025-12". */
function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7);
}

const columns: Column<AttendanceRecord>[] = [
  { key: 'date', label: 'Date', sortable: true, render: (r) => formatDate(r.date) },
  { key: 'checkInTime', label: 'Check In', render: (r) => (r.checkInTime ? formatTime(r.checkInTime) : '-') },
  { key: 'checkOutTime', label: 'Check Out', render: (r) => (r.checkOutTime ? formatTime(r.checkOutTime) : '-') },
  { key: 'duration', label: 'Duration', sortable: true, render: (r) => (r.duration != null ? formatMinutes(r.duration) : '-') },
  { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
];

export default function AttendancePage() {
  // Month requested by the user (YYYY-MM); null = the current month, which the backend picks
  const [month, setMonth] = useState<string | null>(null);
  const query = month ? `?year=${month.slice(0, 4)}&month=${Number(month.slice(5))}` : '';
  const { data, error, loading, reload } = useApi<AttendanceMonth>(`/api/attendance${query}`);
  const sort = useSort('date', 'desc');
  const [confirming, setConfirming] = useState<'checkin' | 'checkout' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const records = data?.records ?? [];
  const today = data?.todayRecord;
  const checkedIn = !!(today?.checkInTime && !today.checkOutTime);
  const doneForToday = !!today?.checkOutTime;

  const handleConfirm = async () => {
    const action = confirming;
    setConfirming(null);
    setActionError(null);
    try {
      await api(`/api/attendance/${action}`, { method: 'POST' });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const attended = records.filter((r) => r.status !== 'ABSENT').length;
  const late = records.filter((r) => r.status === 'LATE').length;
  const worked = records.filter((r) => r.duration);
  const avgMinutes = worked.length ? worked.reduce((sum, r) => sum + (r.duration ?? 0), 0) / worked.length : 0;
  const monthLabel = data ? formatMonth(data.month) : '';

  return (
    <>
      <AttendanceConfirmationModal type={confirming} onClose={() => setConfirming(null)} onConfirm={handleConfirm} />

      <PageHeader eyebrow="Attendance" title="Attendance Tracking" description="Monitor your daily presence and work hours" />

      <div className="rounded-3xl p-10 text-white shadow-2xl bg-linear-to-br from-moss-500 to-moss-800">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <p className="font-semibold text-sm uppercase tracking-wide mb-2">Current Time</p>
            <LiveClock className="text-6xl md:text-7xl font-extrabold mb-4 tracking-tight" />
            <LiveClock format="date" className="text-white/90 text-lg font-medium" />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {checkedIn ? (
              <button
                type="button"
                onClick={() => setConfirming('checkout')}
                className="px-8 py-5 bg-red-500 text-white rounded-2xl font-bold text-lg hover:bg-red-600 transition-all shadow-xl hover:scale-[1.02] flex items-center gap-3"
              >
                <LogOut size={24} />
                Check Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming('checkin')}
                disabled={doneForToday || !data}
                className="px-8 py-5 bg-white text-moss-800 rounded-2xl font-bold text-lg hover:bg-moss-50 transition-all shadow-xl hover:scale-[1.02] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <LogIn size={24} />
                Check In
              </button>
            )}
            <div className="px-6 py-5 bg-moss-800/90 rounded-2xl border border-moss-700 text-center shadow-lg">
              <p className="text-xs font-semibold text-moss-200 uppercase mb-1">Today</p>
              <p className="text-2xl font-bold">{doneForToday ? 'Done' : checkedIn ? 'Checked in' : 'Not in yet'}</p>
            </div>
          </div>
        </div>
      </div>

      <Alert>{actionError}</Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Days Attended" value={attended} icon={<CheckCircle size={24} />} hint={monthLabel} />
        <StatCard label="Late Arrivals" value={late} icon={<AlertCircle size={24} />} tone="amber" hint={`Check-ins after 09:30 in ${monthLabel}`} />
        <StatCard
          label="Daily Average"
          value={avgMinutes ? `${(avgMinutes / 60).toFixed(1)}h` : '—'}
          icon={<TrendingUp size={24} />}
          tone="emerald"
          hint="Hours worked per completed day"
        />
      </div>

      <Card
        title="Attendance History"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => data && setMonth(shiftMonth(data.month, -1))}
              disabled={!data || loading}
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
              onClick={() => data && setMonth(shiftMonth(data.month, 1))}
              disabled={!data || loading || data.month >= data.today.slice(0, 7)}
              className="p-2 rounded-full hover:bg-moss-100 text-moss-700 disabled:opacity-40"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        }
      >
        {error && <Alert>Failed to load attendance: {error}</Alert>}
        <Table
          columns={columns}
          data={sortRows(records, sort.column, sort.direction)}
          loading={loading}
          sortColumn={sort.column}
          sortDirection={sort.direction}
          onSort={sort.toggle}
          emptyText="No attendance recorded this month"
        />
      </Card>
    </>
  );
}
