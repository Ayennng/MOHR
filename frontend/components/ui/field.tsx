import React from 'react';

export const inputClass =
  'w-full rounded-xl border border-ink-900/12 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 ' +
  'transition-[border-color,box-shadow,background-color] duration-150 ease-out-soft ' +
  'hover:border-ink-900/20 focus:outline-none focus:border-mint-600 focus:ring-4 focus:ring-mint-200/70 ' +
  'disabled:bg-ink-50 disabled:text-ink-500 disabled:cursor-not-allowed';

/** A labelled form control, with an optional hint and validation error underneath. */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-800">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-ink-500">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs text-rose-700 animate-fade">{error}</span>}
    </label>
  );
}
