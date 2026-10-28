'use client';

import { PageHeader } from '@/components/dashboard/DashboardShell';
import { LinkButton } from '@/components/ui/Button';
import { MyListings } from '@/features/listings/MyListings';

export default function ListingsPage() {
  return (
    <>
      <PageHeader title="My listings" description="Listings you own or are assigned to manage." actions={<LinkButton href="/owner/listings/new">Add property</LinkButton>} />
      <MyListings basePath="/owner/listings" />
    </>
  );
}
