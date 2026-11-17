'use client';

import { useState } from 'react';
import { LogIn, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { formatDate, formatMinutes, formatMonth, formatTime } from '@/lib/format';
import { sortRows, useSort } from '@/lib/sort';
import { Alert, Button, Card, Column, PageHeader, StatCard, Stats, StatusBadge, Table } from '@/components/ui';
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
  { key: 'checkInTime', label: 'Check in', render: (r) => (r.checkInTime ? formatTime(r.checkInTime) : '-') },
  { key: 'checkOutTime', label: 'Check out', render: (r) => (r.checkOutTime ? formatTime(r.checkOutTime) : '-') },
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

      <PageHeader title="Attendance" description="Your check-ins and hours, month by month" />

      <section className="rounded-panel bg-mint-950 p-6 text-mint-100 md:p-8">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm text-mint-300">Current time</p>
            <LiveClock className="mt-2 font-display text-6xl font-medium tracking-[-0.02em] tabular-nums text-mint-200 md:text-7xl" />
            <LiveClock format="date" className="mt-3 text-[15px] text-mint-100/75" />
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative min-w-40 rounded-2xl border border-mint-100/12 px-5 py-3">
              <Celebration run={celebrate} />
              <p className="text-xs text-mint-300">Today</p>
              <p key={todayLabel} className="mt-0.5 font-display text-xl font-medium text-mint-200 animate-fade">
                {todayLabel}
              </p>
            </div>
            {checkedIn ? (
              <Button size="lg" variant="danger" onClick={() => setConfirming('checkout')} className="px-7">
                <LogOut size={18} />
                Check out
              </Button>
            ) : (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setConfirming('checkin')}
                disabled={doneForToday || !data}
                className="px-7"
              >
                <LogIn size={18} />
                Check in
              </Button>
            )}
          </div>
        </div>
      </section>

      <Alert>{actionError}</Alert>

      <Stats cols={3}>
        <StatCard label="Days attended" value={attended} hint={monthLabel || ' '} />
        <StatCard label="Late arrivals" value={late} hint={`Check-ins after 09:30${monthLabel ? ` in ${monthLabel}` : ''}`} />
        <StatCard
          label="Daily average"
          value={avgMinutes ? `${(avgMinutes / 60).toFixed(1)}h` : '-'}
          hint="Hours worked per completed day"
        />
      </Stats>

      <Card
        title="History"
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => data && setMonth(shiftMonth(data.month, -1))}
              disabled={!data || loading}
              className="grid size-8 place-items-center rounded-full text-ink-500 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900 disabled:opacity-40"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-32 text-center text-sm font-medium tabular-nums text-ink-900">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => data && setMonth(shiftMonth(data.month, 1))}
              disabled={!data || loading || data.month >= data.today.slice(0, 7)}
              className="grid size-8 place-items-center rounded-full text-ink-500 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-900 disabled:opacity-40"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
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
