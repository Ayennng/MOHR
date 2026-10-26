'use client';

import { useState } from 'react';

export type SortDirection = 'asc' | 'desc';

/** Sort column + direction for a table. Clicking the current column flips the direction. */
export function useSort(initialColumn: string, initialDirection: SortDirection = 'asc') {
  const [sort, setSort] = useState({ column: initialColumn, direction: initialDirection });

  const toggle = (column: string) =>
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'asc' }
    );

  return { ...sort, toggle };
}

/** Value at a dotted path, e.g. getPath(employee, 'user.firstName'). */
export function getPath(row: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown> | null)?.[key], row);
}

/** A sorted copy of `rows` by the value at `column`; empty values go last. */
export function sortRows<T>(rows: T[], column: string, direction: SortDirection) {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = getPath(a, column);
    const y = getPath(b, column);
    if (x == null || x === '') return 1;
    if (y == null || y === '') return -1;
    return sign * (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)));
  });
}
