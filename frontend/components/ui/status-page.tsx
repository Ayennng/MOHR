import React from 'react';
import { Leaf } from 'lucide-react';

/** Full-screen message for the error and 404 pages. */
export function StatusPage({
  code,
  title,
  children,
  actions,
}: {
  code: string;
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ground flex items-center justify-center px-4">
      <div className="max-w-md text-center stagger">
        <div className="mx-auto mb-6 grid size-11 place-items-center rounded-xl bg-mint-200 text-mint-900">
          <Leaf size={22} />
        </div>
        <p className="text-sm tabular-nums text-ink-500">Error {code}</p>
        <h1 className="mt-1 text-3xl font-medium text-ink-900">{title}</h1>
        <div className="mt-3 mb-8 text-[15px] text-ink-600">{children}</div>
        <div className="flex flex-wrap justify-center gap-2">{actions}</div>
      </div>
    </div>
  );
}
