'use client';

import { useState } from 'react';
import { BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';
import { useApi } from '@/lib/api';
import { Alert, Card, PageHeader, PageSpinner, StatCard } from '@/components/ui';

interface ReportData {
  metrics: {
    totalEmployees: number;
    newHires: number;
    avgAttendance: number;
    pendingLeaves: number;
    departmentCount: number;
  };
  departmentStats: { name: string; count: number; percentage: number }[];
  weeklyTrend: { day: string; date: string; rate: number }[];
  leaveStats: { approved: number; pending: number; rejected: number; cancelled: number };
}

const PERIODS = [
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last Month' },
  { value: 'quarter', label: 'Last Quarter' },
  { value: 'year', label: 'Last Year' },
];

const BAR_COLORS = [
  'from-moss-500 to-moss-600',
  'from-blue-500 to-blue-600',
  'from-amber-500 to-amber-600',
  'from-green-500 to-green-600',
  'from-red-500 to-red-600',
  'from-purple-500 to-purple-600',
];

function Bar({ label, value, width, color }: { label: string; value: string | number; width: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-moss-900">{label}</span>
        <span className="text-sm bg-moss-100 text-moss-900 px-3 py-1 rounded-full font-bold">{value}</span>
      </div>
      <div className="w-full bg-moss-100 rounded-full h-3 overflow-hidden">
        <div className={`bg-linear-to-r ${color} h-3 rounded-full`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('month');
  const { data: report, error, loading } = useApi<ReportData>(`/api/reports?period=${period}`);
  const periodLabel = PERIODS.find((p) => p.value === period)!.label.toLowerCase();

  return (
    <>
      <PageHeader eyebrow="Analytics" title="Reports & Analytics" description="HR metrics across the company" />

      <div className="bg-white rounded-2xl border-2 border-moss-100 p-2 shadow-lg inline-flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              period === p.value ? 'bg-linear-to-r from-moss-500 to-moss-600 text-white shadow-md' : 'text-moss-700 hover:bg-moss-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <Alert>Failed to load report data: {error}</Alert>}

      {!report ? (
        loading && <PageSpinner label="Loading report data..." />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label="Active Employees"
              value={report.metrics.totalEmployees}
              icon={<Users size={24} />}
              badge={report.metrics.newHires > 0 && `+${report.metrics.newHires}`}
              hint={`${report.metrics.newHires} hired in the ${periodLabel}`}
            />
            <StatCard
              label="Avg Attendance"
              value={`${report.metrics.avgAttendance}%`}
              icon={<TrendingUp size={24} />}
              tone="emerald"
              hint="Check-ins out of all working days"
            />
            <StatCard
              label="Pending Leaves"
              value={report.metrics.pendingLeaves}
              icon={<Calendar size={24} />}
              tone="amber"
              hint={report.metrics.pendingLeaves > 0 ? 'Awaiting approval' : 'All caught up!'}
            />
            <StatCard
              label="Departments"
              value={report.metrics.departmentCount}
              icon={<BarChart3 size={24} />}
              tone="blue"
              hint="With at least one active employee"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Employees by Department">
              {report.departmentStats.length === 0 ? (
                <p className="text-center py-8 text-moss-600">No department data available</p>
              ) : (
                <div className="space-y-4">
                  {report.departmentStats.map((dept, i) => (
                    <Bar key={dept.name} label={dept.name} value={dept.count} width={dept.percentage} color={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </div>
              )}
            </Card>

            <Card title="Attendance, Last 5 Working Days">
              <div className="space-y-4">
                {report.weeklyTrend.map((day) => (
                  <Bar
                    key={day.date}
                    label={day.day}
                    value={`${day.rate}%`}
                    width={day.rate}
                    color={day.rate >= 96 ? 'from-green-500 to-green-600' : 'from-amber-500 to-amber-600'}
                  />
                ))}
              </div>
            </Card>
          </div>

          <Card title="Leave Requests" description={`Submitted in the ${periodLabel}; pending is everything still waiting`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Approved', value: report.leaveStats.approved, color: 'from-green-50 text-green-700' },
                { label: 'Pending', value: report.leaveStats.pending, color: 'from-amber-50 text-amber-700' },
                { label: 'Rejected', value: report.leaveStats.rejected, color: 'from-red-50 text-red-700' },
                { label: 'Cancelled', value: report.leaveStats.cancelled, color: 'from-blue-50 text-blue-700' },
              ].map((stat) => (
                <div key={stat.label} className={`bg-linear-to-br to-transparent rounded-xl p-6 border border-moss-100 ${stat.color}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
