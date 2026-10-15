'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Users,
  Calendar,
  Clock,
  DoorOpen,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { useDashboard } from './DashboardContext';

// Import all page content as components
import AttendancePage from '../attendance/page';
import LeavePage from '../leave/page';
import EmployeesPage from '../employees/page';
import RoomsPage from '../rooms/page';
import ReportsPage from '../reports/page';
import SettingsPage from '../settings/page';

interface DashboardStats {
  totalEmployees: number;
  pendingLeaveRequests: number;
  absentToday: number;
  roomsBooked: number;
}

interface StatCard {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'moss' | 'sage' | 'amber' | 'red' | 'blue';
  panel?: string;
}

const colorClasses = {
  moss: 'bg-moss-50 text-moss-900 border-moss-200',
  sage: 'bg-sage-50 text-sage-900 border-sage-200',
  amber: 'bg-amber-50 text-amber-900 border-amber-200',
  red: 'bg-red-50 text-red-900 border-red-200',
  blue: 'bg-blue-50 text-blue-900 border-blue-200',
};

const iconColors = {
  moss: 'text-white',
  sage: 'text-white',
  amber: 'text-white',
  red: 'text-white',
  blue: 'text-white',
};

function DashboardHome() {
  const { data: session } = useSession();
  const { setActivePanel } = useDashboard();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    pendingLeaveRequests: 0,
    absentToday: 0,
    roomsBooked: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);

        // Fetch dashboard stats from frontend API route
        const statsResponse = await fetch('/api/dashboard/stats');
        if (!statsResponse.ok) throw new Error(`Dashboard stats failed (${statsResponse.status})`);
        const data = await statsResponse.json();

        setStats({
          totalEmployees: data.totalEmployees || 0,
          pendingLeaveRequests: data.pendingLeaves || 0,
          absentToday: data.absentToday || 0,
          roomsBooked: data.myBookingsToday || 0,
        });
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
        // Set to zero if error
        setStats({
          totalEmployees: 0,
          pendingLeaveRequests: 0,
          absentToday: 0,
          roomsBooked: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards: StatCard[] = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      icon: <Users size={28} />,
      color: 'moss',
      panel: 'employees',
    },
    {
      title: 'Pending Leave Requests',
      value: stats.pendingLeaveRequests,
      icon: <Calendar size={28} />,
      color: 'blue',
      panel: 'leave',
    },
    {
      title: 'Absent Today',
      value: stats.absentToday,
      icon: <Clock size={28} />,
      color: 'amber',
      panel: 'attendance',
    },
    {
      title: 'Rooms Booked Today',
      value: stats.roomsBooked,
      icon: <DoorOpen size={28} />,
      color: 'red',
      panel: 'rooms',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-3xl p-10 shadow-2xl" style={{
        background: 'linear-gradient(135deg, rgba(74, 124, 89, 1) 0%, rgba(45, 80, 22, 1) 100%)',
      }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="inline-block px-4 py-2 bg-[#FE9A00] bg-opacity-20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4 text-white">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-5xl font-extrabold mb-3 tracking-tight text-white">
              Welcome back, {session?.user?.name || 'User'}! 👋
            </h1>
            <p className="text-white text-opacity-90 text-lg">
              Here's your HR dashboard overview for today
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="w-24 h-24 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-lg border border-white border-opacity-30 shadow-xl">
              <TrendingUp size={48} strokeWidth={2.5} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-5 text-red-700 shadow-sm">
          <p className="font-semibold">⚠ Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <button
            key={card.title}
            onClick={() => card.panel && setActivePanel(card.panel as any)}
            className={`group relative h-full border-2 rounded-2xl p-7 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden text-left ${
              colorClasses[card.color]
            }`}
          >
            <div className="absolute inset-0 bg-linear-to-br from-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity"></div>
            
            <div className="relative flex items-start justify-between mb-6">
              <div className={`p-4 rounded-2xl group-hover:scale-105 transition-transform duration-300 ${
                card.color === 'moss' ? 'bg-moss-500' :
                card.color === 'sage' ? 'bg-sage-500' :
                card.color === 'amber' ? 'bg-amber-500' :
                card.color === 'blue' ? 'bg-blue-500' :
                'bg-red-500'
              }`}>
                <span className={`${iconColors[card.color]}`}>{card.icon}</span>
              </div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <h3 className="relative text-xs font-bold text-moss-700 mb-3 uppercase tracking-wider">
              {card.title}
            </h3>
            <p className="relative text-5xl font-extrabold text-moss-900 mb-2">{card.value}</p>
            <div className="relative flex items-center gap-2 text-green-600">
              <span className="text-sm font-semibold">↑ Active</span>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-3xl font-extrabold text-moss-900 mb-8 flex items-center gap-3">
          <span className="w-2 h-8 bg-linear-to-b from-moss-500 to-moss-700 rounded-full"></span>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <button
            onClick={() => setActivePanel('leave')}
            className="relative group bg-white rounded-2xl border-2 border-moss-100 p-8 shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-300 overflow-hidden text-left"
          >
            <div className="absolute inset-0 bg-linear-to-br from-moss-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-moss-900 mb-2">Request Leave</h3>
                <p className="text-sm text-moss-600">
                  Submit a new leave request for approval
                </p>
              </div>
              <div className="p-4 bg-linear-to-br from-moss-100 to-moss-200 rounded-2xl group-hover:scale-105 transition-all duration-300">
                <Calendar className="text-moss-600" size={32} />
              </div>
            </div>
            <span className="relative inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-moss-500 to-moss-600 text-white rounded-xl font-semibold hover:from-moss-600 hover:to-moss-700 transition-all shadow-md hover:shadow-lg">
              New Request <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </span>
          </button>

          <button
            onClick={() => setActivePanel('attendance')}
            className="relative group bg-white rounded-2xl border-2 border-moss-100 p-8 shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-300 overflow-hidden text-left"
          >
            <div className="absolute inset-0 bg-linear-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-moss-900 mb-2">Attendance</h3>
                <p className="text-sm text-moss-600">
                  View attendance records and check-in
                </p>
              </div>
              <div className="p-4 bg-linear-to-br from-emerald-100 to-emerald-200 rounded-2xl group-hover:scale-105 transition-all duration-300">
                <Clock className="text-emerald-600" size={32} />
              </div>
            </div>
            <span className="relative inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg">
              View Attendance <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border-2 border-moss-100 p-8 shadow-lg">
        <h2 className="text-3xl font-extrabold text-moss-900 mb-8 flex items-center gap-3">
          <span className="w-2 h-8 bg-linear-to-b from-moss-500 to-moss-700 rounded-full"></span>
          Recent Activity
        </h2>
        <div className="flex items-center justify-center h-48 bg-linear-to-br from-moss-50 to-emerald-50 rounded-2xl border-2 border-dashed border-moss-200">
          <div className="text-center">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-moss-600 text-xl font-semibold">Activity feed coming soon</p>
            <p className="text-moss-500 text-sm mt-2">Latest HR actions will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { activePanel } = useDashboard();

  const renderPanel = () => {
    switch (activePanel) {
      case 'home':
        return <DashboardHome />;
      case 'attendance':
        return <AttendancePage />;
      case 'leave':
        return <LeavePage />;
      case 'employees':
        return <EmployeesPage />;
      case 'rooms':
        return <RoomsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardHome />;
    }
  };

  return <div>{renderPanel()}</div>;
}
