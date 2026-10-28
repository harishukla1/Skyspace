'use client';

import Link from 'next/link';
import { useState } from 'react';
import { REPORT_STATUSES, formatDateIN } from '@skyspace/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { AdminTable } from '@/features/admin/AdminTable';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { humanize } from '@/lib/labels';

interface Row { id: string; property?: { id: string; propertyId: string; title: string; status: string }; reason: string; details?: string; email?: string; status: string; resolution?: string; createdAt: string }

export default function Complaints() {
  const [status, setStatus] = useState('open');
  const [k, setK] = useState(0);
  const toast = useToast();
  return (
    <>
      <PageHeader title="Complaints & moderation" description="Reports submitted against listings. Suspend a listing from its detail page if needed." />
      <AdminTable<Row>
        endpoint="/admin/reports"
        reloadKey={k}
        query={{ status: status || undefined }}
        filters={<Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} wrapClassName="w-44"><option value="">All</option>{REPORT_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select>}
        columns={[
          { key: 'p', header: 'Listing', cell: (r) => (r.property ? <Link href={`/admin/properties/${r.property.id}`} className="font-medium hover:text-brand-700">{r.property.propertyId}<span className="block max-w-[220px] truncate text-xs font-normal text-muted">{r.property.title}</span></Link> : '—') },
          { key: 'r', header: 'Reason', cell: (r) => <span><strong>{humanize(r.reason)}</strong><span className="block max-w-xs text-xs text-muted">{r.details}</span></span> },
          { key: 'e', header: 'Reporter', cell: (r) => r.email ?? 'Anonymous' },
          { key: 'd', header: 'Received', cell: (r) => formatDateIN(r.createdAt) },
          {
            key: 's', header: 'Status', cell: (r) => (
              <span className="flex items-center gap-2">
                <Badge tone={r.status === 'open' ? 'red' : r.status === 'reviewing' ? 'amber' : 'gray'}>{humanize(r.status)}</Badge>
                <select aria-label="Change status" className="rounded border border-line px-1 py-0.5 text-xs" value={r.status} onChange={async (e) => { await api(`/admin/reports/${r.id}`, { method: 'PATCH', body: { status: e.target.value } }); toast('Report updated'); setK((x) => x + 1); }}>
                  {REPORT_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                </select>
              </span>
            ),
          },
        ]}
      />
    </>
  );
}
