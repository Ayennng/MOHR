/**
 * Reads `?page=` (1-based) and `?pageSize=` with safe defaults and an upper bound,
 * so a list endpoint can never be asked to return an unbounded number of rows.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  { defaultPageSize = 25, maxPageSize = 100 } = {}
) {
  const page = Math.max(1, Math.floor(Number(searchParams.get('page')) || 1));
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, Math.floor(Number(searchParams.get('pageSize')) || defaultPageSize))
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** `?dir=asc|desc`, defaulting to `fallback`. */
export function parseSortDirection(searchParams: URLSearchParams, fallback: 'asc' | 'desc' = 'desc') {
  const dir = searchParams.get('dir');
  return dir === 'asc' || dir === 'desc' ? dir : fallback;
}
