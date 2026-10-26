import React from 'react';

const tones = {
  error: 'bg-red-50 border-red-200 text-red-700',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
};

/** A boxed message; renders nothing when there are no children. */
export function Alert({ tone = 'error', children }: { tone?: keyof typeof tones; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className={`rounded-lg border p-4 text-sm ${tones[tone]}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
