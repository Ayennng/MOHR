import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
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
    <div className="overflow-x-auto border border-moss-100 rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="bg-moss-50 border-b border-moss-100">
            {columns.map((column) => (
              <th key={column.label} className="px-6 py-3 text-left text-sm font-semibold text-moss-900">
                {column.sortable && onSort ? (
                  <button
                    type="button"
                    onClick={() => onSort(column.key)}
                    className="flex items-center gap-2 hover:text-moss-700"
                  >
                    {column.label}
                    {sortColumn === column.key &&
                      (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-moss-500">
                <Spinner />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-moss-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id} className="border-b border-moss-100 last:border-b-0">
                {columns.map((column) => (
                  <td key={column.label} className="px-6 py-4 text-sm text-moss-700">
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
