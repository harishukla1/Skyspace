'use client';

import { use } from 'react';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { ListingWizard } from '@/features/listings/ListingWizard';

export default function AgentEditListing({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <PageHeader title="Edit listing" />
      <ListingWizard propertyId={use(params).id} basePath="/agent/listings" />
    </>
  );
}
