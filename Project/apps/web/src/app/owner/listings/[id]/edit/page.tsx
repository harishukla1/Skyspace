'use client';

import { use } from 'react';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { ListingWizard } from '@/features/listings/ListingWizard';

export default function EditListing({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <PageHeader title="Edit property" />
      <ListingWizard propertyId={use(params).id} basePath="/owner/listings" />
    </>
  );
}
