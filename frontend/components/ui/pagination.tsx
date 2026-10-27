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

const pill =
  'grid size-9 place-items-center rounded-full text-sm font-semibold transition-[background-color,color,transform] duration-200 ease-out-soft active:scale-95';

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

  const arrow = `${pill} text-mint-800 hover:bg-mint-100 disabled:opacity-40 disabled:pointer-events-none`;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      <p className="text-sm text-mint-700">
        Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
      </p>

      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 1} className={arrow} aria-label="Previous page">
          <ChevronLeft size={18} />
        </button>
        {pageNumbers(page, totalPages).map((n, i) =>
          n === '...' ? (
            <span key={`gap-${i}`} className="px-1 text-mint-700">
              ...
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`${pill} ${n === page ? 'bg-mint-900 text-mint-200' : 'text-mint-800 hover:bg-mint-100'}`}
            >
              {n}
            </button>
          )
        )}
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className={arrow} aria-label="Next page">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
