'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { LinkButton } from '@/components/ui/Button';
import { Performance } from '@/features/listings/Performance';

export default function OwnerDashboard() {
  return (
    <>
      <PageHeader title="Owner dashboard" description="Your listings, enquiries and visits at a glance." actions={<LinkButton href="/owner/listings/new">Add property</LinkButton>} />
      <Performance endpoint="/owner/reports" listingBase="/owner/listings" />
    </>
  );
}
