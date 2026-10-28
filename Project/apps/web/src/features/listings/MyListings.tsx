'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LISTING_STATUSES, LISTING_STATUS_LABELS, formatDateIN, type Paginated, type PropertySummaryDTO } from '@skyspace/shared';
import { useApi } from '@/hooks/useApi';
import { DataTable } from '@/components/ui/DataTable';
import { ListingStatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Field';
import { Pagination } from '@/components/ui/Pagination';
import { LinkButton } from '@/components/ui/Button';
import { Price } from '@/components/property/Price';

type Row = PropertySummaryDTO & { stats: { views: number; enquiries: number; shortlists: number; visits: number }; moderationComment?: string; updatedAt?: string };

export function MyListings({ basePath }: { basePath: string }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useApi<Paginated<Row>>('/owner/properties', { page, status });
  return (
    <>
      <div className="mb-4 flex items-end justify-between gap-3">
        <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} wrapClassName="w-56">
          <option value="">All statuses</option>
          {LISTING_STATUSES.map((s) => <option key={s} value={s}>{LISTING_STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton /> : !data?.items.length ? (
        <EmptyState title="No listings yet" description="Post your first property — it’s free." action={<LinkButton href={`${basePath}/new`}>Add property</LinkButton>} icon="🏠" />
      ) : (
        <>
          <DataTable
            caption="My listings"
            rows={data.items}
            rowKey={(r) => r.id}
            columns={[
              { key: 't', header: 'Listing', cell: (r) => <Link href={`${basePath}/${r.id}`} className="font-medium hover:text-brand-700">{r.title || 'Untitled draft'}<span className="block text-xs font-normal text-muted">{r.propertyId} · {[r.locality, r.city].filter(Boolean).join(', ')}</span></Link> },
              { key: 'p', header: 'Price', cell: (r) => <Price p={r} /> },
              { key: 's', header: 'Status', cell: (r) => <span className="space-y-1"><ListingStatusBadge status={r.status} />{r.moderationComment && <span className="block max-w-[200px] text-xs text-red-700">{r.moderationComment}</span>}</span> },
              { key: 'v', header: 'Views', cell: (r) => r.stats?.views ?? 0, className: 'text-right' },
              { key: 'e', header: 'Enquiries', cell: (r) => r.stats?.enquiries ?? 0, className: 'text-right' },
              { key: 'u', header: 'Updated', cell: (r) => formatDateIN(r.updatedAt ?? r.createdAt) },
            ]}
          />
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}
