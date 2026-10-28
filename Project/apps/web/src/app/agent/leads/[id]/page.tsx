'use client';

import { use } from 'react';
import { LeadDetail } from '@/features/leads/LeadDetail';

export default function AgentLead({ params }: { params: Promise<{ id: string }> }) {
  return <LeadDetail id={use(params).id} backHref="/agent/leads" />;
}
