'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LEAD_STATUSES, LEAD_STATUS_LABELS, displayPhone, formatDateIN, type EnquiryDTO, type Paginated } from '@skyspace/shared';
import { useApi } from '@/hooks/useApi';
import { DataTable } from '@/components/ui/DataTable';
import { LeadStatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Field';
import { Pagination } from '@/components/ui/Pagination';
import { humanize } from '@/lib/labels';

/** Lead table used by owners, agents and admins. Data access is filtered by the API per role. */
export function LeadList({ endpoint, detailBase, extraFilters, toolbar }: { endpoint: string; detailBase: string; extraFilters?: Record<string, string>; toolbar?: React.ReactNode }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(q); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [q]);
  const { data, loading, error, reload } = useApi<Paginated<EnquiryDTO>>(endpoint, { page, status, q: debounced, ...extraFilters });
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <label htmlFor="lead-q" className="label">Search</label>
          <input id="lead-q" type="search" className="field" placeholder="Name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} wrapClassName="w-56">
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
        </Select>
        {toolbar}
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton /> : !data?.items.length ? <EmptyState title="No leads found" icon="📇" /> : (
        <>
          <DataTable
            caption="Leads"
            rows={data.items}
            rowKey={(r) => r.id}
            columns={[
              { key: 'n', header: 'Customer', cell: (r) => <Link href={`${detailBase}/${r.id}`} className="font-medium hover:text-brand-700">{r.name}<span className="block text-xs font-normal text-muted">{displayPhone(r.phone)}</span></Link> },
              { key: 'p', header: 'Property', cell: (r) => r.property ? <span>{r.property.propertyId}<span className="block max-w-[220px] truncate text-xs text-muted">{r.property.title}</span></span> : <span className="text-muted">{humanize(r.source)}</span> },
              { key: 'a', header: 'Agent', cell: (r) => r.assignedAgent?.name ?? <span className="text-muted">Unassigned</span> },
              { key: 'f', header: 'Follow-up', cell: (r) => (r.followUpAt ? <span className={new Date(r.followUpAt) < new Date() ? 'font-medium text-red-700' : ''}>{formatDateIN(r.followUpAt)}</span> : '—') },
              { key: 'c', header: 'Received', cell: (r) => formatDateIN(r.createdAt) },
              { key: 's', header: 'Status', cell: (r) => <LeadStatusBadge status={r.status} /> },
            ]}
          />
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}
