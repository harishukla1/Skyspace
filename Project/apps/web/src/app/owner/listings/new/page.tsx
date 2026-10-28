'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { ListingWizard } from '@/features/listings/ListingWizard';

export default function NewListing() {
  return (
    <>
      <PageHeader title="Add property" description="Save as a draft at any step. Listings go live after review." />
      <ListingWizard basePath="/owner/listings" />
    </>
  );
}
