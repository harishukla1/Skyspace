'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { ROLES, displayPhone, formatDateIN, type Role, type UserDTO } from '@skyspace/shared';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/features/auth/AuthProvider';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert, ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { humanize } from '@/lib/labels';

interface Detail { user: UserDTO & { statusReason?: string }; stats: { listings: number; enquiries: number }; activity: { id: string; action: string; entityType: string; createdAt: string }[] }

export default function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: me } = useAuth();
  const { data, loading, error, reload } = useApi<Detail>(`/admin/users/${id}`);
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [statusTo, setStatusTo] = useState<'active' | 'suspended' | 'deactivated' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <TableSkeleton />;
  const u = data.user;
  const self = me?.id === u.id;
  const current = roles ?? u.roles;

  return (
    <>
      <Link href="/admin/users" className="text-sm text-brand-700 hover:underline">‹ Users</Link>
      <PageHeader title={u.name} description={`${u.email} · ${displayPhone(u.phone)} · joined ${formatDateIN(u.createdAt)}`} />
      {self && <div className="mb-4"><Alert tone="info">This is your own account. You cannot suspend yourself or remove your admin role.</Alert></div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-5">
          <h2 className="font-semibold">Account status</h2>
          <p className="text-sm">Current: <Badge tone={u.status === 'active' ? 'green' : 'red'}>{humanize(u.status)}</Badge> {u.statusReason && <span className="text-muted">— {u.statusReason}</span>}</p>
          <div className="flex flex-wrap gap-2">
            {u.status !== 'active' && <Button size="sm" disabled={self} onClick={() => setStatusTo('active')}>Reactivate</Button>}
            {u.status === 'active' && <Button size="sm" variant="danger" disabled={self} onClick={() => setStatusTo('suspended')}>Suspend</Button>}
            {u.status !== 'deactivated' && <Button size="sm" variant="outline" disabled={self} onClick={() => setStatusTo('deactivated')}>Deactivate</Button>}
          </div>
          <p className="text-xs text-muted">Suspending or deactivating revokes all of this user’s sessions immediately.</p>
          <p className="text-sm text-muted">{data.stats.listings} listings · {data.stats.enquiries} enquiries submitted</p>
        </div>
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold">Roles</h2>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <label key={r} className="chip cursor-pointer">
                <input type="checkbox" className="accent-brand-600" checked={current.includes(r)} disabled={r === 'customer' || (self && r === 'admin')} onChange={(e) => setRoles(e.target.checked ? [...current, r] : current.filter((x) => x !== r))} />
                <span className="capitalize">{r}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted">Every account keeps the customer role. Changing roles signs the user out so new permissions apply.</p>
          <Button
            size="sm"
            disabled={!roles}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/admin/users/${id}/roles`, { method: 'PATCH', body: { roles: current } });
                toast('Roles updated');
                setRoles(null);
                void reload();
              } catch (e) {
                toast((e as Error).message, 'error');
              } finally {
                setBusy(false);
              }
            }}
          >
            Save roles
          </Button>
        </div>
      </div>
      <div className="card mt-6 p-5">
        <h2 className="font-semibold">Recent activity</h2>
        {data.activity.length ? (
          <ul className="mt-3 divide-y divide-line text-sm">{data.activity.map((a) => <li key={a.id} className="flex justify-between py-2"><span>{a.action} <span className="text-muted">({a.entityType})</span></span><span className="text-xs text-muted">{formatDateIN(a.createdAt, true)}</span></li>)}</ul>
        ) : <p className="mt-2 text-sm text-muted">No audited activity.</p>}
      </div>
      <ConfirmDialog
        open={!!statusTo}
        onClose={() => setStatusTo(null)}
        tone={statusTo === 'active' ? 'primary' : 'danger'}
        title={`${statusTo === 'active' ? 'Reactivate' : humanize(statusTo ?? '')} account?`}
        confirmLabel="Confirm"
        loading={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await api(`/admin/users/${id}/status`, { method: 'PATCH', body: { status: statusTo, reason: reason || undefined } });
            toast('Account status updated');
            setStatusTo(null);
            setReason('');
            void reload();
          } catch (e) {
            toast((e as Error).message, 'error');
          } finally {
            setBusy(false);
          }
        }}
      >
        <Textarea label="Reason (recorded in the audit log)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      </ConfirmDialog>
    </>
  );
}
