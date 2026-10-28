'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatDateIN, type EnquiryDTO, type Paginated } from '@skyspace/shared';
import { useApi } from '@/hooks/useApi';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { DataTable } from '@/components/ui/DataTable';
import { LeadStatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';

export default function MyEnquiries() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi<Paginated<EnquiryDTO>>('/users/me/enquiries', { page });
  return (
    <>
      <PageHeader title="My enquiries" description="Enquiries you sent while signed in, and their current status." />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <TableSkeleton /> : !data?.items.length ? <EmptyState title="No enquiries yet" icon="✉️" /> : (
        <>
          <DataTable
            caption="My enquiries"
            rows={data.items}
            rowKey={(r) => r.id}
            columns={[
              { key: 'p', header: 'Property', cell: (r) => r.property ? <Link href={`/property/${r.property.slug}`} className="font-medium hover:text-brand-700">{r.property.title}</Link> : 'General enquiry' },
              { key: 'm', header: 'Message', cell: (r) => <span className="line-clamp-2 max-w-sm text-muted">{r.message}</span> },
              { key: 'd', header: 'Sent', cell: (r) => formatDateIN(r.createdAt) },
              { key: 's', header: 'Status', cell: (r) => <LeadStatusBadge status={r.status} /> },
            ]}
          />
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}
