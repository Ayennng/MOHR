'use client';

import { Calendar, Heart, User, Clock } from 'lucide-react';
import { useApi } from '@/lib/api';
import { percent } from '@/lib/format';
import { StatCard, type StatTone } from '@/components/ui/stat-card';

type Days = { total: number; used: number; available: number };

export interface LeaveBalance {
  vacationDays: Days;
  sickDays: Days;
  personalDays: Days;
  pendingRequests: number;
}

const TYPES: { key: 'vacationDays' | 'sickDays' | 'personalDays'; label: string; icon: React.ReactNode; tone: StatTone }[] = [
  { key: 'vacationDays', label: 'Vacation Days', icon: <Calendar size={24} />, tone: 'moss' },
  { key: 'sickDays', label: 'Sick Days', icon: <Heart size={24} />, tone: 'red' },
  { key: 'personalDays', label: 'Personal Days', icon: <User size={24} />, tone: 'amber' },
];

/** The signed-in user's days left this year, one card per leave type plus their pending requests. */
export function LeaveBalanceCards({ compact = false }: { compact?: boolean }) {
  const { data: balance } = useApi<LeaveBalance>('/api/leave/balance');

  return (
    <div className={`grid gap-6 grid-cols-1 ${compact ? '' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
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
      {!compact && (
        <StatCard
          label="Pending"
          value={balance?.pendingRequests ?? '…'}
          icon={<Clock size={24} />}
          tone="blue"
          hint="Requests awaiting approval"
        />
      )}
    </div>
  );
}
