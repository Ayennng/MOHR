'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LayoutGrid, Users, Calendar, Clock, DoorOpen, BarChart3, Settings, ChevronLeft } from 'lucide-react';
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
// Each item is h-12 with a 6px gap; the active pill slides by this much per item
const ITEM_STEP_PX = 54;

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

  const items = navItems.filter((item) => item.roles.includes(role));
  // Sub-pages (e.g. /leave/request) keep their section highlighted
  const activeIndex = items.findIndex((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <aside
      className={`fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] border-r border-mint-900/8 bg-white transition-[width] duration-300 ease-out-soft ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3.5 top-7 z-10 grid size-7 place-items-center rounded-full border border-mint-900/10 bg-white text-mint-800 shadow-soft transition-[transform,background-color] duration-200 ease-out-soft hover:bg-mint-100 active:scale-90"
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <ChevronLeft size={16} className={`transition-transform duration-300 ease-out-soft ${sidebarOpen ? '' : 'rotate-180'}`} />
      </button>

      <nav className="h-full overflow-y-auto overflow-x-hidden px-3 py-6">
        <ul className="relative space-y-1.5">
          {/* The mint pill behind the active item, sliding from item to item */}
          {activeIndex >= 0 && (
            <li
              aria-hidden
              className="absolute inset-x-0 top-0 h-12 rounded-2xl bg-mint-200 transition-transform duration-300 ease-out-soft"
              style={{ transform: `translateY(${activeIndex * ITEM_STEP_PX}px)` }}
            />
          )}
          {items.map((item, i) => {
            const active = i === activeIndex;
            return (
              <li key={item.href} className="group relative">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex h-12 items-center gap-3 rounded-2xl px-3.5 transition-colors duration-200 ${
                    active ? 'text-mint-950' : 'text-mint-800 hover:bg-mint-50 hover:text-mint-950'
                  } ${sidebarOpen ? '' : 'justify-center'}`}
                >
                  <span className={`shrink-0 transition-transform duration-200 ease-out-soft ${active ? '' : 'group-hover:scale-110'}`}>
                    {item.icon}
                  </span>
                  {sidebarOpen && <span className="flex-1 truncate text-sm font-semibold">{item.label}</span>}
                  {item.badge && pendingCount > 0 && (
                    <span
                      className={`grid min-w-5 h-5 place-items-center rounded-full bg-mint-900 px-1.5 text-[11px] font-bold text-mint-200 animate-pop ${
                        sidebarOpen ? '' : 'absolute right-1.5 top-1.5'
                      }`}
                    >
                      {pendingCount}
                    </span>
                  )}
                </Link>
                {!sidebarOpen && (
                  <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 -translate-x-1 whitespace-nowrap rounded-lg bg-mint-950 px-3 py-1.5 text-xs font-medium text-mint-100 opacity-0 shadow-lift transition-[opacity,transform] duration-200 ease-out-soft group-hover:translate-x-0 group-hover:opacity-100">
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
