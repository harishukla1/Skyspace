'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { VisitManager } from '@/features/visits/VisitManager';

export default function AgentVisits() {
  return (
    <>
      <PageHeader title="Site visits" description="Visits on listings assigned to you. Confirmed slots cannot be double-booked." />
      <VisitManager endpoint="/agent/site-visits" perspective="manager" />
    </>
  );
}
