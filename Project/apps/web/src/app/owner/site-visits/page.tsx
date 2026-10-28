'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { VisitManager } from '@/features/visits/VisitManager';

export default function OwnerVisits() {
  return (
    <>
      <PageHeader title="Site visit management" description="Confirm, reschedule or decline visit requests. Times are IST." />
      <VisitManager endpoint="/owner/site-visits" perspective="manager" />
    </>
  );
}
