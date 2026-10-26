import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Page numbers to show: always the first and last, two either side of the current one. */
function pageNumbers(current: number, total: number): (number | '...')[] {
  const pages: (number | '...')[] = [];
  for (let page = 1; page <= total; page++) {
    if (page === 1 || page === total || Math.abs(page - current) <= 2) pages.push(page);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  return pages;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const arrow = 'p-2 text-moss-600 hover:bg-moss-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      <p className="text-sm text-moss-600">
        Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} results
      </p>

      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 1} className={arrow} aria-label="Previous page">
          <ChevronLeft size={20} />
        </button>
        {pageNumbers(page, totalPages).map((n, i) =>
          n === '...' ? (
            <span key={`gap-${i}`} className="px-3 py-2 text-moss-500">
              ...
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`px-3 py-2 rounded-lg ${n === page ? 'bg-moss-500 text-white' : 'text-moss-700 hover:bg-moss-50'}`}
            >
              {n}
            </button>
          )
        )}
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className={arrow} aria-label="Next page">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
