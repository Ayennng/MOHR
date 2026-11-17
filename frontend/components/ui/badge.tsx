import React from 'react';
import { humanize } from '@/lib/format';

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

// Each pair is a dark ink on its pale tint (7:1 or better). Green means good, and only good.
const variantStyles: Record<BadgeVariant, { badge: string; dot: string }> = {
  success: { badge: 'bg-mint-100 text-mint-800', dot: 'bg-mint-500' },
  error: { badge: 'bg-rose-50 text-rose-800', dot: 'bg-rose-500' },
  warning: { badge: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  info: { badge: 'bg-sky-50 text-sky-800', dot: 'bg-sky-500' },
  neutral: { badge: 'bg-ink-100 text-ink-700', dot: 'bg-ink-400' },
};

export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  const style = variantStyles[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badge}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${style.dot}`} />
      {children}
    </span>
  );
}

const statusVariants: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'neutral',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  ON_LEAVE: 'info',
  PRESENT: 'success',
  ABSENT: 'error',
  LATE: 'warning',
  HALF_DAY: 'info',
  CONFIRMED: 'success',
};

/** A badge for any of the API's status values (leave, employee, attendance, booking). */
export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariants[status] ?? 'neutral'}>{humanize(status)}</Badge>;
}
