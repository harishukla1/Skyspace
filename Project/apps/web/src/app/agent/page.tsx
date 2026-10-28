'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { LinkButton } from '@/components/ui/Button';
import { LeadList } from '@/features/leads/LeadList';
import { Performance } from '@/features/listings/Performance';

export default function AgentDashboard() {
  return (
    <>
      <PageHeader title="Agent dashboard" actions={<LinkButton href="/agent/leads">All leads</LinkButton>} />
      <Performance endpoint="/agent/reports" listingBase="/agent/listings" />
      <h2 className="mb-3 mt-10 text-lg font-semibold">New leads</h2>
      <LeadList endpoint="/agent/enquiries" detailBase="/agent/leads" extraFilters={{ status: 'new' }} />
    </>
  );
}
