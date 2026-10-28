'use client';

import Link from 'next/link';
import type { EnquiryDTO, Paginated, PropertySummaryDTO, SiteVisitDTO } from '@skyspace/shared';
import { formatDateIN } from '@skyspace/shared';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/features/auth/AuthProvider';
import { KpiCard, PageHeader } from '@/components/dashboard/DashboardShell';
import { Alert, EmptyState, Skeleton } from '@/components/ui/Feedback';
import { LeadStatusBadge, VisitStatusBadge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const shortlist = useApi<Paginated<PropertySummaryDTO>>('/users/me/shortlist', { limit: 1 });
  const enquiries = useApi<Paginated<EnquiryDTO>>('/users/me/enquiries', { limit: 5 });
  const visits = useApi<Paginated<SiteVisitDTO>>('/users/me/site-visits', { limit: 5, upcoming: true });
  const saved = useApi<{ items: unknown[] }>('/users/me/saved-searches');
  return (
    <>
      <PageHeader title={`Hello, ${user?.name.split(' ')[0]}`} description="Your shortlists, enquiries and visits in one place." actions={<LinkButton href="/search">Search properties</LinkButton>} />
      {user && !user.emailVerified && <div className="mb-4"><Alert tone="warning">Please verify your email address — check your inbox for the link.</Alert></div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Shortlisted" value={shortlist.data?.total ?? '—'} href="/customer/shortlist" />
        <KpiCard label="Enquiries sent" value={enquiries.data?.total ?? '—'} href="/customer/enquiries" />
        <KpiCard label="Upcoming visits" value={visits.data?.total ?? '—'} href="/customer/site-visits" />
        <KpiCard label="Saved searches" value={saved.data?.items.length ?? '—'} href="/customer/saved-searches" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Recent enquiries</h2>
          {enquiries.loading ? <Skeleton className="h-24" /> : !enquiries.data?.items.length ? <EmptyState title="No enquiries yet" icon="✉️" /> : (
            <ul className="divide-y divide-line">
              {enquiries.data.items.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{e.property?.title ?? 'General enquiry'}</span><span className="text-muted">{formatDateIN(e.createdAt)}</span></span>
                  <LeadStatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Upcoming site visits</h2>
          {visits.loading ? <Skeleton className="h-24" /> : !visits.data?.items.length ? <EmptyState title="No upcoming visits" icon="📅" /> : (
            <ul className="divide-y divide-line">
              {visits.data.items.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0"><Link href={`/property/${v.property.slug}`} className="block truncate font-medium hover:text-brand-700">{v.property.title}</Link><span className="text-muted">{formatDateIN(v.scheduledAt, true)} IST</span></span>
                  <VisitStatusBadge status={v.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
