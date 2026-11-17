'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LayoutGrid, Users, Calendar, Clock, DoorOpen, BarChart3, Settings, ChevronLeft, Leaf } from 'lucide-react';
import type { Role } from '@/lib/auth';
import { api } from '@/lib/api';
import { useSidebar } from '@/components/dashboard/sidebar-context';
import { AccountMenu } from '@/components/dashboard/account-menu';

const ALL: Role[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
const APPROVERS: Role[] = ['ADMIN', 'MANAGER'];

const navItems: { label: string; href: string; icon: React.ReactNode; roles: Role[]; badge?: boolean }[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutGrid size={18} />, roles: ALL },
  { label: 'Employees', href: '/employees', icon: <Users size={18} />, roles: APPROVERS },
  { label: 'Leave', href: '/leave', icon: <Calendar size={18} />, roles: ALL, badge: true },
  { label: 'Attendance', href: '/attendance', icon: <Clock size={18} />, roles: ALL },
  { label: 'Room booking', href: '/rooms', icon: <DoorOpen size={18} />, roles: ALL },
  { label: 'Reports', href: '/reports', icon: <BarChart3 size={18} />, roles: APPROVERS },
  { label: 'Settings', href: '/settings', icon: <Settings size={18} />, roles: ['ADMIN'] },
];

const PENDING_REFRESH_MS = 30_000;
// Each item is h-9 with a 2px gap; the active pill slides by this much per item
const ITEM_STEP_PX = 38;

/**
 * Full-height sidebar: the leaf mark, the navigation and the account menu. The mint
 * pill behind the current page is the one place green fills a surface in the chrome.
 * Icon centres sit 36px from the left edge whether it is open (248px) or not (72px).
 */
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
      className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-ink-900/8 bg-white transition-[width] duration-300 ease-out-soft ${
        sidebarOpen ? 'w-62' : 'w-18'
      }`}
    >
      <div className="flex h-16 shrink-0 items-center px-3">
        <Link href="/dashboard" className="flex items-center rounded-xl" aria-label="MoHR dashboard">
          <span className="grid w-12 shrink-0 place-items-center">
            <span className="grid size-8 place-items-center rounded-[10px] bg-mint-200 text-mint-900">
              <Leaf size={18} />
            </span>
          </span>
          {sidebarOpen && <span className="font-display text-lg font-semibold tracking-[-0.01em] text-ink-900">MoHR</span>}
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3 top-5 z-10 grid size-6 place-items-center rounded-full border border-ink-900/10 bg-white text-ink-500 shadow-soft transition-[transform,background-color,color] duration-150 ease-out-soft hover:bg-ink-50 hover:text-ink-900 active:scale-90"
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <ChevronLeft size={14} className={`transition-transform duration-300 ease-out-soft ${sidebarOpen ? '' : 'rotate-180'}`} />
      </button>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-4">
        <ul className="relative space-y-0.5">
          {/* The mint pill behind the active item, sliding from item to item */}
          {activeIndex >= 0 && (
            <li
              aria-hidden
              className="absolute inset-x-0 top-0 h-9 rounded-full bg-mint-200 transition-transform duration-300 ease-out-soft"
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
                  className={`relative flex h-9 items-center gap-2.5 rounded-full text-sm transition-colors duration-150 ${
                    active ? 'font-medium text-mint-950' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                  } ${sidebarOpen ? 'px-[15px]' : 'justify-center'}`}
                >
                  <span className={`shrink-0 ${active ? 'text-mint-900' : 'text-ink-500 group-hover:text-ink-900'}`}>
                    {item.icon}
                  </span>
                  {sidebarOpen && <span className="flex-1 truncate">{item.label}</span>}
                  {item.badge && pendingCount > 0 && (
                    <span
                      className={`grid h-5 min-w-5 place-items-center rounded-full bg-mint-900 px-1.5 text-[11px] font-semibold tabular-nums text-mint-200 animate-pop ${
                        sidebarOpen ? '' : 'absolute right-0.5 top-0'
                      }`}
                    >
                      {pendingCount}
                    </span>
                  )}
                </Link>
                {!sidebarOpen && (
                  <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lift transition-[opacity,transform] duration-150 ease-out-soft group-hover:translate-x-0 group-hover:opacity-100">
                    {item.label}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-ink-900/8 p-3">
        <AccountMenu expanded={sidebarOpen} />
      </div>
    </aside>
  );
}
