'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Users,
  Calendar,
  Clock,
  DoorOpen,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useSidebar } from '@/components/dashboard/sidebar-context';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: Array<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>;
  badge?: boolean;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutGrid size={20} />,
    roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Employees',
    href: '/employees',
    icon: <Users size={20} />,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Leave Management',
    href: '/leave',
    icon: <Calendar size={20} />,
    roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
    badge: true,
  },
  {
    label: 'Attendance',
    href: '/attendance',
    icon: <Clock size={20} />,
    roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Room Booking',
    href: '/rooms',
    icon: <DoorOpen size={20} />,
    roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: <BarChart3 size={20} />,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings size={20} />,
    roles: ['ADMIN'],
  },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useSidebar();
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = session?.user?.role || 'EMPLOYEE';
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Fetch pending leave count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await fetch('/api/leave/pending-count');
        if (response.ok) {
          const data = await response.json();
          setPendingCount(data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching pending count:', error);
      }
    };

    if (session?.user?.id) {
      fetchPendingCount();
      // Refresh count every 30 seconds
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.id]);

  // Filter menu items based on user role
  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] flex flex-col z-30 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
      style={{
        background: 'linear-gradient(180deg, rgba(249, 253, 249, 0.95) 0%, rgba(240, 248, 242, 0.98) 100%)',
        backdropFilter: 'blur(12px)',
        borderRight: '2px solid rgba(74, 124, 89, 0.15)',
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
        transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3 top-8 bg-linear-to-br from-moss-500 to-moss-600 text-white rounded-full p-2 hover:from-moss-600 hover:to-moss-700 shadow-lg hover:shadow-xl z-50 transition-all duration-300 hover:scale-105"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-2 scrollbar-thin scrollbar-thumb-moss-300 scrollbar-track-transparent">
        <ul className="space-y-1.5">
          {visibleItems.map((item) => {
            // Sub-pages (e.g. /leave/request) keep their section highlighted
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href} className="relative group">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  className={`flex items-center h-12 ${
                    sidebarOpen 
                      ? 'w-full gap-3 px-4 rounded-xl' 
                      : 'w-12 rounded-xl mx-auto'
                  } ${
                    active
                      ? 'bg-linear-to-r from-moss-500 to-moss-600 text-white shadow-lg'
                      : 'text-moss-800 hover:bg-moss-50/50 hover:shadow-sm hover:scale-[1.02]'
                  } ${!sidebarOpen ? 'justify-center' : ''}`}
                >
                  <span
                    style={{
                      transition: 'color 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                      width: '20px',
                      height: '20px',
                    }}
                    className={`shrink-0 flex items-center justify-center ${
                      active ? 'text-white' : 'text-moss-600'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {sidebarOpen && (
                    <span 
                      style={{
                        transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      className={`text-sm font-semibold truncate flex-1 text-left whitespace-nowrap ${
                        active ? 'text-white' : 'text-moss-900'
                      }`}
                    >
                      {item.label}
                    </span>
                  )}
                  {item.badge && !active && sidebarOpen && pendingCount > 0 && (
                    <span 
                      style={{
                        transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      className="ml-auto text-xs bg-amber-500 text-white px-2 py-1 rounded-full font-bold"
                    >
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

      {/* Divider */}
      <div className="mx-3 h-px bg-linear-to-r from-transparent via-moss-300 to-transparent opacity-50"></div>

      {/* Footer - User Info & Logout */}
      <div className="p-2 relative">
        <style jsx>{`
          .profile-section {
            transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
          }

          .profile-card {
            height: 72px;
            transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
          }

          .profile-card:hover .avatar-circle {
            transform: scale(1.05);
          }

          .logout-btn {
            height: 48px;
            transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
          }

          .logout-btn:hover {
            transform: scale(1.02);
            box-shadow: 0 6px 12px rgba(239, 68, 68, 0.25);
          }

          .avatar-circle {
            width: 48px;
            height: 48px;
            flex-shrink: 0;
            transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
          }

          .user-info {
            transition: opacity 250ms cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            white-space: nowrap;
          }

          .logout-text {
            transition: opacity 250ms cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
          }
        `}</style>

        <div className="space-y-2 profile-section">
          {/* Profile Card */}
          <button
            onClick={() => router.push('/profile')}
            className={`rounded-xl flex items-center overflow-hidden hover:bg-moss-50/50 hover:shadow-sm hover:scale-[1.02] h-12 ${
              sidebarOpen ? 'px-3 gap-3 w-full' : 'w-12 mx-auto justify-center'
            }`}
          >
            <div className="avatar-circle bg-linear-to-br from-moss-500 to-moss-600 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-md" title={session?.user?.email?.split('@')[0] || 'User'}>
              {session?.user?.image ? (
                <img 
                  src={session.user.image} 
                  alt="Profile" 
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                session?.user?.email?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            {sidebarOpen && (
              <div className="user-info flex-1 min-w-0 text-left">
                <p className="font-semibold truncate text-moss-900 text-sm text-left">
                  {session?.user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-moss-700 text-xs mt-1 font-medium uppercase tracking-wide text-left">{userRole}</p>
              </div>
            )}
          </button>

          {/* Logout Button */}
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={`logout-btn flex items-center justify-center bg-linear-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg ${
            sidebarOpen ? 'w-full gap-2 px-4' : 'w-12 mx-auto'
          }`}>
            <LogOut size={18} className="shrink-0" />
            {sidebarOpen && (
              <span className="logout-text">Logout</span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
