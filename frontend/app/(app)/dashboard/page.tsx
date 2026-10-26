'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Users, Calendar, Clock, DoorOpen, ArrowRight } from 'lucide-react';
import { useApi } from '@/lib/api';
import { Alert, StatCard } from '@/components/ui';
import { LiveClock } from '@/components/attendance/live-clock';

interface DashboardStats {
  totalEmployees: number;
  pendingLeaves: number;
  absentToday: number;
  myBookingsToday: number;
}

const quickActions = [
  {
    href: '/leave/request',
    title: 'Request Leave',
    text: 'Submit a new leave request for approval',
    cta: 'New Request',
    icon: <Calendar size={32} />,
    colors: 'from-moss-100 to-moss-200 text-moss-600',
  },
  {
    href: '/attendance',
    title: 'Attendance',
    text: 'View attendance records and check in',
    cta: 'View Attendance',
    icon: <Clock size={32} />,
    colors: 'from-emerald-100 to-emerald-200 text-emerald-600',
  },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: stats, error, loading } = useApi<DashboardStats>('/api/dashboard/stats');
  // The employee directory is only open to admins and managers
  const canViewEmployees = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';
  const value = (n?: number) => (loading ? '…' : (n ?? 0));

  return (
    <>
      <div className="rounded-3xl p-10 shadow-2xl bg-linear-to-br from-moss-500 to-moss-800 text-white">
        <LiveClock format="date" className="inline-block px-4 py-2 mb-4 rounded-full bg-white/20 text-sm font-semibold" />
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight">
          Welcome back, {session?.user?.name || 'User'}!
        </h1>
        <p className="text-white/90 text-lg">Here&apos;s your HR overview for today</p>
      </div>

      {error && <Alert>Failed to load dashboard data</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Active Employees"
          value={value(stats?.totalEmployees)}
          icon={<Users size={24} />}
          href={canViewEmployees ? '/employees' : undefined}
        />
        <StatCard
          label={canViewEmployees ? 'Pending Leave Requests' : 'My Pending Requests'}
          value={value(stats?.pendingLeaves)}
          icon={<Calendar size={24} />}
          tone="blue"
          href="/leave"
        />
        <StatCard
          label="Absent Today"
          value={value(stats?.absentToday)}
          icon={<Clock size={24} />}
          tone="amber"
          hint="Not checked in and not on leave"
        />
        <StatCard
          label="My Bookings Today"
          value={value(stats?.myBookingsToday)}
          icon={<DoorOpen size={24} />}
          tone="red"
          href="/rooms"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group bg-white rounded-2xl border-2 border-moss-100 p-8 shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-moss-900 mb-2">{action.title}</h3>
                <p className="text-sm text-moss-600">{action.text}</p>
              </div>
              <div className={`p-4 rounded-2xl bg-linear-to-br ${action.colors}`}>{action.icon}</div>
            </div>
            <span className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-moss-500 to-moss-600 text-white rounded-xl font-semibold shadow-md">
              {action.cta} <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
