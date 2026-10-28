'use client';

import { useState } from 'react';
import { categorySchema, slugify, type CategoryDTO } from '@skyspace/shared';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { useApi } from '@/hooks/useApi';
import { PageHeader } from '@/components/dashboard/DashboardShell';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState, TableSkeleton } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

export default function Categories() {
  const { data, loading, error, reload } = useApi<{ items: CategoryDTO[] }>('/admin/categories');
  const toast = useToast();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast(msg); void reload(); } catch (e) { toast((e as Error).message, 'error'); }
  };
  return (
    <>
      <PageHeader title="Property categories" description="Property types offered in listing forms and filters. Deactivate types instead of deleting ones that are in use." />
      <form
        className="card mb-6 flex flex-wrap items-end gap-3 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const body = { name, slug: slugify(name), category: fd.get('category'), order: (data?.items.length ?? 0) + 1, active: true };
          const v = categorySchema.safeParse(body);
          if (!v.success) return toast(v.error.issues[0]!.message, 'error');
          setBusy(true);
          try {
            await api('/admin/categories', { body });
            setName('');
            toast('Category added');
            void reload();
          } catch (err) {
            toast(err instanceof ApiError ? err.message : 'Failed', 'error');
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input label="New type name" value={name} onChange={(e) => setName(e.target.value)} wrapClassName="w-64" hint={name ? `slug: ${slugify(name)}` : undefined} />
        <Select label="Category" name="category" wrapClassName="w-44"><option value="residential">Residential</option><option value="commercial">Commercial</option></Select>
        <Button type="submit" loading={busy}>Add</Button>
      </form>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading || !data ? <TableSkeleton /> : (
        <DataTable
          rows={data.items}
          rowKey={(r) => r.id}
          columns={[
            { key: 'n', header: 'Name', cell: (c) => <span className="font-medium">{c.name}<span className="block font-mono text-xs font-normal text-muted">{c.slug}</span></span> },
            { key: 'c', header: 'Category', cell: (c) => <Badge>{c.category}</Badge> },
            { key: 's', header: 'Status', cell: (c) => <Badge tone={c.active ? 'green' : 'gray'}>{c.active ? 'Active' : 'Inactive'}</Badge> },
            {
              key: 'a', header: 'Actions', cell: (c) => (
                <span className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => act(() => api(`/admin/categories/${c.id}`, { method: 'PATCH', body: { active: !c.active } }), 'Updated')}>{c.active ? 'Deactivate' : 'Activate'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => act(() => api(`/admin/categories/${c.id}`, { method: 'DELETE' }), 'Deleted')}>Delete</Button>
                </span>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
