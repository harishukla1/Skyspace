'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ROLES, USER_STATUSES, displayPhone, formatDateIN, type UserDTO } from '@skyspace/shared';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { AdminTable } from '@/features/admin/AdminTable';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Field';
import { humanize } from '@/lib/labels';

export default function Users() {
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  return (
    <>
      <PageHeader title="User management" />
      <AdminTable<UserDTO>
        endpoint="/admin/users"
        searchPlaceholder="Name, email or phone"
        query={{ role: role || undefined, status: status || undefined }}
        filters={
          <>
            <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)} wrapClassName="w-40"><option value="">All roles</option>{ROLES.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}</Select>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} wrapClassName="w-40"><option value="">All</option>{USER_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select>
          </>
        }
        columns={[
          { key: 'n', header: 'User', cell: (u) => <Link href={`/admin/users/${u.id}`} className="font-medium hover:text-brand-700">{u.name}<span className="block text-xs font-normal text-muted">{u.email}</span></Link> },
          { key: 'p', header: 'Phone', cell: (u) => displayPhone(u.phone) },
          { key: 'r', header: 'Roles', cell: (u) => <span className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} tone={r === 'admin' ? 'purple' : r === 'agent' ? 'blue' : 'gray'}>{r}</Badge>)}</span> },
          { key: 's', header: 'Status', cell: (u) => <Badge tone={u.status === 'active' ? 'green' : 'red'}>{humanize(u.status)}</Badge> },
          { key: 'c', header: 'Joined', cell: (u) => formatDateIN(u.createdAt) },
          { key: 'l', header: 'Last login', cell: (u) => (u.lastLoginAt ? formatDateIN(u.lastLoginAt, true) : '—') },
        ]}
      />
    </>
  );
}
