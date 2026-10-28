'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { Performance } from '@/features/listings/Performance';

export default function AgentReports() {
  return (
    <>
      <PageHeader title="Performance" description="Computed live from your assigned listings and leads." />
      <Performance endpoint="/agent/reports" listingBase="/agent/listings" />
    </>
  );
}
