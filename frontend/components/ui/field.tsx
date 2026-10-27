import React from 'react';

export const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-mint-900/15 bg-white text-mint-950 placeholder:text-mint-700/60 ' +
  'transition-[border-color,box-shadow,background-color] duration-200 ease-out-soft ' +
  'hover:border-mint-900/30 focus:outline-none focus:border-mint-600 focus:ring-4 focus:ring-mint-200 ' +
  'disabled:bg-mint-50 disabled:text-mint-700 disabled:cursor-not-allowed';

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
      <span className="block text-sm font-semibold text-mint-900 mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block mt-1.5 text-xs text-mint-700">{hint}</span>}
      {error && <span className="block mt-1.5 text-sm text-rose-700 animate-fade">{error}</span>}
    </label>
  );
}
