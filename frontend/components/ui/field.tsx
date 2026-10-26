import React from 'react';

export const inputClass =
  'w-full px-4 py-2.5 border border-moss-200 rounded-lg bg-white text-moss-900 placeholder:text-moss-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-moss-500 focus:border-transparent ' +
  'disabled:bg-moss-50 disabled:text-moss-500 disabled:cursor-not-allowed';

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
      <span className="block text-sm font-medium text-moss-800 mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block mt-1 text-xs text-moss-600">{hint}</span>}
      {error && <span className="block mt-1 text-sm text-red-600">{error}</span>}
    </label>
  );
}
