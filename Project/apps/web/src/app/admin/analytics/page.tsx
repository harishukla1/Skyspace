'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { DashboardView } from '@/features/admin/DashboardView';

export default function Analytics() {
  return (
    <>
      <PageHeader title="Reports & analytics" description="All figures are aggregated from live records. See docs/database-schema.md for the aggregation logic." />
      <DashboardView defaultDays="365" full />
    </>
  );
}
