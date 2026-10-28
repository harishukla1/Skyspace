'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { Paginated } from '@skyspace/shared';
import { useApi } from '@/hooks/useApi';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';

/** Paginated, filterable admin list. Filter controls sit in one row above the table. */
export function AdminTable<T extends { id: string }>({
  endpoint, columns, filters, query = {}, searchPlaceholder, empty = 'Nothing found', reloadKey,
}: {
  endpoint: string; columns: Column<T>[]; filters?: ReactNode; query?: Record<string, string | undefined>; searchPlaceholder?: string; empty?: string; reloadKey?: number;
}) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [q]);
  const queryKey = JSON.stringify(query);
  useEffect(() => setPage(1), [queryKey]);
  const { data, loading, error, reload } = useApi<Paginated<T>>(endpoint, { page, q: dq || undefined, ...query });
  useEffect(() => {
    if (reloadKey) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        {searchPlaceholder && (
          <div className="w-64">
            <label htmlFor="admin-q" className="label">Search</label>
            <input id="admin-q" type="search" className="field" placeholder={searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
        {filters}
        {data && <p className="ml-auto pb-2 text-sm text-muted">{data.total.toLocaleString('en-IN')} result{data.total === 1 ? '' : 's'}</p>}
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <TableSkeleton /> : !data?.items.length ? <EmptyState title={empty} /> : (
        <>
          <DataTable rows={data.items} rowKey={(r) => r.id} columns={columns} />
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}
