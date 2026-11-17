import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { getPath, type SortDirection } from '@/lib/sort';
import { Spinner } from './spinner';

export interface Column<T> {
  /** Field shown in the column (dotted paths like "user.email" work); also the sort key. */
  key: string;
  label: string;
  /** Custom cell content; by default the value at `key`. */
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

// Tables sit in a Card (p-6) and run to its edges; the outer cells keep the 24px inset
const cell = 'px-3 first:pl-6 last:pr-6';

export function Table<T extends { id: string }>({
  columns,
  data,
  loading,
  sortColumn,
  sortDirection,
  onSort,
  emptyText = 'Nothing here yet',
}: {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string) => void;
  emptyText?: string;
}) {
  return (
    <div className="-mx-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-ink-900/8 bg-ink-50">
            {columns.map((column) => {
              const active = sortColumn === column.key;
              return (
                <th
                  key={column.label}
                  scope="col"
                  className={`h-10 whitespace-nowrap text-left text-xs font-medium text-ink-500 ${cell}`}
                >
                  {column.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className={`inline-flex items-center gap-1 rounded transition-colors duration-150 hover:text-ink-900 ${active ? 'text-ink-900' : ''}`}
                    >
                      {column.label}
                      {active ? (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      ) : (
                        <ChevronsUpDown size={14} className="opacity-50" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-ink-400">
                <Spinner />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-ink-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.id}
                className="border-b border-ink-900/6 transition-colors duration-150 last:border-0 hover:bg-ink-50 animate-fade"
              >
                {columns.map((column) => (
                  <td key={column.label} className={`h-12 whitespace-nowrap text-ink-800 ${cell}`}>
                    {column.render ? column.render(row) : String(getPath(row, column.key) ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
