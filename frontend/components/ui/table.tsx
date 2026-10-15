'use client';

import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  sortable?: boolean;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  sortColumn?: keyof T | string; // dotted paths like "user.firstName" are allowed
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: keyof T & string) => void;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  loading,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
}: TableProps<T>) {
  const getValue = (row: T, key: string | keyof T) => {
    const keys = String(key).split('.');
    let value: any = row;
    for (const k of keys) {
      value = value?.[k];
    }
    return value;
  };

  return (
    <div className="overflow-x-auto border border-moss-100 rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="bg-moss-50 border-b border-moss-100">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-6 py-3 text-left text-sm font-semibold text-moss-900"
                style={{ width: column.width }}
              >
                {column.sortable && onSort ? (
                  <button
                    onClick={() => onSort(column.key as keyof T & string)}
                    className="flex items-center gap-2 hover:text-moss-700 transition-colors"
                  >
                    {column.label}
                    {sortColumn === column.key && (
                      <>
                        {sortDirection === 'asc' ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </>
                    )}
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
              <td colSpan={columns.length} className="px-6 py-8 text-center">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-moss-500"></div>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-moss-500">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-moss-100 ${
                  onRowClick ? 'cursor-pointer hover:bg-moss-50' : ''
                } transition-colors`}
              >
                {columns.map((column, colIdx) => (
                  <td
                    key={`${idx}-${colIdx}`}
                    className="px-6 py-4 text-sm text-moss-700"
                  >
                    {column.render
                      ? column.render(getValue(row, column.key), row)
                      : getValue(row, column.key)}
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
