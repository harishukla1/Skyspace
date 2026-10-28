'use client';

import { VisitManager } from '@/features/visits/VisitManager';
import { PageHeader } from '@/components/dashboard/DashboardShell';

export default function MyVisits() {
  return (
    <>
      <PageHeader title="My site visits" description="Visit requests are confirmed by the owner or agent. All times are Indian Standard Time." />
      <VisitManager endpoint="/users/me/site-visits" perspective="customer" />
    </>
  );
}
