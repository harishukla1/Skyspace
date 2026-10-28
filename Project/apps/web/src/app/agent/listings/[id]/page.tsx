'use client';

import { use } from 'react';
import { ManagedListing } from '@/features/listings/ManagedListing';

export default function AgentListing({ params }: { params: Promise<{ id: string }> }) {
  return <ManagedListing id={use(params).id} basePath="/agent/listings" />;
}
