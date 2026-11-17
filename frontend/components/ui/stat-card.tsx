'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useCountUp } from '@/lib/use-count-up';

/** A number that counts up to its value; anything else is shown as it is. */
function AnimatedValue({ value }: { value: React.ReactNode }) {
  const counted = useCountUp(typeof value === 'number' ? value : undefined);
  return <>{typeof value === 'number' ? counted : value}</>;
}

const columns = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

/**
 * One panel of StatCards split by hairlines. The 1px gap shows the border colour
 * behind the cells, so the lines stay right at every breakpoint.
 */
export function Stats({ cols = 4, className = '', children }: { cols?: 2 | 3 | 4; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`grid grid-cols-1 gap-px overflow-hidden rounded-card border border-ink-900/8 bg-ink-900/8 shadow-soft stagger ${columns[cols]} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * One headline number, inside `Stats`: a label, the figure and what it means.
 * `progress` (0-100) adds a thin bar; `href` makes the cell a link to its section.
 */
export function StatCard({
  label,
  value,
  hint,
  progress,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  progress?: number;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-600">{label}</p>
        {href && (
          <ArrowUpRight size={16} className="text-ink-400 transition-colors duration-150 group-hover:text-ink-900" />
        )}
      </div>
      <p className="mt-3 font-display text-[32px] leading-none font-medium tabular-nums text-ink-900">
        <AnimatedValue value={value} />
      </p>
      {progress !== undefined && (
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full w-full origin-left rounded-full bg-mint-500 transition-transform duration-600 ease-out-soft"
            style={{ transform: `scaleX(${Math.min(100, Math.max(0, progress)) / 100})` }}
          />
        </div>
      )}
      {hint && <p className="mt-3 text-[13px] text-ink-500">{hint}</p>}
    </>
  );

  const className = 'group flex flex-col bg-white p-5';
  return href ? (
    <Link href={href} className={`${className} transition-colors duration-150 hover:bg-ink-50`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
