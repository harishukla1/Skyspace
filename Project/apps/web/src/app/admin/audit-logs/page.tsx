'use client';

import { useState } from 'react';
import { formatDateIN } from '@skyspace/shared';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { AdminTable } from '@/features/admin/AdminTable';
import { Select } from '@/components/ui/Field';

interface Row { id: string; actor?: { name: string; email: string }; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown>; ip?: string; createdAt: string }

export default function AuditLogs() {
  const [entityType, setEntityType] = useState('');
  return (
    <>
      <PageHeader title="Audit logs" description="Sensitive administrative actions. Secrets and tokens are never recorded." />
      <AdminTable<Row>
        endpoint="/admin/audit-logs"
        query={{ entityType: entityType || undefined }}
        filters={
          <Select label="Entity" value={entityType} onChange={(e) => setEntityType(e.target.value)} wrapClassName="w-44">
            <option value="">All</option>
            {['Property', 'User', 'Enquiry', 'Category', 'City', 'SiteConfig', 'Report'].map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        }
        columns={[
          { key: 'w', header: 'When', cell: (a) => formatDateIN(a.createdAt, true) },
          { key: 'a', header: 'Actor', cell: (a) => a.actor ? <span>{a.actor.name}<span className="block text-xs text-muted">{a.actor.email}</span></span> : 'System / guest' },
          { key: 'x', header: 'Action', cell: (a) => <code className="text-xs">{a.action}</code> },
          { key: 'e', header: 'Entity', cell: (a) => <span>{a.entityType}<span className="block font-mono text-xs text-muted">{a.entityId}</span></span> },
          { key: 'm', header: 'Details', cell: (a) => <code className="block max-w-xs truncate text-xs text-muted" title={JSON.stringify(a.metadata)}>{a.metadata ? JSON.stringify(a.metadata) : '—'}</code> },
        ]}
      />
    </>
  );
}
