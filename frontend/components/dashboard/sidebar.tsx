'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LayoutGrid, Users, Calendar, Clock, DoorOpen, BarChart3, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Role } from '@/lib/auth';
import { api } from '@/lib/api';
import { useSidebar } from '@/components/dashboard/sidebar-context';

const ALL: Role[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
const APPROVERS: Role[] = ['ADMIN', 'MANAGER'];

const navItems: { label: string; href: string; icon: React.ReactNode; roles: Role[]; badge?: boolean }[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutGrid size={20} />, roles: ALL },
  { label: 'Employees', href: '/employees', icon: <Users size={20} />, roles: APPROVERS },
  { label: 'Leave Management', href: '/leave', icon: <Calendar size={20} />, roles: ALL, badge: true },
  { label: 'Attendance', href: '/attendance', icon: <Clock size={20} />, roles: ALL },
  { label: 'Room Booking', href: '/rooms', icon: <DoorOpen size={20} />, roles: ALL },
  { label: 'Reports', href: '/reports', icon: <BarChart3 size={20} />, roles: APPROVERS },
  { label: 'Settings', href: '/settings', icon: <Settings size={20} />, roles: ['ADMIN'] },
];

const PENDING_REFRESH_MS = 30_000;

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useSidebar();
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? 'EMPLOYEE';
  const userId = session?.user?.id;
  const [pendingCount, setPendingCount] = useState(0);

  // Leave badge: requests awaiting approval (approvers) or recently decided (employees)
  useEffect(() => {
    if (!userId) return;
    const refresh = () =>
      api<{ count: number }>('/api/leave/pending-count')
        .then((data) => setPendingCount(data.count))
        .catch(() => {});
    refresh();
    const interval = setInterval(refresh, PENDING_REFRESH_MS);
    return () => clearInterval(interval);
  }, [userId]);

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] z-30 bg-linear-to-b from-moss-50/95 to-moss-100/95 backdrop-blur-md border-r-2 border-moss-500/15 shadow-sm transition-[width] duration-400 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3 top-8 z-50 rounded-full p-2 bg-linear-to-br from-moss-500 to-moss-600 text-white shadow-lg hover:scale-105 transition-transform"
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <nav className="h-full overflow-y-auto overflow-x-hidden py-6 px-2">
        <ul className="space-y-1.5">
          {navItems
            .filter((item) => item.roles.includes(role))
            .map((item) => {
              // Sub-pages (e.g. /leave/request) keep their section highlighted
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center h-12 rounded-xl transition-all ${
                      sidebarOpen ? 'w-full gap-3 px-4' : 'w-12 mx-auto justify-center'
                    } ${
                      active
                        ? 'bg-linear-to-r from-moss-500 to-moss-600 text-white shadow-lg'
                        : 'text-moss-600 hover:bg-moss-50/50 hover:shadow-sm hover:scale-[1.02]'
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {sidebarOpen && (
                      <span className={`flex-1 truncate text-sm font-semibold ${active ? 'text-white' : 'text-moss-900'}`}>
                        {item.label}
                      </span>
                    )}
                    {item.badge && !active && sidebarOpen && pendingCount > 0 && (
                      <span className="ml-auto text-xs bg-amber-500 text-white px-2 py-1 rounded-full font-bold">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-moss-900 text-white text-xs py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                      {item.label}
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      </nav>
    </aside>
  );
}
