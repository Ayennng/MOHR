'use client';

import React from 'react';
import Link from 'next/link';
import { useCountUp } from '@/lib/use-count-up';

// Each tone: icon chip, value ink, progress fill. Labels and hints stay mint-700 (5.8:1).
const tones = {
  mint: { chip: 'bg-mint-200 text-mint-900', value: 'text-mint-900', fill: 'bg-mint-500', track: 'bg-mint-100' },
  ink: { chip: 'bg-mint-900 text-mint-200', value: 'text-mint-900', fill: 'bg-mint-800', track: 'bg-mint-100' },
  sky: { chip: 'bg-sky-100 text-sky-800', value: 'text-mint-900', fill: 'bg-sky-500', track: 'bg-sky-100' },
  amber: { chip: 'bg-amber-100 text-amber-800', value: 'text-mint-900', fill: 'bg-amber-500', track: 'bg-amber-100' },
  rose: { chip: 'bg-rose-100 text-rose-800', value: 'text-mint-900', fill: 'bg-rose-500', track: 'bg-rose-100' },
};

export type StatTone = keyof typeof tones;

/** A number that counts up to its value; anything else is shown as it is. */
function AnimatedValue({ value }: { value: React.ReactNode }) {
  const counted = useCountUp(typeof value === 'number' ? value : undefined);
  return <>{typeof value === 'number' ? counted : value}</>;
}

/**
 * One headline number. `progress` (0-100) adds a bar that grows in; `href` makes the
 * whole card a link to the section it summarises.
 */
export function StatCard({
  label,
  value,
  icon,
  tone = 'mint',
  hint,
  badge,
  progress,
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: StatTone;
  hint?: React.ReactNode;
  badge?: React.ReactNode;
  progress?: number;
  href?: string;
}) {
  const t = tones[tone];
  const className =
    'group block rounded-card bg-white p-6 border border-mint-900/8 shadow-soft ' +
    'transition-[transform,box-shadow] duration-200 ease-out-soft ' +
    (href ? 'hover:-translate-y-1 hover:shadow-lift' : '');

  const content = (
    <>
      <div className="flex items-start justify-between mb-5">
        <div className={`grid place-items-center size-11 rounded-2xl transition-transform duration-200 ease-out-soft group-hover:-rotate-6 ${t.chip}`}>
          {icon}
        </div>
        {badge && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-mint-100 text-mint-800">{badge}</span>}
      </div>
      <p className="text-sm font-medium text-mint-700">{label}</p>
      <p className={`font-display text-4xl font-bold mt-1 tabular-nums ${t.value}`}>
        <AnimatedValue value={value} />
      </p>
      {progress !== undefined && (
        <div className={`mt-4 h-2 w-full rounded-full overflow-hidden ${t.track}`}>
          <div
            className={`h-full w-full rounded-full origin-left transition-transform duration-[600ms] ease-out-soft ${t.fill}`}
            style={{ transform: `scaleX(${Math.min(100, Math.max(0, progress)) / 100})` }}
          />
        </div>
      )}
      {hint && <p className="text-xs mt-3 text-mint-700">{hint}</p>}
    </>
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
