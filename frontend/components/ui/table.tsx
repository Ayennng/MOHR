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

export function Table<T extends { id: string }>({
  columns,
  data,
  loading,
  sortColumn,
  sortDirection,
  onSort,
  emptyText = 'No data available',
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
    <div className="overflow-x-auto rounded-2xl border border-mint-900/8">
      <table className="w-full">
        <thead>
          <tr className="bg-mint-50">
            {columns.map((column) => {
              const active = sortColumn === column.key;
              return (
                <th key={column.label} scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-mint-800">
                  {column.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className={`inline-flex items-center gap-1 rounded-md uppercase tracking-wider hover:text-mint-950 ${active ? 'text-mint-950' : ''}`}
                    >
                      {column.label}
                      {active ? (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      ) : (
                        <ChevronsUpDown size={14} className="opacity-40" />
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
        <tbody className={loading ? '' : 'stagger'}>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-10 text-center text-mint-600">
                <Spinner />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-10 text-center text-mint-700">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id} className="border-t border-mint-900/6 transition-colors duration-200 hover:bg-mint-50/70">
                {columns.map((column) => (
                  <td key={column.label} className="whitespace-nowrap px-5 py-3.5 text-sm text-mint-900">
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
