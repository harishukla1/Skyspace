'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { LeadList } from '@/features/leads/LeadList';

export default function OwnerEnquiries() {
  return (
    <>
      <PageHeader title="Property enquiries" description="Enquiries on your listings. Leads assigned to an agent are managed by that agent." />
      <LeadList endpoint="/owner/enquiries" detailBase="/owner/enquiries" />
    </>
  );
}
