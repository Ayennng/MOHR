'use client';

import { useState } from 'react';
import { LogIn, LogOut, CheckCircle, AlertCircle, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { formatDate, formatMinutes, formatMonth, formatTime } from '@/lib/format';
import { sortRows, useSort } from '@/lib/sort';
import { Alert, Button, Card, Column, PageHeader, StatCard, StatusBadge, Table } from '@/components/ui';
import AttendanceConfirmationModal from '@/components/attendance/attendance-confirmation-modal';
import { LiveClock } from '@/components/attendance/live-clock';
import { Celebration } from '@/components/attendance/celebration';

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
  // Bumped on a successful check-in, which plays the celebration once
  const [celebrate, setCelebrate] = useState(0);

  const records = data?.records ?? [];
  const today = data?.todayRecord;
  const checkedIn = !!(today?.checkInTime && !today.checkOutTime);
  const doneForToday = !!today?.checkOutTime;
  const todayLabel = doneForToday ? 'Done' : checkedIn ? 'Checked in' : 'Not in yet';

  const handleConfirm = async () => {
    const action = confirming;
    setConfirming(null);
    setActionError(null);
    try {
      await api(`/api/attendance/${action}`, { method: 'POST' });
      if (action === 'checkin') setCelebrate((n) => n + 1);
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

      <section className="relative overflow-hidden rounded-card bg-mint-950 p-8 md:p-10 text-mint-100">
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-mint-300">Current time</p>
            <LiveClock className="font-display text-6xl md:text-7xl font-bold tabular-nums text-mint-200" />
            <LiveClock format="date" className="mt-3 text-lg text-mint-100/80" />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            {checkedIn ? (
              <Button size="lg" variant="danger" onClick={() => setConfirming('checkout')} className="px-8">
                <LogOut size={22} />
                Check Out
              </Button>
            ) : (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setConfirming('checkin')}
                disabled={doneForToday || !data}
                className="px-8"
              >
                <LogIn size={22} />
                Check In
              </Button>
            )}
            <div className="relative min-w-40 rounded-2xl border border-mint-100/15 bg-mint-100/10 px-6 py-3 text-center">
              <Celebration run={celebrate} />
              <p className="text-xs font-semibold uppercase tracking-wide text-mint-300">Today</p>
              <p key={todayLabel} className="font-display text-2xl font-bold text-mint-200 animate-pop">{todayLabel}</p>
            </div>
          </div>
        </div>
      </section>

      <Alert>{actionError}</Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger">
        <StatCard label="Days Attended" value={attended} icon={<CheckCircle size={22} />} tone="ink" hint={monthLabel} />
        <StatCard label="Late Arrivals" value={late} icon={<AlertCircle size={24} />} tone="amber" hint={`Check-ins after 09:30 in ${monthLabel}`} />
        <StatCard
          label="Daily Average"
          value={avgMinutes ? `${(avgMinutes / 60).toFixed(1)}h` : '-'}
          icon={<TrendingUp size={24} />}
          tone="mint"
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
              className="p-2 rounded-full hover:bg-mint-100 text-mint-700 disabled:opacity-40"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-mint-900 bg-mint-100 px-4 py-2 rounded-full font-semibold border border-mint-200 min-w-36 text-center">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => data && setMonth(shiftMonth(data.month, 1))}
              disabled={!data || loading || data.month >= data.today.slice(0, 7)}
              className="p-2 rounded-full hover:bg-mint-100 text-mint-700 disabled:opacity-40"
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
