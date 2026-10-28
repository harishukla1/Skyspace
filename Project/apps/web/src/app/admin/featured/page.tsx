'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { PropertyAdmin } from '@/features/admin/PropertyAdmin';

export default function Featured() {
  return (
    <>
      <PageHeader title="Featured listings" description="Shown on the homepage. Feature a published listing from its admin detail page." />
      <PropertyAdmin featuredOnly fixedStatus="published" />
    </>
  );
}
