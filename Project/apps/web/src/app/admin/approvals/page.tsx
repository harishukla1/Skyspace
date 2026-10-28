'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { PropertyAdmin } from '@/features/admin/PropertyAdmin';

export default function Approvals() {
  return (
    <>
      <PageHeader title="Listing approval queue" description="Oldest submissions first. Open a listing to approve or reject it with a comment." />
      <PropertyAdmin fixedStatus="pending_approval" />
    </>
  );
}
