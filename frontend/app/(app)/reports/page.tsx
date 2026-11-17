'use client';

import { useState } from 'react';
import { useApi } from '@/lib/api';
import { Alert, Card, PageHeader, PageSpinner, Segmented, StatCard, Stats } from '@/components/ui';

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
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last month' },
  { value: 'quarter', label: 'Last quarter' },
  { value: 'year', label: 'Last year' },
] as const;

// A day at or above this attendance rate is drawn in green
const GOOD_RATE = 96;

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** Attendance for the last five working days: one column per day, green when the day was full. */
function AttendanceChart({ days }: { days: ReportData['weeklyTrend'] }) {
  return (
    <div>
      <div className="relative mt-6 h-60">
        {/* Grid: 100, 50 and 0%, labels on the left */}
        {[100, 50, 0].map((line) => (
          <div key={line} className="absolute inset-x-0 flex translate-y-1/2 items-center gap-3" style={{ bottom: `${line}%` }}>
            <span className="w-8 text-right text-xs tabular-nums text-ink-400">{line}%</span>
            <span className={`h-px flex-1 ${line === 0 ? 'bg-ink-900/12' : 'bg-ink-900/6'}`} />
          </div>
        ))}

        <div className="absolute inset-y-0 right-0 left-11 flex justify-around gap-3">
          {days.map((day) => {
            const good = day.rate >= GOOD_RATE;
            return (
              <div key={day.date} className="relative h-full w-full max-w-14">
                <div
                  className={`absolute inset-x-0 bottom-0 h-full origin-bottom rounded-t-md transition-transform duration-600 ease-out-soft ${
                    good ? 'bg-mint-500' : 'bg-ink-300'
                  }`}
                  style={{ transform: `scaleY(${clamp(day.rate) / 100})` }}
                />
                <span
                  className="absolute inset-x-0 text-center text-xs font-medium tabular-nums text-ink-700 animate-fade"
                  style={{ bottom: `calc(${clamp(day.rate)}% + 6px)` }}
                >
                  {day.rate}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 ml-11 flex justify-around gap-3">
        {days.map((day) => (
          <span key={day.date} className="w-full max-w-14 text-center text-xs text-ink-500">
            {day.day}
          </span>
        ))}
      </div>

      <p className="mt-5 flex items-center gap-4 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-sm bg-mint-500" />
          {GOOD_RATE}% or more checked in
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-sm bg-ink-300" />
          Below {GOOD_RATE}%
        </span>
      </p>
    </div>
  );
}

const LEAVE_PARTS = [
  { key: 'approved', label: 'Approved', color: 'bg-mint-500' },
  { key: 'pending', label: 'Pending', color: 'bg-amber-400' },
  { key: 'rejected', label: 'Rejected', color: 'bg-rose-400' },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-ink-300' },
] as const;

export default function ReportsPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['value']>('month');
  const { data: report, error, loading } = useApi<ReportData>(`/api/reports?period=${period}`);
  const periodLabel = PERIODS.find((p) => p.value === period)!.label.toLowerCase();

  const departments = [...(report?.departmentStats ?? [])].sort((a, b) => b.count - a.count);
  const leave = report?.leaveStats;
  const leaveTotal = leave ? leave.approved + leave.pending + leave.rejected + leave.cancelled : 0;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Headcount, attendance and leave across the company"
        action={<Segmented label="Report period" options={PERIODS} value={period} onChange={setPeriod} />}
      />

      {error && <Alert>Failed to load report data: {error}</Alert>}

      {!report ? (
        loading && <PageSpinner label="Loading report" />
      ) : (
        <>
          <Stats cols={4}>
            <StatCard
              label="Active employees"
              value={report.metrics.totalEmployees}
              hint={`${report.metrics.newHires} hired in the ${periodLabel}`}
            />
            <StatCard
              label="Average attendance"
              value={`${report.metrics.avgAttendance}%`}
              hint="Check-ins out of all working days"
            />
            <StatCard
              label="Pending leave"
              value={report.metrics.pendingLeaves}
              hint={report.metrics.pendingLeaves > 0 ? 'Waiting for a decision' : 'None waiting'}
              href="/leave"
            />
            <StatCard label="Departments" value={report.metrics.departmentCount} hint="With at least one active employee" />
          </Stats>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <Card title="Attendance" description="Last five working days" className="lg:col-span-2">
              <AttendanceChart days={report.weeklyTrend} />
            </Card>

            <Card title="People by department">
              {departments.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-500">No departments yet</p>
              ) : (
                <ol className="space-y-4">
                  {departments.map((dept, i) => (
                    <li key={dept.name}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate text-ink-700">{dept.name}</span>
                        <span className="font-medium tabular-nums text-ink-900">{dept.count}</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-ink-100">
                        <div
                          className={`h-full w-full origin-left rounded-full transition-transform duration-600 ease-out-soft ${
                            i === 0 ? 'bg-mint-500' : 'bg-ink-300'
                          }`}
                          style={{ transform: `scaleX(${clamp(dept.percentage) / 100})` }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <Card title="Leave requests" description={`${leaveTotal} submitted in the ${periodLabel}. Pending counts everything still waiting.`}>
            {leave && (
              <>
                <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-ink-100">
                  {leaveTotal > 0 &&
                    LEAVE_PARTS.map((part) =>
                      leave[part.key] > 0 ? (
                        <span key={part.key} className={part.color} style={{ flexGrow: leave[part.key] }} />
                      ) : null
                    )}
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                  {LEAVE_PARTS.map((part) => (
                    <div key={part.key}>
                      <dt className="flex items-center gap-1.5 text-sm text-ink-600">
                        <span aria-hidden className={`size-2 rounded-sm ${part.color}`} />
                        {part.label}
                      </dt>
                      <dd className="mt-1 font-display text-2xl font-medium tabular-nums text-ink-900">{leave[part.key]}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </Card>
        </>
      )}
    </>
  );
}
