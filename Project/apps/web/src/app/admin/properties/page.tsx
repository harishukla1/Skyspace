'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { PropertyAdmin } from '@/features/admin/PropertyAdmin';

function Inner() {
  return <PropertyAdmin initialStatus={useSearchParams().get('status') ?? ''} />;
}

export default function AdminProperties() {
  return (
    <>
      <PageHeader title="Property management" />
      <Suspense><Inner /></Suspense>
    </>
  );
}
