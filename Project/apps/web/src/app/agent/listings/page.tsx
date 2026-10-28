'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { LinkButton } from '@/components/ui/Button';
import { MyListings } from '@/features/listings/MyListings';

export default function AgentListings() {
  return (
    <>
      <PageHeader title="Assigned listings" actions={<LinkButton href="/agent/listings/new">Add listing</LinkButton>} />
      <MyListings basePath="/agent/listings" />
    </>
  );
}
