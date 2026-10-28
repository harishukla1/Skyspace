'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { MyListingsByStatus } from '@/features/listings/ApprovalStatus';

export default function ApprovalStatusPage() {
  return (
    <>
      <PageHeader title="Listing approval status" description="Listings waiting for review or needing changes." />
      <MyListingsByStatus basePath="/owner/listings" />
    </>
  );
}
