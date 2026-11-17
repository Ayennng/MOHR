'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Calendar, Clock, DoorOpen, ArrowRight } from 'lucide-react';
import { useApi } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { Alert, SectionTitle, StatCard, Stats, buttonClass } from '@/components/ui';
import { LiveClock } from '@/components/attendance/live-clock';

interface DashboardStats {
  totalEmployees: number;
  pendingLeaves: number;
  absentToday: number;
  myBookingsToday: number;
}

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';

interface AttendanceMonth {
  today: string; // company-timezone date, YYYY-MM-DD
  todayRecord: { checkInTime: string | null; checkOutTime: string | null } | null;
  records: { date: string; status: AttendanceStatus }[];
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** Monday-to-Friday dates (YYYY-MM-DD) of the week that contains `day`. */
function workWeek(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  const offset = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0 = Monday
  return WEEKDAYS.map((_, i) => new Date(Date.UTC(y, m - 1, d - offset + i)).toISOString().slice(0, 10));
}

const DAY_STYLE: Record<AttendanceStatus, { cell: string; label: string }> = {
  PRESENT: { cell: 'bg-mint-400', label: 'In' },
  HALF_DAY: { cell: 'bg-mint-400/50', label: 'Half day' },
  LATE: { cell: 'bg-amber-300', label: 'Late' },
  ABSENT: { cell: 'bg-mint-100/10', label: 'Absent' },
};

const shortcuts = [
  { href: '/leave/request', title: 'Request leave', text: 'Send a request for approval', icon: <Calendar size={18} /> },
  { href: '/attendance', title: 'Attendance', text: 'Your records, check in and out', icon: <Clock size={18} /> },
  { href: '/rooms', title: 'Book a room', text: 'Find a free room and reserve it', icon: <DoorOpen size={18} /> },
];

/** The forest panel: the time, where the user stands today and their week so far. */
function TodayPanel() {
  const { data } = useApi<AttendanceMonth>('/api/attendance');
  const record = data?.todayRecord;
  const state = !data ? 'loading' : record?.checkOutTime ? 'done' : record?.checkInTime ? 'in' : 'out';

  const status = { loading: 'Checking', done: 'Done for today', in: 'Checked in', out: 'Not checked in' }[state];
  const detail =
    state === 'done' && record?.checkInTime && record.checkOutTime
      ? `In at ${formatTime(record.checkInTime)}, out at ${formatTime(record.checkOutTime)}`
      : state === 'in' && record?.checkInTime
        ? `Checked in at ${formatTime(record.checkInTime)}`
        : state === 'out'
          ? 'Check in when you start work'
          : ' ';

  const byDate = new Map(data?.records.map((r) => [r.date, r.status]));
  const week = data ? workWeek(data.today) : WEEKDAYS.map((d) => d);

  return (
    <section className="flex flex-col justify-between gap-10 rounded-panel bg-mint-950 p-6 text-mint-100 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-mint-300">Your day</p>
          <LiveClock className="mt-2 font-display text-5xl font-medium tracking-[-0.02em] tabular-nums text-mint-200 md:text-6xl" />
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-mint-100/10 px-3 py-1 text-[13px] text-mint-100">
          <span aria-hidden className={`size-1.5 rounded-full ${state === 'in' ? 'bg-mint-400' : 'bg-mint-100/40'}`} />
          {status}
        </span>
      </div>

      <ol className="grid grid-cols-5 gap-2" aria-label="This week">
        {week.map((date, i) => {
          const isToday = data?.today === date;
          const future = !!data && date > data.today;
          const day = byDate.get(date);
          const cell = !data
            ? 'bg-mint-100/10'
            : day
              ? DAY_STYLE[day].cell
              : future
                ? 'border border-dashed border-mint-100/20'
                : isToday
                  ? 'border border-mint-200/50'
                  : 'bg-mint-100/10';
          const label = day ? DAY_STYLE[day].label : future ? 'Coming up' : isToday ? 'Today' : 'No record';
          return (
            <li key={date}>
              <span aria-hidden className={`block h-10 rounded-lg ${cell}`} title={label} />
              <span className={`mt-2 block text-xs ${isToday ? 'font-medium text-mint-200' : 'text-mint-100/60'}`}>
                {WEEKDAYS[i]}
                <span className="sr-only">: {label}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-mint-100/75">{detail}</p>
        <Link href="/attendance" className={buttonClass('secondary')}>
          {state === 'out' ? 'Check in' : 'Open attendance'}
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: stats, error, loading } = useApi<DashboardStats>('/api/dashboard/stats');
  // The employee directory is only open to admins and managers
  const canViewEmployees = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';
  const value = (n?: number) => (loading ? '…' : (n ?? 0));

  return (
    <>
      <header>
        <LiveClock format="date" className="text-sm text-ink-500" />
        <h1 className="mt-1 text-3xl font-medium text-ink-900">Today</h1>
      </header>

      {error && <Alert>Failed to load dashboard data</Alert>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <TodayPanel />
        <Stats cols={2} className="auto-rows-fr">
          <StatCard
            label="Active employees"
            value={value(stats?.totalEmployees)}
            href={canViewEmployees ? '/employees' : undefined}
          />
          <StatCard
            label={canViewEmployees ? 'Leave to approve' : 'My pending requests'}
            value={value(stats?.pendingLeaves)}
            hint="Waiting for a decision"
            href="/leave"
          />
          <StatCard label="Absent today" value={value(stats?.absentToday)} hint="Not checked in, not on leave" />
          <StatCard label="My bookings today" value={value(stats?.myBookingsToday)} href="/rooms" />
        </Stats>
      </div>

      <section className="space-y-3">
        <SectionTitle>Shortcuts</SectionTitle>
        <div className="grid gap-px overflow-hidden rounded-card border border-ink-900/8 bg-ink-900/8 shadow-soft sm:grid-cols-3">
          {shortcuts.map((s) => (
            <Link key={s.href} href={s.href} className="group flex items-start gap-4 bg-white p-5 transition-colors duration-150 hover:bg-ink-50">
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-ink-100 text-ink-600">{s.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink-900">{s.title}</span>
                <span className="mt-0.5 block text-[13px] text-ink-500">{s.text}</span>
              </span>
              <ArrowRight
                size={16}
                className="mt-0.5 shrink-0 text-ink-300 transition-[transform,color] duration-150 ease-out-soft group-hover:translate-x-0.5 group-hover:text-ink-900"
              />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
