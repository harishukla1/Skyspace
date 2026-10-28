'use client';

import Link from 'next/link';
import { LEAD_STATUS_LABELS, LISTING_STATUS_LABELS, type LeadStatus, type ListingStatus } from '@skyspace/shared';
import { useApi } from '@/hooks/useApi';
import { KpiCard } from '@/components/dashboard/DashboardShell';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { DataTable } from '@/components/ui/DataTable';

interface Perf {
  listingsByStatus: Record<string, number>;
  totals: { views: number; enquiries: number; shortlists: number; visitRequests: number };
  leadsByStatus: Record<string, number>;
  conversionRate: number | null;
  upcomingVisits: number;
  topListings: { id: string; propertyId: string; title: string; slug: string; stats: { views: number; enquiries: number; shortlists: number; visits: number } }[];
}

export function Performance({ endpoint, listingBase }: { endpoint: string; listingBase: string }) {
  const { data, loading, error, reload } = useApi<Perf>(endpoint);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <TableSkeleton />;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Live listings" value={data.listingsByStatus.published ?? 0} />
        <KpiCard label="Total views" value={data.totals.views.toLocaleString('en-IN')} />
        <KpiCard label="Enquiries" value={data.totals.enquiries} />
        <KpiCard label="Upcoming visits" value={data.upcomingVisits} />
        <KpiCard label="Lead conversion" value={data.conversionRate === null ? '—' : `${data.conversionRate}%`} hint={data.conversionRate === null ? 'Needs at least 5 leads' : undefined} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">Listings by status</h2>
          <ul className="mt-3 space-y-1.5 text-sm">{Object.entries(data.listingsByStatus).map(([s, n]) => <li key={s} className="flex justify-between"><span>{LISTING_STATUS_LABELS[s as ListingStatus] ?? s}</span><span className="font-medium">{n}</span></li>)}</ul>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Leads by status</h2>
          {Object.keys(data.leadsByStatus).length ? <ul className="mt-3 space-y-1.5 text-sm">{Object.entries(data.leadsByStatus).map(([s, n]) => <li key={s} className="flex justify-between"><span>{LEAD_STATUS_LABELS[s as LeadStatus] ?? s}</span><span className="font-medium">{n}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted">No leads yet.</p>}
        </div>
      </div>
      <h2 className="font-semibold">Top live listings</h2>
      {data.topListings.length ? (
        <DataTable
          rows={data.topListings}
          rowKey={(r) => r.id}
          columns={[
            { key: 't', header: 'Listing', cell: (r) => <Link href={`${listingBase}/${r.id}`} className="font-medium hover:text-brand-700">{r.title}<span className="block text-xs text-muted">{r.propertyId}</span></Link> },
            { key: 'v', header: 'Views', cell: (r) => r.stats.views, className: 'text-right' },
            { key: 'e', header: 'Enquiries', cell: (r) => r.stats.enquiries, className: 'text-right' },
            { key: 's', header: 'Shortlists', cell: (r) => r.stats.shortlists, className: 'text-right' },
            { key: 'x', header: 'Visit requests', cell: (r) => r.stats.visits, className: 'text-right' },
          ]}
        />
      ) : <EmptyState title="No live listings" />}
    </div>
  );
}
