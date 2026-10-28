'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { ListingWizard } from '@/features/listings/ListingWizard';

export default function AgentNewListing() {
  return (
    <>
      <PageHeader title="Add listing" description="Listings you add are assigned to you and go live after review." />
      <ListingWizard basePath="/agent/listings" />
    </>
  );
}
