'use client';

import { useState } from 'react';
import type { Paginated, PropertySummaryDTO } from '@skyspace/shared';
import { useApi } from '@/hooks/useApi';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { PropertyCard } from '@/components/property/PropertyCard';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { LinkButton } from '@/components/ui/Button';

export default function ShortlistPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi<Paginated<PropertySummaryDTO>>('/users/me/shortlist', { page, limit: 12 });
  return (
    <>
      <PageHeader title="Shortlisted properties" description="Properties you saved. Listings that are sold or no longer available are labelled." />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />)}</div>
      ) : !data?.items.length ? (
        <EmptyState title="Your shortlist is empty" description="Tap the heart on any property to save it here." action={<LinkButton href="/search">Browse properties</LinkButton>} icon="♡" />
      ) : (
        <>
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{data.items.map((p) => <li key={p.id}><PropertyCard p={p} /></li>)}</ul>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}
