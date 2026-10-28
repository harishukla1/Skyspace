'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { VisitManager } from '@/features/visits/VisitManager';

export default function AdminVisits() {
  return (
    <>
      <PageHeader title="Site visit management" description="All visit requests. Admins can confirm, reschedule or close any visit." />
      <VisitManager endpoint="/admin/site-visits" perspective="manager" />
    </>
  );
}
