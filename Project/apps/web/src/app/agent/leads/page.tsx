'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { LeadList } from '@/features/leads/LeadList';

export default function AgentLeads() {
  return (
    <>
      <PageHeader title="My leads" description="Leads assigned to you. Overdue follow-ups are highlighted." />
      <LeadList endpoint="/agent/enquiries" detailBase="/agent/leads" />
    </>
  );
}
