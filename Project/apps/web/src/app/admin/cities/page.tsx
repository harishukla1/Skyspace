'use client';

import { useState } from 'react';
import { INDIAN_STATES, type CityDTO } from '@skyspace/shared';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

/** Localities are edited as one per line: "Name | PIN1, PIN2". */
const toText = (c?: CityDTO) => (c?.localities ?? []).map((l) => `${l.name}${l.pinCodes.length ? ` | ${l.pinCodes.join(', ')}` : ''}`).join('\n');
const fromText = (t: string) =>
  t.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [name, pins] = line.split('|');
    return { name: name!.trim(), pinCodes: (pins ?? '').split(',').map((p) => p.trim()).filter(Boolean) };
  });

export default function Cities() {
  const { data, loading, error, reload } = useApi<{ items: CityDTO[] }>('/admin/cities');
  const [edit, setEdit] = useState<CityDTO | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const current = edit && edit !== 'new' ? edit : undefined;
  return (
    <>
      <PageHeader title="City & locality management" description="Cities and localities power search suggestions, city pages and the homepage." actions={<Button onClick={() => setEdit('new')}>Add city</Button>} />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading || !data ? <TableSkeleton /> : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted">{c.state} · {c.localities.length} localities</p></div>
                <span className="flex gap-1">{c.popular && <Badge tone="amber">Popular</Badge>}<Badge tone={c.active ? 'green' : 'gray'}>{c.active ? 'Active' : 'Hidden'}</Badge></span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEdit(c)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={async () => { try { await api(`/admin/cities/${c.id}`, { method: 'DELETE' }); toast('City deleted'); void reload(); } catch (e) { toast((e as Error).message, 'error'); } }}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={current ? `Edit ${current.name}` : 'Add city'} size="lg">
        <form
          key={current?.id ?? 'new'}
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body = {
              name: String(fd.get('name')), state: String(fd.get('state')), popular: fd.get('popular') === 'on', active: fd.get('active') === 'on',
              imageUrl: String(fd.get('imageUrl') || '') || undefined, localities: fromText(String(fd.get('localities') ?? '')),
            };
            setBusy(true);
            try {
              if (current) await api(`/admin/cities/${current.id}`, { method: 'PATCH', body });
              else await api('/admin/cities', { body });
              toast('City saved');
              setEdit(null);
              void reload();
            } catch (err) {
              toast((err as Error).message, 'error');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="City name" name="name" defaultValue={current?.name} required />
            <Select label="State" name="state" defaultValue={current?.state} required>{INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
          </div>
          <Input label="Image URL (optional)" name="imageUrl" type="url" defaultValue={current?.imageUrl} />
          <Textarea label="Localities" name="localities" defaultValue={toText(current)} rows={8} hint="One per line, optionally with PIN codes: Powai | 400076, 400087" />
          <div className="flex gap-6">
            <Checkbox name="popular" defaultChecked={current?.popular} label="Show in popular cities" />
            <Checkbox name="active" defaultChecked={current?.active ?? true} label="Active" />
          </div>
          <Button type="submit" loading={busy}>Save city</Button>
        </form>
      </Modal>
    </>
  );
}
