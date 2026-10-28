'use client';

import Link from 'next/link';
import { useState } from 'react';
import { agentCreateSchema, displayPhone, type UserDTO } from '@skyspace/shared';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { AdminTable } from '@/features/admin/AdminTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

type Agent = UserDTO & { slug?: string; agencyName?: string; cities: string[]; publicProfile: boolean; activeListings: number; openLeads: number };

export default function AgentsAdmin() {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const toast = useToast();
  return (
    <>
      <PageHeader title="Agent management" description="Agents see only leads and listings assigned to them." actions={<Button onClick={() => setOpen(true)}>Add agent</Button>} />
      <AdminTable<Agent>
        endpoint="/admin/agents"
        reloadKey={reloadKey}
        columns={[
          { key: 'n', header: 'Agent', cell: (a) => <Link href={`/admin/users/${a.id}`} className="font-medium hover:text-brand-700">{a.name}<span className="block text-xs font-normal text-muted">{a.email} · {displayPhone(a.phone)}</span></Link> },
          { key: 'g', header: 'Agency', cell: (a) => a.agencyName ?? '—' },
          { key: 'c', header: 'Cities', cell: (a) => a.cities.join(', ') || '—' },
          { key: 'l', header: 'Live listings', cell: (a) => a.activeListings, className: 'text-right' },
          { key: 'o', header: 'Open leads', cell: (a) => a.openLeads, className: 'text-right' },
          { key: 's', header: 'Status', cell: (a) => <span className="flex gap-1"><Badge tone={a.status === 'active' ? 'green' : 'red'}>{a.status}</Badge>{a.publicProfile && <Badge tone="blue">Public</Badge>}</span> },
        ]}
      />
      <Modal open={open} onClose={() => setOpen(false)} title="Add agent">
        <form
          className="space-y-3"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body = { name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), agencyName: fd.get('agencyName') || undefined, cities: String(fd.get('cities') || '').split(',').map((s) => s.trim()).filter(Boolean) };
            const v = agentCreateSchema.safeParse(body);
            if (!v.success) return setErrors(Object.fromEntries(v.error.issues.map((i) => [String(i.path[0]), i.message])));
            setErrors({});
            setBusy(true);
            try {
              const r = await api<{ invited: boolean }>('/admin/agents', { body });
              toast(r.invited ? 'Agent created — a set-password link was sent to their email' : 'Existing user promoted to agent');
              setOpen(false);
              setReloadKey((k) => k + 1);
            } catch (err) {
              if (err instanceof ApiError) setErrors({ ...err.fieldErrors(), form: err.message });
            } finally {
              setBusy(false);
            }
          }}
        >
          {errors.form && <p className="text-sm text-red-700">{errors.form}</p>}
          <Input label="Full name" name="name" required error={errors.name} />
          <Input label="Email" name="email" type="email" required error={errors.email} hint="If this email already has an account, it is promoted to agent." />
          <Input label="Mobile" name="phone" type="tel" required error={errors.phone} />
          <Input label="Agency name" name="agencyName" />
          <Input label="Cities (comma-separated)" name="cities" />
          <Button type="submit" className="w-full" loading={busy}>Create agent</Button>
        </form>
      </Modal>
    </>
  );
}
