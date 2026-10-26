import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** The banner at the top of every signed-in page. */
export function PageHeader({
  eyebrow,
  title,
  description,
  back,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  back?: { href: string; label: string };
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 p-8 rounded-3xl bg-linear-to-br from-moss-50 to-emerald-50 border-2 border-moss-100">
      <div className="flex-1">
        {back && (
          <Link href={back.href} className="inline-flex items-center gap-2 mb-4 text-sm font-medium text-moss-700 hover:text-moss-900">
            <ArrowLeft size={16} />
            {back.label}
          </Link>
        )}
        {eyebrow && (
          <div className="w-fit px-4 py-2 mb-3 bg-moss-600 text-white rounded-full text-xs font-bold uppercase tracking-wide">
            {eyebrow}
          </div>
        )}
        <h1 className="text-4xl md:text-5xl font-extrabold bg-linear-to-r from-moss-900 to-moss-700 bg-clip-text text-transparent pb-2 mb-2">
          {title}
        </h1>
        {description && <p className="text-moss-700 text-lg">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** A section heading with the accent bar. */
export function SectionTitle({ children, description }: { children: React.ReactNode; description?: string }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-moss-900 flex items-center gap-3">
        <span className="w-1.5 h-7 bg-linear-to-b from-moss-500 to-moss-700 rounded-full" />
        {children}
      </h2>
      {description && <p className="text-moss-600 mt-2">{description}</p>}
    </div>
  );
}

/** White panel; with a `title`, gets a SectionTitle and an optional `action` beside it. */
export function Card({
  title,
  description,
  action,
  className = '',
  children,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`bg-white rounded-3xl border-2 border-moss-100 p-6 md:p-8 shadow-lg ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <SectionTitle description={description}>{title}</SectionTitle>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
