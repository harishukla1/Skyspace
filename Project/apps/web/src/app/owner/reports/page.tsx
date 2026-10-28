'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { Performance } from '@/features/listings/Performance';

export default function OwnerReports() {
  return (
    <>
      <PageHeader title="Listing performance" description="Views, enquiries, shortlists and visit requests across your listings." />
      <Performance endpoint="/owner/reports" listingBase="/owner/listings" />
    </>
  );
}
