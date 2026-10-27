import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** The mint banner at the top of every signed-in page. */
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
    <header className="relative overflow-hidden flex flex-col md:flex-row items-start md:items-end justify-between gap-6 rounded-card bg-mint-200 px-8 py-9">
      {/* Leaf-vein lines in the corner: the one decoration the banner carries */}
      <svg aria-hidden className="absolute -right-6 -bottom-10 w-72 text-mint-300" viewBox="0 0 200 140" fill="none">
        <path d="M10 130 C 70 120, 140 80, 190 10" stroke="currentColor" strokeWidth="2" />
        <path d="M60 118 C 70 95, 72 80, 70 62 M100 102 C 112 84, 118 70, 118 50 M140 76 C 150 62, 155 50, 156 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M60 118 C 45 108, 35 98, 28 84 M100 102 C 86 96, 76 88, 68 76 M140 76 C 128 72, 118 66, 110 56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <div className="relative flex-1 animate-rise">
        {back && (
          <Link
            href={back.href}
            className="group inline-flex items-center gap-1.5 mb-4 text-sm font-medium text-mint-800 hover:text-mint-950"
          >
            <ArrowLeft size={16} className="transition-transform duration-200 ease-out-soft group-hover:-translate-x-1" />
            {back.label}
          </Link>
        )}
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-mint-800">{eyebrow}</p>
        )}
        <h1 className="text-4xl md:text-5xl font-bold text-mint-950">{title}</h1>
        {description && <p className="mt-3 text-mint-800 text-lg max-w-2xl">{description}</p>}
      </div>
      {action && <div className="relative animate-rise [animation-delay:90ms]">{action}</div>}
    </header>
  );
}

/** A section heading with a small mint mark. */
export function SectionTitle({ children, description }: { children: React.ReactNode; description?: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-mint-950 flex items-center gap-2.5">
        <span aria-hidden className="size-2.5 rounded-full bg-mint-400 ring-4 ring-mint-200" />
        {children}
      </h2>
      {description && <p className="text-sm text-mint-700 mt-1.5">{description}</p>}
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
    <section className={`bg-white rounded-card border border-mint-900/8 p-6 md:p-7 shadow-soft animate-rise ${className}`}>
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
