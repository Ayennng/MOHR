import React from 'react';
import { AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-linear-to-br from-moss-50 to-emerald-50 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="text-red-600" size={40} />
        </div>
        <h1 className="text-6xl font-bold text-moss-900 mb-2">{code}</h1>
        <h2 className="text-2xl font-bold text-moss-900 mb-3">{title}</h2>
        <div className="text-moss-600 mb-8">{children}</div>
        <div className="flex gap-4 justify-center flex-wrap">{actions}</div>
      </div>
    </div>
  );
}
