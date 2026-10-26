import React from 'react';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { humanize } from '@/lib/format';

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-50 text-green-700 border border-green-200',
  error: 'bg-red-50 text-red-700 border border-red-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  neutral: 'bg-moss-50 text-moss-700 border border-moss-200',
};

const icons: Record<BadgeVariant, React.ReactNode> = {
  success: <Check size={14} />,
  error: <X size={14} />,
  warning: <AlertCircle size={14} />,
  info: <Clock size={14} />,
  neutral: null,
};

export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${variantStyles[variant]}`}>
      {icons[variant]}
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
