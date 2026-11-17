import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** The title row at the top of every signed-in page. */
export function PageHeader({
  title,
  description,
  back,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="group mb-3 inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors duration-150 hover:text-ink-900"
          >
            <ArrowLeft size={16} className="transition-transform duration-150 ease-out-soft group-hover:-translate-x-0.5" />
            {back.label}
          </Link>
        )}
        <h1 className="text-3xl font-medium leading-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-600">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/** A section heading, for groups of content that sit outside a Card. */
export function SectionTitle({ children, description }: { children: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-ink-900">{children}</h2>
      {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
    </div>
  );
}

/**
 * White panel with 24px padding; with a `title`, gets a heading and an optional
 * `action` beside it. A Table inside runs to the panel's edges.
 */
export function Card({
  title,
  description,
  action,
  className = '',
  children,
}: {
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-card border border-ink-900/8 bg-white p-6 shadow-soft ${className}`}>
      {title && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <SectionTitle description={description}>{title}</SectionTitle>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
