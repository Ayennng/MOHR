'use client';

import { useState } from 'react';
import { BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';
import { useApi } from '@/lib/api';
import { Alert, Card, PageHeader, PageSpinner, Segmented, StatCard } from '@/components/ui';

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
] as const;

const BAR_COLORS = ['bg-mint-800', 'bg-mint-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-400', 'bg-mint-300'];

/** A labelled bar. It grows from the left (scaleX) when its value arrives or changes. */
function Bar({ label, value, width, color }: { label: string; value: string | number; width: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-mint-950">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-mint-800">{value}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-mint-100 overflow-hidden">
        <div
          className={`h-full w-full rounded-full origin-left transition-transform duration-[600ms] ease-out-soft ${color}`}
          style={{ transform: `scaleX(${Math.min(100, Math.max(0, width)) / 100})` }}
        />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['value']>('month');
  const { data: report, error, loading } = useApi<ReportData>(`/api/reports?period=${period}`);
  const periodLabel = PERIODS.find((p) => p.value === period)!.label.toLowerCase();

  return (
    <>
      <PageHeader eyebrow="Analytics" title="Reports & Analytics" description="HR metrics across the company" />

      <Segmented label="Report period" options={PERIODS} value={period} onChange={setPeriod} />

      {error && <Alert>Failed to load report data: {error}</Alert>}

      {!report ? (
        loading && <PageSpinner label="Loading report data..." />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
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
              tone="mint"
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
              tone="sky"
              hint="With at least one active employee"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Employees by Department">
              {report.departmentStats.length === 0 ? (
                <p className="text-center py-8 text-mint-700">No department data available</p>
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
                    color={day.rate >= 96 ? 'bg-mint-500' : 'bg-amber-500'}
                  />
                ))}
              </div>
            </Card>
          </div>

          <Card title="Leave Requests" description={`Submitted in the ${periodLabel}; pending is everything still waiting`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
              {[
                { label: 'Approved', value: report.leaveStats.approved, color: 'bg-mint-100 text-mint-900' },
                { label: 'Pending', value: report.leaveStats.pending, color: 'bg-amber-100 text-amber-900' },
                { label: 'Rejected', value: report.leaveStats.rejected, color: 'bg-rose-100 text-rose-900' },
                { label: 'Cancelled', value: report.leaveStats.cancelled, color: 'bg-stone-100 text-stone-800' },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-2xl p-5 ${stat.color}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider">{stat.label}</p>
                  <p className="font-display text-4xl font-bold mt-2 tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
