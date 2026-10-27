import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const tones = {
  error: { box: 'bg-rose-50 border-rose-200 text-rose-800', icon: <AlertCircle size={18} /> },
  success: { box: 'bg-mint-100 border-mint-300 text-mint-900', icon: <CheckCircle2 size={18} /> },
  warning: { box: 'bg-amber-50 border-amber-200 text-amber-900', icon: <Info size={18} /> },
};

/** A boxed message that slides in; renders nothing when there are no children. */
export function Alert({ tone = 'error', children }: { tone?: keyof typeof tones; children?: React.ReactNode }) {
  if (!children) return null;
  const t = tones[tone];
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm animate-rise ${t.box}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className="mt-px shrink-0">{t.icon}</span>
      <div>{children}</div>
    </div>
  );
}
