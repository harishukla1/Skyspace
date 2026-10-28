'use client';

import Link from 'next/link';
import { formatDateIN, type Paginated, type PropertySummaryDTO } from '@skyspace/shared';
import { useApi } from '@/hooks/useApi';
import { ListingStatusBadge } from '@/components/ui/Badge';
import { EmptyState, TableSkeleton } from '@/components/ui/Feedback';

type Row = PropertySummaryDTO & { moderationComment?: string; updatedAt?: string };

export function MyListingsByStatus({ basePath }: { basePath: string }) {
  const groups = [
    { status: 'pending_approval', title: 'Awaiting review' },
    { status: 'rejected', title: 'Needs changes' },
    { status: 'draft', title: 'Drafts (not yet submitted)' },
    { status: 'suspended', title: 'Suspended by moderators' },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {groups.map((g) => <Group key={g.status} {...g} basePath={basePath} />)}
    </div>
  );
}

function Group({ status, title, basePath }: { status: string; title: string; basePath: string }) {
  const { data, loading } = useApi<Paginated<Row>>('/owner/properties', { status, limit: 20 });
  return (
    <section className="card p-5">
      <h2 className="font-semibold">{title} {data ? <span className="text-muted">({data.total})</span> : null}</h2>
      <div className="mt-3">
        {loading ? <TableSkeleton rows={2} /> : !data?.items.length ? <EmptyState title="Nothing here" icon="✓" /> : (
          <ul className="divide-y divide-line">
            {data.items.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex justify-between gap-3">
                  <Link href={`${basePath}/${r.id}`} className="font-medium hover:text-brand-700">{r.title || 'Untitled draft'}</Link>
                  <ListingStatusBadge status={r.status} />
                </div>
                <p className="text-xs text-muted">{r.propertyId} · updated {formatDateIN(r.updatedAt ?? r.createdAt)}</p>
                {r.moderationComment && <p className="mt-1 text-xs text-red-700">{r.moderationComment}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
