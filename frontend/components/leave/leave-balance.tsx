'use client';

import { useApi } from '@/lib/api';
import { percent } from '@/lib/format';
import { Card } from '@/components/ui/layout';
import { StatCard, Stats } from '@/components/ui/stat-card';

type Days = { total: number; used: number; available: number };

export interface LeaveBalance {
  vacationDays: Days;
  sickDays: Days;
  personalDays: Days;
  pendingRequests: number;
}

const TYPES: { key: 'vacationDays' | 'sickDays' | 'personalDays'; label: string }[] = [
  { key: 'vacationDays', label: 'Vacation' },
  { key: 'sickDays', label: 'Sick' },
  { key: 'personalDays', label: 'Personal' },
];

/**
 * The signed-in user's days left this year: one stat per leave type plus their pending
 * requests, or (compact) one card listing the three types. The bars are green because
 * they show what is left.
 */
export function LeaveBalanceCards({ compact = false }: { compact?: boolean }) {
  const { data: balance } = useApi<LeaveBalance>('/api/leave/balance');

  if (compact) {
    return (
      <Card title="Days left this year">
        <ul className="space-y-4">
          {TYPES.map(({ key, label }) => {
            const days = balance?.[key];
            return (
              <li key={key}>
                <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink-700">{label}</span>
                  <span className="tabular-nums text-ink-500">
                    <span className="font-medium text-ink-900">{days ? days.available : '…'}</span>
                    {days && ` of ${days.total}`}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full w-full origin-left rounded-full bg-mint-500 transition-transform duration-600 ease-out-soft"
                    style={{ transform: `scaleX(${days ? percent(days.available, days.total) / 100 : 0})` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    );
  }

  return (
    <Stats cols={4}>
      {TYPES.map(({ key, label }) => {
        const days = balance?.[key];
        return (
          <StatCard
            key={key}
            label={`${label} days left`}
            value={days?.available ?? '…'}
            progress={days ? percent(days.available, days.total) : 0}
            hint={days ? `${days.used} used of ${days.total} this year` : ' '}
          />
        );
      })}
      <StatCard label="Pending requests" value={balance?.pendingRequests ?? '…'} hint="Waiting for a decision" />
    </Stats>
  );
}
