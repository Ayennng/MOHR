'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Users, Calendar, Clock, DoorOpen, ArrowRight, LogIn, CheckCircle2 } from 'lucide-react';
import { useApi } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { Alert, StatCard } from '@/components/ui';
import { LiveClock } from '@/components/attendance/live-clock';

interface DashboardStats {
  totalEmployees: number;
  pendingLeaves: number;
  absentToday: number;
  myBookingsToday: number;
}

interface TodayAttendance {
  todayRecord: { checkInTime: string | null; checkOutTime: string | null } | null;
}

const quickActions = [
  { href: '/leave/request', title: 'Request Leave', text: 'Submit a new leave request for approval', icon: <Calendar size={26} /> },
  { href: '/attendance', title: 'Attendance', text: 'View your records and check in or out', icon: <Clock size={26} /> },
  { href: '/rooms', title: 'Book a Room', text: 'Find a free meeting room and reserve it', icon: <DoorOpen size={26} /> },
];

/** Where the signed-in user stands today: checked in, done, or not in yet. */
function TodayStatus() {
  const { data } = useApi<TodayAttendance>('/api/attendance');
  const today = data?.todayRecord;

  const [icon, title, detail] = !data
    ? [<Clock key="i" size={22} />, 'Checking today...', ' ']
    : today?.checkOutTime
      ? [<CheckCircle2 key="i" size={22} />, 'Done for today', `Out at ${formatTime(today.checkOutTime)}`]
      : today?.checkInTime
        ? [<CheckCircle2 key="i" size={22} />, 'You are checked in', `Since ${formatTime(today.checkInTime)}`]
        : [<LogIn key="i" size={22} />, 'Not checked in yet', 'Tap to check in'];

  return (
    <Link
      href="/attendance"
      className="group flex items-center gap-4 rounded-2xl bg-white/70 p-4 pr-5 shadow-soft transition-[transform,box-shadow,background-color] duration-200 ease-out-soft hover:-translate-y-0.5 hover:bg-white hover:shadow-lift"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-mint-900 text-mint-200">{icon}</span>
      <span>
        <span className="block font-semibold text-mint-950">{title}</span>
        <span className="block text-sm text-mint-800">{detail}</span>
      </span>
      <ArrowRight size={18} className="ml-auto text-mint-800 transition-transform duration-200 ease-out-soft group-hover:translate-x-1" />
    </Link>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: stats, error, loading } = useApi<DashboardStats>('/api/dashboard/stats');
  // The employee directory is only open to admins and managers
  const canViewEmployees = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';
  const value = (n?: number) => (loading ? '…' : (n ?? 0));
  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  return (
    <>
      <section className="relative overflow-hidden rounded-card bg-mint-200 p-8 md:p-10">
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <LiveClock
              format="date"
              className="mb-5 inline-block rounded-full bg-mint-900 px-3.5 py-1.5 text-xs font-semibold text-mint-200"
            />
            <h1 className="text-4xl md:text-6xl font-bold text-mint-950">Welcome back, {firstName}</h1>
            <p className="mt-3 text-lg text-mint-800">Here&apos;s how today looks across MoHR.</p>
          </div>
          <div className="lg:w-80">
            <TodayStatus />
          </div>
        </div>
      </section>

      {error && <Alert>Failed to load dashboard data</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
        <StatCard
          label="Active Employees"
          value={value(stats?.totalEmployees)}
          icon={<Users size={22} />}
          tone="ink"
          href={canViewEmployees ? '/employees' : undefined}
        />
        <StatCard
          label={canViewEmployees ? 'Pending Leave Requests' : 'My Pending Requests'}
          value={value(stats?.pendingLeaves)}
          icon={<Calendar size={22} />}
          tone="sky"
          href="/leave"
        />
        <StatCard
          label="Absent Today"
          value={value(stats?.absentToday)}
          icon={<Clock size={22} />}
          tone="amber"
          hint="Not checked in and not on leave"
        />
        <StatCard
          label="My Bookings Today"
          value={value(stats?.myBookingsToday)}
          icon={<DoorOpen size={22} />}
          tone="mint"
          href="/rooms"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-card border border-mint-900/8 bg-white p-6 shadow-soft transition-[transform,box-shadow] duration-200 ease-out-soft hover:-translate-y-1 hover:shadow-lift"
          >
            <div className="mb-8 grid size-12 place-items-center rounded-2xl bg-mint-100 text-mint-800 transition-[transform,background-color] duration-300 ease-pop group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-mint-200">
              {action.icon}
            </div>
            <h3 className="text-xl font-bold text-mint-950">{action.title}</h3>
            <p className="mt-1 text-sm text-mint-700">{action.text}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-mint-900">
              Open
              <ArrowRight size={16} className="transition-transform duration-200 ease-out-soft group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
