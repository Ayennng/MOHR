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
      <div className="text-center max-w-lg stagger">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-3xl bg-mint-200 text-mint-900 rotate-[-8deg]">
          <Leaf size={30} />
        </div>
        <p className="font-display text-7xl font-bold text-mint-600">{code}</p>
        <h1 className="mt-2 text-3xl font-bold text-mint-950">{title}</h1>
        <div className="mt-3 mb-8 text-mint-800">{children}</div>
        <div className="flex gap-3 justify-center flex-wrap">{actions}</div>
      </div>
    </div>
  );
}
