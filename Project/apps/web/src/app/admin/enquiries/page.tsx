'use client';

import { useEffect, useState } from 'react';
import type { Paginated, UserDTO } from '@skyspace/shared';
import { PUBLIC_API } from '@/lib/config';
import { useApi } from '@/hooks/useApi';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { LeadList } from '@/features/leads/LeadList';
import { Select } from '@/components/ui/Field';

export default function AdminEnquiries() {
  const [agentId, setAgentId] = useState('');
  const agents = useApi<Paginated<UserDTO>>('/admin/agents', { limit: 50 });
  const [exportHref, setExportHref] = useState('');
  useEffect(() => setExportHref(`${PUBLIC_API}/admin/enquiries/export${agentId ? `?agentId=${agentId}` : ''}`), [agentId]);
  return (
    <>
      <PageHeader
        title="Enquiry & lead management"
        description="All enquiries across the platform. CSV exports are recorded in the audit log."
        actions={<a href={exportHref} className="inline-flex h-10 items-center rounded-lg border border-line bg-white px-4 text-sm font-medium hover:border-brand-400" download>Export CSV</a>}
      />
      <LeadList
        endpoint="/admin/enquiries"
        detailBase="/admin/enquiries"
        extraFilters={agentId ? { agentId } : undefined}
        toolbar={
          <Select label="Agent" value={agentId} onChange={(e) => setAgentId(e.target.value)} wrapClassName="w-52">
            <option value="">All agents</option>
            <option value="unassigned">Unassigned</option>
            {agents.data?.items.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        }
      />
    </>
  );
}
