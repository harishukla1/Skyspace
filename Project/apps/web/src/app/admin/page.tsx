'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { LinkButton } from '@/components/ui/Button';
import { DashboardView } from '@/features/admin/DashboardView';

export default function AdminDashboard() {
  return (
    <>
      <PageHeader title="Admin dashboard" actions={<LinkButton href="/admin/approvals">Review approvals</LinkButton>} />
      <DashboardView />
    </>
  );
}
