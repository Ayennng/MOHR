import React from 'react';
import Link from 'next/link';

const tones = {
  moss: { border: 'border-moss-100', icon: 'from-moss-500 to-moss-700', label: 'text-moss-600', value: 'text-moss-900', track: 'bg-moss-100', fill: 'from-moss-500 to-moss-600' },
  emerald: { border: 'border-emerald-100', icon: 'from-emerald-500 to-emerald-700', label: 'text-emerald-600', value: 'text-emerald-900', track: 'bg-emerald-100', fill: 'from-emerald-500 to-emerald-600' },
  red: { border: 'border-red-100', icon: 'from-red-500 to-red-700', label: 'text-red-600', value: 'text-red-900', track: 'bg-red-100', fill: 'from-red-500 to-red-600' },
  amber: { border: 'border-amber-100', icon: 'from-amber-500 to-amber-700', label: 'text-amber-600', value: 'text-amber-900', track: 'bg-amber-100', fill: 'from-amber-500 to-amber-600' },
  blue: { border: 'border-blue-100', icon: 'from-blue-500 to-blue-700', label: 'text-blue-600', value: 'text-blue-900', track: 'bg-blue-100', fill: 'from-blue-500 to-blue-600' },
};

export type StatTone = keyof typeof tones;

/**
 * One headline number. `progress` (0-100) adds a bar under it; `href` makes the
 * whole card a link to the section it summarises.
 */
export function StatCard({
  label,
  value,
  icon,
  tone = 'moss',
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
  const className = `block rounded-2xl bg-white p-6 shadow-sm border-2 ${t.border} transition-all ${
    href ? 'hover:shadow-xl hover:-translate-y-1' : ''
  }`;

  const content = (
    <>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-linear-to-br text-white ${t.icon}`}>{icon}</div>
        {badge && <span className={`text-xs font-bold px-3 py-1 rounded-full ${t.track} ${t.value}`}>{badge}</span>}
      </div>
      <p className={`text-xs font-bold uppercase tracking-wider ${t.label}`}>{label}</p>
      <p className={`text-4xl font-extrabold mt-1 ${t.value}`}>{value}</p>
      {progress !== undefined && (
        <div className={`mt-4 h-2.5 w-full rounded-full overflow-hidden ${t.track}`}>
          <div className={`h-full rounded-full bg-linear-to-r ${t.fill}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
      {hint && <p className={`text-xs font-medium mt-3 ${t.label}`}>{hint}</p>}
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
