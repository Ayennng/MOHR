'use client';

import { Calendar, Heart, User, Clock } from 'lucide-react';
import { useApi } from '@/lib/api';
import { percent } from '@/lib/format';
import { Card } from '@/components/ui/layout';
import { StatCard, type StatTone } from '@/components/ui/stat-card';

type Days = { total: number; used: number; available: number };

export interface LeaveBalance {
  vacationDays: Days;
  sickDays: Days;
  personalDays: Days;
  pendingRequests: number;
}

const TYPES: { key: 'vacationDays' | 'sickDays' | 'personalDays'; label: string; icon: React.ReactNode; tone: StatTone; bar: string }[] = [
  { key: 'vacationDays', label: 'Vacation Days', icon: <Calendar size={22} />, tone: 'mint', bar: 'bg-mint-500' },
  { key: 'sickDays', label: 'Sick Days', icon: <Heart size={22} />, tone: 'rose', bar: 'bg-rose-500' },
  { key: 'personalDays', label: 'Personal Days', icon: <User size={22} />, tone: 'amber', bar: 'bg-amber-500' },
];

/**
 * The signed-in user's days left this year: one card per leave type plus their pending
 * requests, or (compact) one card listing the three types.
 */
export function LeaveBalanceCards({ compact = false }: { compact?: boolean }) {
  const { data: balance } = useApi<LeaveBalance>('/api/leave/balance');

  if (compact) {
    return (
      <Card title="Your Balance">
        <ul className="space-y-5">
          {TYPES.map(({ key, label, icon, bar }) => {
            const days = balance?.[key];
            return (
              <li key={key}>
                <div className="mb-2 flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-mint-100 text-mint-800">{icon}</span>
                  <span className="flex-1 text-sm font-semibold text-mint-950">{label}</span>
                  <span className="font-display text-lg font-bold tabular-nums text-mint-950">
                    {days ? `${days.available}/${days.total}` : '…'}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-mint-100">
                  <div
                    className={`h-full w-full origin-left rounded-full transition-transform duration-[600ms] ease-out-soft ${bar}`}
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
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 stagger">
      {TYPES.map(({ key, label, icon, tone }) => {
        const days = balance?.[key];
        return (
          <StatCard
            key={key}
            label={label}
            value={days?.available ?? '…'}
            icon={icon}
            tone={tone}
            badge={days && `${days.available}/${days.total}`}
            progress={days ? percent(days.available, days.total) : 0}
            hint={days && `${percent(days.available, days.total)}% left this year`}
          />
        );
      })}
      <StatCard
        label="Pending"
        value={balance?.pendingRequests ?? '…'}
        icon={<Clock size={22} />}
        tone="sky"
        hint="Requests awaiting approval"
      />
    </div>
  );
}
