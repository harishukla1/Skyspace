'use client';

import { use } from 'react';
import { LeadDetail } from '@/features/leads/LeadDetail';

export default function AdminLead({ params }: { params: Promise<{ id: string }> }) {
  return <LeadDetail id={use(params).id} backHref="/admin/enquiries" />;
}
